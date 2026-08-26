"use server";

import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { isValidPhone } from '@/utils/validation';

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'ACS_ADMIN') {
    throw new Error('Forbidden: Only ACS Admin can perform this action');
  }

  return user.id;
}

async function requireAdminOrOEM() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'ACS_ADMIN' && profile.role !== 'OEM')) {
    throw new Error('Forbidden: Only ACS Admin or OEM can perform this action');
  }

  return { userId: user.id, role: profile.role, org_id: profile.org_id };
}

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// --------------------------------------------------------
// OEM ACTIONS
// --------------------------------------------------------

export async function createOEM(formData: FormData) {
  try {
    await requireAdmin();
    const adminClient = getAdminClient();

    const name = formData.get('name') as string;
    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string;

    if (contactPhone && !isValidPhone(contactPhone)) {
      return { error: 'Invalid contact phone number format' };
    }
    const address = formData.get('address') as string;

    if (!name || name.trim() === '') {
      return { error: 'OEM name is required' };
    }

    const { error } = await adminClient.from('organizations').insert({
      type: 'OEM',
      name,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      address: address || null,
      status: 'ACTIVE',
      parent_org_id: null
    });

    if (error) throw error;
    
    revalidatePath('/admin/oems');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to create OEM' };
  }
}

export async function updateOEM(id: string, formData: FormData) {
  try {
    await requireAdmin();
    const adminClient = getAdminClient();

    const name = formData.get('name') as string;
    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const address = formData.get('address') as string;

    if (contactPhone && !isValidPhone(contactPhone)) {
      return { error: 'Invalid contact phone number format' };
    }

    if (!name || name.trim() === '') {
      return { error: 'OEM name is required' };
    }

    // Verify existing is OEM
    const { data: existing } = await adminClient.from('organizations').select('type').eq('id', id).single();
    if (!existing || existing.type !== 'OEM') return { error: 'Invalid organization target' };

    const { error } = await adminClient.from('organizations').update({
      name,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      address: address || null,
    }).eq('id', id);

    if (error) throw error;
    
    revalidatePath('/admin/oems');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update OEM' };
  }
}

export async function deactivateOrganization(id: string) {
  try {
    const adminId = await requireAdmin();
    const adminClient = getAdminClient();

    const { error } = await adminClient.from('organizations').update({
      status: 'INACTIVE',
      deleted_at: new Date().toISOString(),
      deleted_by: adminId
    }).eq('id', id);

    if (error) throw error;
    
    // Attempt revalidate paths
    revalidatePath('/admin/oems');
    revalidatePath('/admin/dealerships');
    revalidatePath('/admin/partners');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to deactivate organization' };
  }
}

// --------------------------------------------------------
// DEALER ACTIONS
// --------------------------------------------------------

export async function createDealer(formData: FormData) {
  try {
    const { role, org_id } = await requireAdminOrOEM();
    const adminClient = getAdminClient();

    const name = formData.get('name') as string;
    let parentOrgId = formData.get('parentOrgId') as string;
    
    if (role === 'OEM') {
      if (!org_id) return { error: 'OEM organization ID is missing' };
      parentOrgId = org_id;
    }

    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const address = formData.get('address') as string;

    if (contactPhone && !isValidPhone(contactPhone)) {
      return { error: 'Invalid contact phone number format' };
    }

    if (contactPhone && !isValidPhone(contactPhone)) {
      return { error: 'Invalid contact phone number format' };
    }

    if (!name || name.trim() === '') return { error: 'Dealer name is required' };
    if (!parentOrgId) return { error: 'Parent OEM is required' };

    // Verify OEM exists and is active
    const { data: oem } = await adminClient.from('organizations').select('type, status').eq('id', parentOrgId).single();
    if (!oem || oem.type !== 'OEM' || oem.status !== 'ACTIVE') {
      return { error: 'Invalid or inactive parent OEM' };
    }

    const { error } = await adminClient.from('organizations').insert({
      type: 'DEALER',
      name,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      address: address || null,
      status: 'ACTIVE',
      parent_org_id: parentOrgId
    });

    if (error) throw error;
    
    revalidatePath('/admin/dealerships');
    revalidatePath('/oem/dealerships');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to create Dealership' };
  }
}

export async function updateDealer(id: string, formData: FormData) {
  try {
    const { role, org_id } = await requireAdminOrOEM();
    const adminClient = getAdminClient();

    const name = formData.get('name') as string;
    let parentOrgId = formData.get('parentOrgId') as string;

    if (role === 'OEM') {
      if (!org_id) return { error: 'OEM organization ID is missing' };
      parentOrgId = org_id;
    }

    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const address = formData.get('address') as string;

    if (contactPhone && !isValidPhone(contactPhone)) {
      return { error: 'Invalid contact phone number format' };
    }

    if (!name || name.trim() === '') return { error: 'Dealer name is required' };
    if (!parentOrgId) return { error: 'Parent OEM is required' };

    // Verify target is DEALER and check OEM ownership
    const { data: existing } = await adminClient.from('organizations').select('type, parent_org_id').eq('id', id).single();
    if (!existing || existing.type !== 'DEALER') return { error: 'Invalid organization target' };
    
    if (role === 'OEM' && existing.parent_org_id !== org_id) {
       return { error: 'Forbidden: You cannot modify a dealership belonging to another OEM' };
    }

    // Verify parent OEM
    const { data: oem } = await adminClient.from('organizations').select('type, status').eq('id', parentOrgId).single();
    if (!oem || oem.type !== 'OEM' || oem.status !== 'ACTIVE') {
      return { error: 'Invalid or inactive parent OEM' };
    }

    const { error } = await adminClient.from('organizations').update({
      name,
      parent_org_id: parentOrgId,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      address: address || null,
    }).eq('id', id);

    if (error) throw error;
    
    revalidatePath('/admin/dealerships');
    revalidatePath('/oem/dealerships');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update Dealership' };
  }
}

// --------------------------------------------------------
// PARTNER ACTIONS
// --------------------------------------------------------

export async function createPartner(formData: FormData) {
  try {
    await requireAdmin();
    const adminClient = getAdminClient();

    const name = formData.get('name') as string;
    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const address = formData.get('address') as string;

    if (contactPhone && !isValidPhone(contactPhone)) {
      return { error: 'Invalid contact phone number format' };
    }

    if (!name || name.trim() === '') return { error: 'Partner name is required' };

    const { error } = await adminClient.from('organizations').insert({
      type: 'PARTNER',
      name,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      address: address || null,
      status: 'ACTIVE',
      parent_org_id: null
    });

    if (error) throw error;
    
    revalidatePath('/admin/partners');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to create Partner' };
  }
}

export async function updatePartner(id: string, formData: FormData) {
  try {
    await requireAdmin();
    const adminClient = getAdminClient();

    const name = formData.get('name') as string;
    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const address = formData.get('address') as string;

    if (contactPhone && !isValidPhone(contactPhone)) {
      return { error: 'Invalid contact phone number format' };
    }

    if (!name || name.trim() === '') return { error: 'Partner name is required' };

    // Verify existing is PARTNER
    const { data: existing } = await adminClient.from('organizations').select('type').eq('id', id).single();
    if (!existing || existing.type !== 'PARTNER') return { error: 'Invalid organization target' };

    const { error } = await adminClient.from('organizations').update({
      name,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      address: address || null,
    }).eq('id', id);

    if (error) throw error;
    
    revalidatePath('/admin/partners');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update Partner' };
  }
}

