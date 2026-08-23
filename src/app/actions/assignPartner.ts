"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { notifyPartnerAssigned } from '@/lib/email/notifications';
import { notifyOrganization } from '@/lib/notifications';

export async function assignPartnerAction(installationId: string, partnerId: string) {
  const supabase = await createClient();

  // 1. Authenticate & Resolve Identity
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'ACS_ADMIN') {
    return { success: false, error: 'Unauthorized: Only ACS Admin can assign partners' };
  }

  // 2. Fetch current state to avoid duplicate emails
  const { data: existing } = await supabase
    .from('installations')
    .select('partner_id')
    .eq('id', installationId)
    .single();

  if (existing && existing.partner_id === partnerId) {
    return { success: true, message: 'Partner already assigned' };
  }

  // 3. Assign the partner
  const { error: updateError } = await supabase
    .from('installations')
    .update({ 
      status: 'PARTNER_ASSIGNED', 
      partner_id: partnerId,
      updated_at: new Date().toISOString()
    })
    .eq('id', installationId);

  if (updateError) {
    console.error(`[Admin Assignment Error] Installation ${installationId}:`, updateError);
    return { success: false, error: 'Failed to assign partner due to a database error.' };
  }

  // 4. Send Notifications Non-Blockingly
  notifyPartnerAssigned(installationId, partnerId).catch(console.error);
  
  notifyOrganization(
    partnerId, 
    'PARTNER', 
    'New Installation Assigned', 
    `Installation ${installationId} has been assigned to your organization.`,
    'installations',
    installationId
  ).catch(console.error);

  revalidatePath('/admin/installations');
  return { success: true };
}
