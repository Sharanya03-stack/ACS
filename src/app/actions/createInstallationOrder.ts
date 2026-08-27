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
  let partner_id = formData.get('partner_id') as string || null;
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
  const dealer_id = vehicle?.dealer_id;
  let status = 'NEW';

  if (profile.role === 'OEM') {
    technician_id = null; // OEMs don't assign techs directly usually, but they can assign partners
  } else if (profile.role === 'DEALER') {
    partner_id = null; // Dealers don't assign partners, OEM/Admin does
    technician_id = null;
  } else if (profile.role === 'PARTNER') {
    // Partner creating an order? They must auto-assign themselves
    partner_id = profile.org_id;
    status = 'PARTNER_ASSIGNED';
  } else if (profile.role === 'TECHNICIAN') {
    // Tech creating an order? Auto-assign themselves and their partner
    const { data: org } = await supabase.from('organizations').select('id').eq('id', profile.org_id).single();
    partner_id = org?.id || null;
    technician_id = user.id;
    status = 'TECHNICIAN_ASSIGNED';
  }

  if (partner_id && status === 'NEW') status = 'PARTNER_ASSIGNED';
  if (technician_id) status = 'TECHNICIAN_ASSIGNED';

  const { data: newOrder, error } = await supabase.from('installations').insert({
    charger_id: charger.id,
    vehicle_id: charger.vehicle_id,
    customer_id: charger.customer_id,
    dealer_id: dealer_id,
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
