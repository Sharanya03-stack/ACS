"use server";

import { createClient as createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createCustomer(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  
  const { data: profile } = await supabase.from('profiles').select('role, org_id').eq('id', user.id).single();
  if (!profile || (profile.role !== 'ACS_ADMIN' && !profile.org_id)) return { error: 'No org' };
  
  let dealer_id: string | null = profile.role === 'DEALER' ? profile.org_id : null;
  let custom_dealer_name: string | null = null;
  
  if (profile.role === 'OEM' || profile.role === 'ACS_ADMIN') {
    const rawDealerInput = (formData.get('dealerId') || formData.get('dealerQuery')) as string;
    if (rawDealerInput && rawDealerInput.trim() !== '') {
      const trimmedDealer = rawDealerInput.trim();
      const isDealerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedDealer);

      if (isDealerUuid) {
        dealer_id = trimmedDealer;
      } else {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: dMatches } = await adminClient
          .from('organizations')
          .select('id, name')
          .eq('type', 'DEALER')
          .eq('status', 'ACTIVE')
          .or(`display_id.eq.${trimmedDealer},contact_email.ilike.${trimmedDealer},contact_phone.eq.${trimmedDealer},name.ilike.${trimmedDealer}`);

        if (dMatches && dMatches.length === 1) {
          dealer_id = dMatches[0].id;
        } else {
          const { data: partialDealers } = await adminClient
            .from('organizations')
            .select('id, name')
            .eq('type', 'DEALER')
            .eq('status', 'ACTIVE')
            .ilike('name', `%${trimmedDealer}%`);

          if (partialDealers && partialDealers.length === 1) {
            dealer_id = partialDealers[0].id;
          } else {
            dealer_id = null;
            custom_dealer_name = trimmedDealer;
          }
        }
      }

      if (dealer_id && profile.role === 'OEM') {
        const { data: org } = await supabase.from('organizations').select('parent_org_id').eq('id', dealer_id).single();
        if (!org || org.parent_org_id !== profile.org_id) {
          return { error: 'Forbidden: Dealer does not belong to your organization' };
        }
      }
    }
  }

  const address = formData.get('address');
  if (!address || (address as string).trim() === '') {
    return { error: 'Address is required.' };
  }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminClient.from('customers').insert({
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email') || null,
    address: formData.get('address'),
    city: formData.get('city'),
    state: formData.get('state'),
    pincode: formData.get('pincode'),
    dealer_id,
    custom_dealer_name
  }).select().single();

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { success: true, id: data?.id, data };
}

