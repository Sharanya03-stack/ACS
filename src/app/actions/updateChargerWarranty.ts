"use server";

import { createClient as createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateChargerWarranty(
  chargerId: string, 
  data: { 
    months: number | null, 
    startDate: string | null, 
    expiryDate: string | null 
  }
) {
  try {
    const supabase = await createServerClient();
    
    // 1. Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 2. Determine user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single();

    if (!profile) return { success: false, error: 'Profile not found' };

    // 3. Only ACS_ADMIN and OEM can edit warranty
    if (profile.role !== 'ACS_ADMIN' && profile.role !== 'OEM') {
       return { success: false, error: 'Forbidden: Only ACS Admin or OEMs can configure warranty' };
    }

    // 4. Update the charger
    // For OEM, RLS automatically restricts them to their own chargers (via installations).
    const { error: updateError } = await supabase
      .from('chargers')
      .update({
        warranty_months: data.months,
        warranty_start_date: data.startDate,
        warranty_expiry_date: data.expiryDate
      })
      .eq('id', chargerId);

    if (updateError) throw updateError;

    // No hardcoded paths as this might be called from drawers on multiple dashboards
    return { success: true };
  } catch (error: any) {
    console.error("Error updating charger warranty:", error);
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}
