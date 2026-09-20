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
  let oemOrgId: string | null = null;
  let authUserId: string | null = null;
  const adminClient = getAdminClient();

  try {
    await requireAdmin();

    const name = formData.get('name') as string;
    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const address = formData.get('address') as string;
    const password = formData.get('password') as string;

    if (contactPhone && !isValidPhone(contactPhone)) {
      return { error: 'Invalid contact phone number format' };
    }

    if (!name || name.trim() === '') {
      return { error: 'OEM name is required' };
    }

    if (!contactEmail || contactEmail.trim() === '') {
      return { error: 'Contact email is required to create an OEM login' };
    }

    if (!password || password.length < 6) {
      return { error: 'Password of at least 6 characters is required' };
    }

    // Step 1: Create OEM Organization
    const { data: orgData, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        type: 'OEM',
        name: name.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone ? contactPhone.trim() : null,
        address: address ? address.trim() : null,
        status: 'ACTIVE',
        parent_org_id: null
      })
      .select('id')
      .single();

    if (orgError || !orgData) {
      return { error: orgError?.message || 'Failed to create OEM organization' };
    }

    oemOrgId = orgData.id;

    // Step 2: Create Auth User
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: contactEmail.trim(),
      password: password,
      email_confirm: true,
      phone: contactPhone ? contactPhone.trim() : undefined,
    });

    if (authError) {
      if (oemOrgId) {
        try { await adminClient.from('organizations').delete().eq('id', oemOrgId); } catch (_) {}
      }

      const msg = authError.message.toLowerCase();
      const code = (authError as any).code;

      if (code === 'email_exists' || (msg.includes('email') && msg.includes('already registered'))) {
        return { error: 'Email already registered' };
      }
      if (code === 'phone_exists' || (msg.includes('phone') && msg.includes('already registered'))) {
        return { error: 'Phone number already registered to another user' };
      }
      return { error: authError.message || 'Failed to create OEM login' };
    }

    if (!authData.user) {
      if (oemOrgId) {
        try { await adminClient.from('organizations').delete().eq('id', oemOrgId); } catch (_) {}
      }
      return { error: 'Failed to create OEM login' };
    }

    authUserId = authData.user.id;

    // Step 3: Create Profile
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: authUserId,
      role: 'OEM',
      org_id: oemOrgId,
      name: name.trim(),
      phone: contactPhone ? contactPhone.trim() : null,
      address: address ? address.trim() : null,
      status: 'ACTIVE'
    });

    if (profileError) {
      if (authUserId) {
        try { await adminClient.auth.admin.deleteUser(authUserId); } catch (_) {}
      }
      if (oemOrgId) {
        try { await adminClient.from('organizations').delete().eq('id', oemOrgId); } catch (_) {}
      }
      return { error: profileError.message || 'Failed to create OEM profile' };
    }

    revalidatePath('/admin/oems');
    return { success: true };
  } catch (err: any) {
    if (authUserId) {
      try { await adminClient.auth.admin.deleteUser(authUserId); } catch (_) {}
    }
    if (oemOrgId) {
      try { await adminClient.from('organizations').delete().eq('id', oemOrgId); } catch (_) {}
    }
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
  let dealerOrgId: string | null = null;
  let authUserId: string | null = null;
  const adminClient = getAdminClient();

  try {
    const { role, org_id } = await requireAdminOrOEM();

    const name = formData.get('name') as string;
    let parentOrgId = formData.get('parentOrgId') as string;

    if (role === 'OEM') {
      if (!org_id) return { error: 'OEM organization ID is missing' };
      parentOrgId = org_id;
    }

    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const address = formData.get('address') as string;
    const password = formData.get('password') as string;

    if (contactPhone && !isValidPhone(contactPhone)) {
      return { error: 'Invalid contact phone number format' };
    }

    if (!name || name.trim() === '') return { error: 'Dealer name is required' };
    if (!parentOrgId) return { error: 'Parent OEM is required' };

    if (!contactEmail || contactEmail.trim() === '') {
      return { error: 'Contact email is required to create a Dealership login' };
    }

    if (!password || password.length < 6) {
      return { error: 'Password of at least 6 characters is required' };
    }

    // Verify parent OEM exists and is active
    const { data: oem } = await adminClient.from('organizations').select('type, status').eq('id', parentOrgId).single();
    if (!oem || oem.type !== 'OEM' || oem.status !== 'ACTIVE') {
      return { error: 'Invalid or inactive parent OEM' };
    }

    // Step 1: Create Dealership Organization
    const { data: orgData, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        type: 'DEALER',
        name: name.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone ? contactPhone.trim() : null,
        address: address ? address.trim() : null,
        status: 'ACTIVE',
        parent_org_id: parentOrgId
      })
      .select('id')
      .single();

    if (orgError || !orgData) {
      return { error: orgError?.message || 'Failed to create Dealership organization' };
    }

    dealerOrgId = orgData.id;

    // Step 2: Create Auth User
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: contactEmail.trim(),
      password: password,
      email_confirm: true,
      phone: contactPhone ? contactPhone.trim() : undefined,
    });

    if (authError) {
      if (dealerOrgId) {
        try { await adminClient.from('organizations').delete().eq('id', dealerOrgId); } catch (_) {}
      }

      const msg = authError.message.toLowerCase();
      const code = (authError as any).code;

      if (code === 'email_exists' || (msg.includes('email') && msg.includes('already registered'))) {
        return { error: 'Email already registered' };
      }
      if (code === 'phone_exists' || (msg.includes('phone') && msg.includes('already registered'))) {
        return { error: 'Phone number already registered to another user' };
      }
      return { error: authError.message || 'Failed to create Dealership login' };
    }

    if (!authData.user) {
      if (dealerOrgId) {
        try { await adminClient.from('organizations').delete().eq('id', dealerOrgId); } catch (_) {}
      }
      return { error: 'Failed to create Dealership login' };
    }

    authUserId = authData.user.id;

    // Step 3: Create Profile
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: authUserId,
      role: 'DEALER',
      org_id: dealerOrgId,
      name: name.trim(),
      phone: contactPhone ? contactPhone.trim() : null,
      address: address ? address.trim() : null,
      status: 'ACTIVE'
    });

    if (profileError) {
      if (authUserId) {
        try { await adminClient.auth.admin.deleteUser(authUserId); } catch (_) {}
      }
      if (dealerOrgId) {
        try { await adminClient.from('organizations').delete().eq('id', dealerOrgId); } catch (_) {}
      }
      return { error: profileError.message || 'Failed to create Dealership profile' };
    }

    revalidatePath('/admin/dealerships');
    revalidatePath('/oem/dealerships');
    return { success: true };
  } catch (err: any) {
    if (authUserId) {
      try { await adminClient.auth.admin.deleteUser(authUserId); } catch (_) {}
    }
    if (dealerOrgId) {
      try { await adminClient.from('organizations').delete().eq('id', dealerOrgId); } catch (_) {}
    }
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
  let partnerOrgId: string | null = null;
  let authUserId: string | null = null;
  const adminClient = getAdminClient();

  try {
    await requireAdmin();

    const name = formData.get('name') as string;
    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const address = formData.get('address') as string;
    const password = formData.get('password') as string;

    if (!name || name.trim() === '') {
      return { error: 'Partner name is required' };
    }

    if (!contactEmail || contactEmail.trim() === '') {
      return { error: 'Contact email is required to create a Partner login' };
    }

    if (!password || password.length < 6) {
      return { error: 'Password of at least 6 characters is required' };
    }

    if (contactPhone && !isValidPhone(contactPhone)) {
      return { error: 'Invalid contact phone number format' };
    }

    // Step 1: Create Partner Organization
    const { data: orgData, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        type: 'PARTNER',
        name: name.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone ? contactPhone.trim() : null,
        address: address ? address.trim() : null,
        status: 'ACTIVE',
        parent_org_id: null
      })
      .select('id')
      .single();

    if (orgError || !orgData) {
      return { error: orgError?.message || 'Failed to create Partner organization' };
    }

    partnerOrgId = orgData.id;

    // Step 2: Create Auth User
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: contactEmail.trim(),
      password: password,
      email_confirm: true,
      phone: contactPhone ? contactPhone.trim() : undefined,
    });

    if (authError) {
      // Rollback: Delete newly created organization
      if (partnerOrgId) {
        await adminClient.from('organizations').delete().eq('id', partnerOrgId);
      }

      const msg = authError.message.toLowerCase();
      const code = (authError as any).code;

      if (code === 'email_exists' || (msg.includes('email') && msg.includes('already registered'))) {
        return { error: 'Email already registered' };
      }
      if (code === 'phone_exists' || (msg.includes('phone') && msg.includes('already registered'))) {
        return { error: 'Phone number already registered to another user' };
      }
      return { error: authError.message || 'Failed to create Partner login' };
    }

    if (!authData.user) {
      if (partnerOrgId) {
        await adminClient.from('organizations').delete().eq('id', partnerOrgId);
      }
      return { error: 'Failed to create Partner login' };
    }

    authUserId = authData.user.id;

    // Step 3: Create Profile
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: authUserId,
      role: 'PARTNER',
      org_id: partnerOrgId,
      name: name.trim(),
      phone: contactPhone ? contactPhone.trim() : null,
      address: address ? address.trim() : null,
      status: 'ACTIVE'
    });

    if (profileError) {
      // Rollback: Delete Auth user and Organization
      if (authUserId) {
        await adminClient.auth.admin.deleteUser(authUserId);
      }
      if (partnerOrgId) {
        await adminClient.from('organizations').delete().eq('id', partnerOrgId);
      }
      return { error: profileError.message || 'Failed to create Partner profile' };
    }

    revalidatePath('/admin/partners');
    return { success: true };
  } catch (err: any) {
    if (authUserId) {
      try { await adminClient.auth.admin.deleteUser(authUserId); } catch (_) {}
    }
    if (partnerOrgId) {
      try { await adminClient.from('organizations').delete().eq('id', partnerOrgId); } catch (_) {}
    }
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

