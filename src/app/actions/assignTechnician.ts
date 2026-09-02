"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function assignTechnician(installationId: string, technicianId: string) {
  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  // 2. Get user's profile and role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'ACS_ADMIN' && profile.role !== 'PARTNER')) {
    return { error: 'Forbidden: Only ACS Admin or Installation Partner can assign technicians.' };
  }

  // 3. Get installation details (to verify partner ownership)
  const { data: installation } = await supabase
    .from('installations')
    .select('partner_id, status')
    .eq('id', installationId)
    .single();

  if (!installation) {
    return { error: 'Installation not found' };
  }

  // 4. Verify Partner authorization
  if (profile.role === 'PARTNER') {
    if (installation.partner_id !== profile.org_id) {
      return { error: 'Forbidden: You can only assign technicians to your own installations.' };
    }
  }

  // 5. Verify Technician validity
  // The technician must have role = TECHNICIAN and org_id = installation.partner_id
  const { data: techProfile } = await supabase
    .from('profiles')
    .select('role, org_id, status')
    .eq('id', technicianId)
    .single();

  if (!techProfile) {
    return { error: 'Technician not found' };
  }

  if (techProfile.role !== 'TECHNICIAN') {
    return { error: 'Invalid user: Selected user is not a technician.' };
  }

  if (techProfile.status !== 'ACTIVE') {
    return { error: 'Invalid user: Selected technician is not active.' };
  }

  if (techProfile.org_id !== installation.partner_id) {
    return { error: 'Forbidden: Technician does not belong to the correct Installation Partner organization.' };
  }

  // 6. Update installation with new technician_id
  const { error: updateError } = await supabase
    .from('installations')
    .update({ technician_id: technicianId })
    .eq('id', installationId);

  if (updateError) {
    console.error("Error updating technician:", updateError);
    return { error: 'Failed to assign technician' };
  }

  // 7. Create Audit Log
  const { error: logError } = await supabase
    .from('audit_logs')
    .insert({
      entity_type: 'INSTALLATION',
      entity_id: installationId,
      action: 'TECHNICIAN_ASSIGNED',
      user_id: user.id,
      new_value: { technician_id: technicianId }
    });

  if (logError) {
    console.error("Error writing audit log:", logError);
  }

  // 8. Update installation status if it was just PARTNER_ASSIGNED or NEW
  if (installation.status === 'NEW' || installation.status === 'PARTNER_ASSIGNED') {
    await supabase
      .from('installations')
      .update({ status: 'TECHNICIAN_ASSIGNED' })
      .eq('id', installationId);

    await supabase
      .from('audit_logs')
      .insert({
        entity_type: 'INSTALLATION',
        entity_id: installationId,
        action: 'STATUS_CHANGED',
        user_id: user.id,
        old_value: { status: installation.status },
        new_value: { status: 'TECHNICIAN_ASSIGNED' }
      });
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
