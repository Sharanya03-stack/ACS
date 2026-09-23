'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createInstallationOrder(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: profile } = await supabase.from('profiles').select('role, org_id').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Profile not found' };

  const chargerId = formData.get('charger_id') as string;
  if (!chargerId) return { success: false, error: 'Charger is required' };

  // Fetch charger, vehicle, customer, dealer, oem details to ensure consistency
  const { data: charger, error: chargerError } = await supabase
    .from('chargers')
    .select(`
      id,
      vehicle_id,
      customer_id,
      vehicles!inner (
        dealer_id,
        custom_dealer_name,
        oem_id
      )
    `)
    .eq('id', chargerId)
    .single();

  if (chargerError || !charger || !charger.vehicles) {
    return { success: false, error: 'Invalid charger or missing vehicle data' };
  }

  // Check if an installation already exists for this charger
  const { data: existingInst } = await supabase
    .from('installations')
    .select('id')
    .eq('charger_id', chargerId)
    .limit(1);

  if (existingInst && existingInst.length > 0) {
    return { success: false, error: 'An installation order already exists for this charger' };
  }

  const category = formData.get('category') as string || 'INSTALLATION_AND_EARTHING';
  const scheduled_date = formData.get('scheduled_date') as string || null;
  const remarks = formData.get('remarks') as string || null;
  
  // Only some roles can directly assign partner/technician on creation
  let partner_id = (formData.get('partner_id') || formData.get('partner_query')) as string || null;
  let technician_id = formData.get('technician_id') as string || null;

  const vehicle: any = Array.isArray(charger.vehicles) ? charger.vehicles[0] : charger.vehicles;
  
  if (profile.role === 'OEM' && vehicle?.oem_id !== profile.org_id) {
    return { success: false, error: 'Unauthorized: Charger does not belong to your OEM' };
  }
  if (profile.role === 'DEALER' && vehicle?.dealer_id !== profile.org_id) {
    return { success: false, error: 'Unauthorized: Charger does not belong to your Dealership' };
  }

  // Authorization and auto-assignment logic
  const oem_id = vehicle?.oem_id;
  let resolvedDealerId = vehicle?.dealer_id || null;
  let custom_dealer_name: string | null = vehicle?.custom_dealer_name || null;
  let custom_partner_name: string | null = null;
  let status = 'NEW';

  if (profile.role === 'PARTNER' || profile.role === 'TECHNICIAN') {
    return { success: false, error: 'Unauthorized: Partners and Technicians cannot create installation orders' };
  }

  if (profile.role === 'OEM') {
    technician_id = null; // OEMs don't assign techs directly usually, but they can assign partners
  } else if (profile.role === 'DEALER') {
    partner_id = null; // Dealers don't assign partners, OEM/Admin does
    technician_id = null;
  }

  let rawDealerInput = (formData.get('dealer_id') || formData.get('dealer_query')) as string || null;
  if (rawDealerInput && rawDealerInput.trim() !== '') {
    const trimmed = rawDealerInput.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
    if (isUuid) {
      resolvedDealerId = trimmed;
    } else {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js');
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: matches } = await adminClient
        .from('organizations')
        .select('id, name')
        .eq('type', 'DEALER')
        .eq('status', 'ACTIVE')
        .or(`display_id.eq.${trimmed},contact_email.ilike.${trimmed},name.ilike.${trimmed}`);

      if (matches && matches.length === 1) {
        resolvedDealerId = matches[0].id;
      } else {
        const { data: partialMatches } = await adminClient
          .from('organizations')
          .select('id, name')
          .eq('type', 'DEALER')
          .eq('status', 'ACTIVE')
          .ilike('name', `%${trimmed}%`);

        if (partialMatches && partialMatches.length === 1) {
          resolvedDealerId = partialMatches[0].id;
        } else {
          resolvedDealerId = null;
          custom_dealer_name = trimmed;
        }
      }
    }
  }

  if (partner_id && partner_id.trim() !== '') {
    const trimmed = partner_id.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
    if (isUuid) {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js');
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: p } = await adminClient
        .from('organizations')
        .select('id, type, status')
        .eq('id', trimmed)
        .maybeSingle();
      if (p && p.type === 'PARTNER' && p.status === 'ACTIVE') {
        partner_id = p.id;
      } else {
        partner_id = null;
      }
    } else {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js');
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: matches } = await adminClient
        .from('organizations')
        .select('id, name')
        .eq('type', 'PARTNER')
        .eq('status', 'ACTIVE')
        .or(`display_id.eq.${trimmed},contact_email.ilike.${trimmed},name.ilike.${trimmed}`);

      if (matches && matches.length === 1) {
        partner_id = matches[0].id;
      } else {
        const { data: partialMatches } = await adminClient
          .from('organizations')
          .select('id, name')
          .eq('type', 'PARTNER')
          .eq('status', 'ACTIVE')
          .ilike('name', `%${trimmed}%`);

        if (partialMatches && partialMatches.length === 1) {
          partner_id = partialMatches[0].id;
        } else {
          partner_id = null;
          custom_partner_name = trimmed;
        }
      }
    }
  } else {
    partner_id = null;
  }

  if (partner_id && status === 'NEW') status = 'PARTNER_ASSIGNED';
  if (technician_id && partner_id) status = 'TECHNICIAN_ASSIGNED';
  else technician_id = null;

  const { data: newOrder, error } = await supabase.from('installations').insert({
    charger_id: charger.id,
    vehicle_id: charger.vehicle_id,
    customer_id: charger.customer_id,
    dealer_id: resolvedDealerId,
    custom_dealer_name,
    custom_partner_name,
    oem_id: oem_id,
    category,
    scheduled_date,
    remarks,
    partner_id,
    technician_id,
    status
  }).select('id, tracking_token').single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true, order: newOrder };
}