export async function updateCustomer(customerId: string, editForm: any) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile) return { success: false, error: 'Profile not found' };

  if (profile.role !== 'ACS_ADMIN' && profile.role !== 'DEALER') {
    return { success: false, error: 'Unauthorized to edit customer' };
  }

  const { error } = await supabase.from('customers').update({
    name: editForm.name,
    phone: editForm.phone,
    email: editForm.email || null,
    address: editForm.address,
    city: editForm.city,
    state: editForm.state,
    pincode: editForm.pincode
  }).eq('id', customerId);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function createVehicle(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  
  const { data: profile } = await supabase.from('profiles').select('role, org_id').eq('id', user.id).single();
  if (!profile || (profile.role !== 'ACS_ADMIN' && !profile.org_id)) return { error: 'No org' };

  let dealer_id: string | null = profile.role === 'DEALER' ? profile.org_id : null;
  let custom_dealer_name: string | null = null;

  if (profile.role === 'OEM' || profile.role === 'ACS_ADMIN') {
    const rawDealerInput = (formData.get('dealerId') || formData.get('dealerQuery')) as string;
    if (rawDealerInput && rawDealerInput.trim() !== '') {
      const trimmedDealer = rawDealerInput.trim();
      const isDealerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedDealer);

      if (isDealerUuid) {
        dealer_id = trimmedDealer;
      } else {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: dMatches } = await adminClient
          .from('organizations')
          .select('id, name')
          .eq('type', 'DEALER')
          .eq('status', 'ACTIVE')
          .or(`display_id.eq.${trimmedDealer},contact_email.ilike.${trimmedDealer},contact_phone.eq.${trimmedDealer},name.ilike.${trimmedDealer}`);

        if (dMatches && dMatches.length === 1) {
          dealer_id = dMatches[0].id;
        } else {
          const { data: partialDealers } = await adminClient
            .from('organizations')
            .select('id, name')
            .eq('type', 'DEALER')
            .eq('status', 'ACTIVE')
            .ilike('name', `%${trimmedDealer}%`);

          if (partialDealers && partialDealers.length === 1) {
            dealer_id = partialDealers[0].id;
          } else {
            dealer_id = null;
            custom_dealer_name = trimmedDealer;
          }
        }
      }
    }
  }

  let customerId = (formData.get('customerId') || formData.get('customerQuery')) as string;
  if (!customerId || customerId.trim() === '') return { error: 'Customer is required' };

  const trimmedCust = customerId.trim();
  const isCustUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedCust);

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (!isCustUuid) {
    let custQuery = adminClient
      .from('customers')
      .select('id, name, dealer_id, custom_dealer_name');
    
    if (dealer_id) {
      custQuery = custQuery.eq('dealer_id', dealer_id);
    }
    
    const { data: cMatches } = await custQuery.or(`display_id.eq.${trimmedCust},phone.eq.${trimmedCust},email.ilike.${trimmedCust},name.ilike.${trimmedCust}`);

    if (!cMatches || cMatches.length === 0) {
      let partialQuery = adminClient
        .from('customers')
        .select('id, name, dealer_id, custom_dealer_name');
      if (dealer_id) {
        partialQuery = partialQuery.eq('dealer_id', dealer_id);
      }
      const { data: partialCust } = await partialQuery.ilike('name', `%${trimmedCust}%`);

      if (!partialCust || partialCust.length === 0) {
        return { error: `No customer found matching "${trimmedCust}".` };
      }
      if (partialCust.length > 1) {
        return { error: `Multiple customers match "${trimmedCust}". Please specify exact phone number or Customer ID.` };
      }
      customerId = partialCust[0].id;
    } else if (cMatches.length > 1) {
      return { error: `Multiple customers match "${trimmedCust}". Please specify exact phone number or Customer ID.` };
    } else {
      customerId = cMatches[0].id;
    }
  }

  // Fetch customer to resolve dealer_id / custom_dealer_name if not explicitly set
  const { data: customer } = await adminClient.from('customers').select('dealer_id, custom_dealer_name').eq('id', customerId).single();
  if (!customer) return { error: 'Invalid customer' };

  if (!dealer_id && !custom_dealer_name) {
    dealer_id = customer.dealer_id || null;
    custom_dealer_name = customer.custom_dealer_name || null;
  }

  let oem_id = null;
  if (profile.role === 'OEM') {
    oem_id = profile.org_id;
  } else if (dealer_id) {
    const { data: org } = await adminClient.from('organizations').select('parent_org_id').eq('id', dealer_id).single();
    if (org && org.parent_org_id) oem_id = org.parent_org_id;
  }

  const { data, error } = await adminClient.from('vehicles').insert({
    vin: formData.get('vin'),
    model: formData.get('model'),
    sale_date: formData.get('sale_date') || new Date().toISOString().split('T')[0],
    delivery_date: formData.get('delivery_date') || new Date().toISOString().split('T')[0],
    customer_id: customerId,
    dealer_id,
    custom_dealer_name,
    oem_id
  }).select().single();

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { success: true, id: data?.id, data };
}

