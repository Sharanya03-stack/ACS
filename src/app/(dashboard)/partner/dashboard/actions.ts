"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { notifyTechnicianAssigned } from '@/lib/email/notifications';

export async function assignTechnicianAction(installationId: string, technicianId: string) {
  const supabase = await createClient();

  // 1. Authenticate & Resolve Partner Identity
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'PARTNER' || !profile.org_id) {
    return { error: 'Unauthorized: Not a partner' };
  }

  const partnerId = profile.org_id;

  // 2. Fetch the target installation and verify ownership
  const { data: installation, error: instError } = await supabase
    .from('installations')
    .select('id, partner_id, status, technician_id')
    .eq('id', installationId)
    .single();

  if (instError || !installation) {
    return { error: 'Installation not found or access denied.' };
  }

  if (installation.partner_id !== partnerId) {
    return { error: 'Forbidden: Installation belongs to another partner.' };
  }

  if (installation.technician_id === technicianId) {
    return { success: true, message: 'Technician already assigned' };
  }

  // 3. Verify the target technician exists and belongs to the same partner
  const { data: technician, error: techError } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', technicianId)
    .single();

  if (techError || !technician) {
    return { error: 'Technician not found.' };
  }

  if (technician.role !== 'TECHNICIAN' || technician.org_id !== partnerId) {
    return { error: 'Forbidden: Technician does not belong to your organization.' };
  }

  // 4. Update the installation safely
  // Only status and technician_id are sent.
  // Real database enum for status is likely "TECHNICIAN_ASSIGNED" (based on previous types)
  const { error: updateError } = await supabase
    .from('installations')
    .update({ 
      technician_id: technicianId,
      status: 'TECHNICIAN_ASSIGNED' 
    })
    .eq('id', installationId)
    .eq('partner_id', partnerId); // Double-lock ownership on update

  if (updateError) {
    console.error(`[Partner Assignment Error] Installation ${installationId}:`, updateError);
    return { error: 'Failed to assign technician due to a database error.' };
  }

  notifyTechnicianAssigned(installationId, technicianId).catch(console.error);

  revalidatePath('/partner/dashboard');
  return { success: true };
}
