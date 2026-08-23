"use server";

import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { isValidPhone } from '@/utils/validation';

async function requirePartnerContext() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'PARTNER' || !profile.org_id) {
    throw new Error('Forbidden: Only Partners can perform this action');
  }

  // Double check that the org is active and is a partner org
  const { data: org } = await supabase.from('organizations').select('type, status').eq('id', profile.org_id).single();
  if (!org || org.type !== 'PARTNER' || org.status !== 'ACTIVE') {
    throw new Error('Forbidden: Partner organization is inactive or invalid');
  }

  return profile.org_id;
}

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function createTechnician(formData: FormData) {
  try {
    const partnerOrgId = await requirePartnerContext();
    const adminClient = getAdminClient();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;

    if (phone && !isValidPhone(phone)) {
      return { error: 'Invalid phone number format' };
    }
    const password = formData.get('password') as string;

    if (!name || name.trim() === '') return { error: 'Name is required' };
    if (!email || email.trim() === '') return { error: 'Email is required' };
    if (!password || password.length < 6) return { error: 'Password of at least 6 characters is required' };

    // Step 1: Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
         return { error: 'Email already registered' };
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create auth user');
    }

    const authUserId = authData.user.id;

    // Step 2: Create profile
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: authUserId,
      role: 'TECHNICIAN',
      org_id: partnerOrgId,
      name,
      phone: phone || null,
      address: address || null,
      status: 'ACTIVE'
    });

    // Step 3: Rollback on failure
    if (profileError) {
      await adminClient.auth.admin.deleteUser(authUserId);
      throw profileError;
    }

    revalidatePath('/partner/technicians');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to create technician' };
  }
}

export async function updateTechnician(id: string, formData: FormData) {
  try {
    const partnerOrgId = await requirePartnerContext();
    const adminClient = getAdminClient();

    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;

    if (!name || name.trim() === '') return { error: 'Name is required' };

    // Verify technician belongs to partner
    const { data: tech } = await adminClient.from('profiles')
      .select('role, org_id')
      .eq('id', id)
      .single();

    if (!tech || tech.role !== 'TECHNICIAN' || tech.org_id !== partnerOrgId) {
      return { error: 'Invalid technician target' };
    }

    const { error } = await adminClient.from('profiles').update({
      name,
      phone: phone || null,
      address: address || null
    }).eq('id', id);

    if (error) throw error;

    revalidatePath('/partner/technicians');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update technician' };
  }
}

export async function deactivateTechnician(id: string) {
  try {
    const partnerOrgId = await requirePartnerContext();
    const adminClient = getAdminClient();

    // Need authenticated user id for deleted_by
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Verify technician belongs to partner
    const { data: tech } = await adminClient.from('profiles')
      .select('role, org_id')
      .eq('id', id)
      .single();

    if (!tech || tech.role !== 'TECHNICIAN' || tech.org_id !== partnerOrgId) {
      return { error: 'Invalid technician target' };
    }

    const { error } = await adminClient.from('profiles').update({
      status: 'INACTIVE',
      deleted_at: new Date().toISOString(),
      deleted_by: user!.id
    }).eq('id', id);

    if (error) throw error;

    revalidatePath('/partner/technicians');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to deactivate technician' };
  }
}