export async function updateVehicle(id: string, formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  
  const { data: profile } = await supabase.from('profiles').select('role, org_id').eq('id', user.id).single();
  if (!profile || (profile.role !== 'ACS_ADMIN' && !profile.org_id)) return { error: 'No org' };

  if (profile.role !== 'OEM' && profile.role !== 'ACS_ADMIN' && profile.role !== 'DEALER') {
    return { error: 'Unauthorized to update vehicle' };
  }

  const { error } = await supabase.from('vehicles').update({
    vin: formData.get('vin'),
    model: formData.get('model'),
    sale_date: formData.get('sale_date') || new Date().toISOString().split('T')[0],
    delivery_date: formData.get('delivery_date') || new Date().toISOString().split('T')[0],
  }).eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function createCharger(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  let vehicleId = (formData.get('vehicleId') || formData.get('vehicle_id') || formData.get('vehicleQuery')) as string;
  if (!vehicleId || vehicleId.trim() === '') {
    return { error: 'Vehicle VIN or ID is required' };
  }

  const trimmedVeh = vehicleId.trim();
  const isVehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedVeh);

  if (!isVehUuid) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: vMatches } = await adminClient
      .from('vehicles')
      .select('id, vin, customer_id')
      .or(`vin.ilike.${trimmedVeh},display_id.eq.${trimmedVeh}`);

    if (!vMatches || vMatches.length === 0) {
      return { error: `No vehicle found matching VIN or ID "${trimmedVeh}".` };
    }
    if (vMatches.length > 1) {
      return { error: `Multiple vehicles match "${trimmedVeh}". Please specify the exact VIN.` };
    }
    vehicleId = vMatches[0].id;
  }

  // Fetch vehicle to get authoritative customer_id and verify existence
  const { data: vehicle, error: vehicleErr } = await supabase
    .from('vehicles')
    .select('id, customer_id')
    .eq('id', vehicleId)
    .single();

  if (vehicleErr || !vehicle) {
    return { error: 'Invalid or non-existent vehicle selected.' };
  }

  if (!vehicle.customer_id) {
    return { error: 'The selected vehicle has no associated customer. Please assign a customer to the vehicle first.' };
  }

  const { data: existing } = await supabase.from('chargers').select('id').eq('vehicle_id', vehicleId).limit(1);
  if (existing && existing.length > 0) {
    return { error: 'This vehicle already has a charger assigned.' };
  }

  const { data, error } = await supabase.from('chargers').insert({
    serial_number: formData.get('serial_number'),
    model: formData.get('model'),
    power_rating: parseFloat(formData.get('power_rating') as string) || 7.4,
    vehicle_id: vehicleId,
    customer_id: vehicle.customer_id,
    supplied_date: formData.get('supplied_date') || new Date().toISOString().split('T')[0],
    warranty_months: parseInt(formData.get('warranty_months') as string) || null,
    warranty_start_date: formData.get('warranty_start_date') || null,
    warranty_expiry_date: formData.get('warranty_expiry_date') || null
  }).select().single();

  if (error) {
    if (error.code === '23505') {
      if (error.message && error.message.includes('serial_number')) {
        return { error: 'A charger with this serial number already exists.' };
      }
      return { error: 'This vehicle already has a charger assigned.' };
    }
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true, id: data?.id, data };
}

export async function updateCharger(id: string, formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || (profile.role !== 'ACS_ADMIN' && profile.role !== 'DEALER')) {
    return { error: 'Unauthorized to update charger' };
  }

  const { error } = await supabase.from('chargers').update({
    serial_number: formData.get('serial_number'),
    model: formData.get('model'),
    power_rating: parseFloat(formData.get('power_rating') as string) || 7.4,
    supplied_date: formData.get('supplied_date'),
    warranty_months: formData.get('warranty_months') ? parseInt(formData.get('warranty_months') as string) : null,
    warranty_start_date: formData.get('warranty_start_date') || null,
    warranty_expiry_date: formData.get('warranty_expiry_date') || null
  }).eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { success: true };
}