export async function updateInstallationOrderDetailsAction(installationId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'ACS_ADMIN') {
    return { success: false, error: 'Unauthorized: Only ACS Admin can update installation order details' };
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('installations')
    .select('id, dealer_id, custom_dealer_name')
    .eq('id', installationId)
    .single();

  if (fetchErr || !existing) {
    return { success: false, error: 'Installation not found' };
  }

  const category = (formData.get('category') as string) || 'INSTALLATION_AND_EARTHING';
  const scheduled_date = (formData.get('scheduled_date') as string) || null;
  const remarks = (formData.get('remarks') as string) || null;
  const rawDealerInput = (formData.get('dealer_id') || formData.get('dealer_query')) as string || null;

  let resolvedDealerId = existing.dealer_id;
  let custom_dealer_name = existing.custom_dealer_name;

  if (rawDealerInput !== null && rawDealerInput.trim() !== '') {
    const trimmed = rawDealerInput.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (isUuid) {
      const { data: d } = await adminClient
        .from('organizations')
        .select('id, type, status')
        .eq('id', trimmed)
        .maybeSingle();

      if (d && d.type === 'DEALER' && d.status === 'ACTIVE') {
        resolvedDealerId = d.id;
        custom_dealer_name = null;
      } else {
        resolvedDealerId = null;
        custom_dealer_name = trimmed;
      }
    } else {
      const { data: matches } = await adminClient
        .from('organizations')
        .select('id, name')
        .eq('type', 'DEALER')
        .eq('status', 'ACTIVE')
        .or(`display_id.eq.${trimmed},contact_email.ilike.${trimmed},name.ilike.${trimmed}`);

      if (matches && matches.length === 1) {
        resolvedDealerId = matches[0].id;
        custom_dealer_name = null;
      } else {
        const { data: partialMatches } = await adminClient
          .from('organizations')
          .select('id, name')
          .eq('type', 'DEALER')
          .eq('status', 'ACTIVE')
          .ilike('name', `%${trimmed}%`);

        if (partialMatches && partialMatches.length === 1) {
          resolvedDealerId = partialMatches[0].id;
          custom_dealer_name = null;
        } else {
          resolvedDealerId = null;
          custom_dealer_name = trimmed;
        }
      }
    }
  }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: updatedData, error: updateError } = await adminClient
    .from('installations')
    .update({
      category,
      scheduled_date,
      remarks,
      dealer_id: resolvedDealerId,
      custom_dealer_name,
      updated_at: new Date().toISOString()
    })
    .eq('id', installationId)
    .select('id');

  if (updateError || !updatedData || updatedData.length === 0) {
    return { success: false, error: 'Failed to update order details. Record was not updated.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
