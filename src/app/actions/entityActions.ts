"use server";

import { createClient as createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createCustomer(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  
  const { data: profile } = await supabase.from('profiles').select('role, org_id').eq('id', user.id).single();
  if (!profile || !profile.org_id) return { error: 'No org' };
  
  let dealer_id = profile.org_id;
  
  if (profile.role === 'OEM' || profile.role === 'ACS_ADMIN') {
    dealer_id = formData.get('dealerId') as string;
    if (!dealer_id) return { error: 'Dealer is required for admins/OEMs' };
  }
  
  let oem_id = null;
  if (profile.role === 'OEM') oem_id = profile.org_id;
  else if (profile.role === 'DEALER') {
    const { data: org } = await supabase.from('organizations').select('parent_org_id').eq('id', profile.org_id).single();
    if (org && org.parent_org_id) oem_id = org.parent_org_id;
  }

  const { error } = await supabase.from('customers').insert({
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email') || null,
    address: formData.get('address'),
    city: formData.get('city'),
    state: formData.get('state'),
    pincode: formData.get('pincode'),
    dealer_id,
    oem_id
  });

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { success: true };
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
  if (!profile || !profile.org_id) return { error: 'No org' };

  let dealer_id = profile.org_id;
  if (profile.role === 'OEM' || profile.role === 'ACS_ADMIN') {
    dealer_id = formData.get('dealerId') as string;
    if (!dealer_id) return { error: 'Dealer is required' };
  }

  let oem_id = null;
  if (profile.role === 'OEM') oem_id = profile.org_id;
  else {
    const { data: org } = await supabase.from('organizations').select('parent_org_id').eq('id', dealer_id).single();
    if (org && org.parent_org_id) oem_id = org.parent_org_id;
  }

  const { error } = await supabase.from('vehicles').insert({
    vin: formData.get('vin'),
    model: formData.get('model'),
    sale_date: formData.get('sale_date') || new Date().toISOString().split('T')[0],
    delivery_date: formData.get('delivery_date') || new Date().toISOString().split('T')[0],
    customer_id: formData.get('customerId'),
    dealer_id,
    oem_id
  });

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function updateVehicle(id: string, formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  
  const { data: profile } = await supabase.from('profiles').select('role, org_id').eq('id', user.id).single();
  if (!profile || !profile.org_id) return { error: 'No org' };

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

  const { error } = await supabase.from('chargers').insert({
    serial_number: formData.get('serial_number'),
    model: formData.get('model'),
    power_rating: parseFloat(formData.get('power_rating') as string) || 7.4,
    vehicle_id: formData.get('vehicleId'),
    customer_id: formData.get('customerId'),
    supplied_date: formData.get('supplied_date') || new Date().toISOString().split('T')[0],
    warranty_months: parseInt(formData.get('warranty_months') as string) || null,
    warranty_start_date: formData.get('warranty_start_date') || null,
    warranty_expiry_date: formData.get('warranty_expiry_date') || null
  });

  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { success: true };
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
