"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function refreshProfile() {
  revalidatePath('/', 'layout');
}

export async function updateProfileAction(formData: { name: string; phone: string; address: string; }) {
  const supabase = await createClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session?.user) {
    return { error: 'Not authenticated' };
  }

  // Admin Client to diagnose
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authUid = session.user.id;

  // 1. Query public.profiles using exact UUID
  const { data: adminProfile, error: adminError } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', authUid)
    .single();

  if (adminError || !adminProfile) {
    return { error: 'CRITICAL FAILURE: No profile exists for auth.uid() ' + authUid };
  }

  // 2. Try the update WITH RLS
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      name: formData.name, 
      phone: formData.phone, 
      address: formData.address 
    })
    .eq('id', authUid)
    .select();

  if (error) {
    return { error: 'Supabase Error: ' + error.message };
  }

  if (!data || data.length === 0) {
    // If it reached here, RLS blocked it!
    // Let's create the policy automatically if it's missing just for this debug step? No, user says "If the RLS policy is wrong, create the smallest migration necessary to correct it."
    return { 
      error: 'UPDATE AFFECTED 0 ROWS. Diagnosis: Row EXISTS in DB, auth.uid() MATCHES (' + adminProfile.id + '), but RLS evaluated to FALSE. RLS policy is missing or incorrectly defined.'
    };
  }

  revalidatePath('/', 'layout');
  return { success: true, data: data[0] };
}
