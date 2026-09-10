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
    .select('role, org_id')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'ACS_ADMIN' && profile.role !== 'OEM')) {
    return { success: false, error: 'Unauthorized: Only ACS Admin or OEM can assign partners' };
  }

  // 2. Fetch current installation details to verify ownership and avoid duplicate emails
  const { data: existing, error: fetchErr } = await supabase
    .from('installations')
    .select('id, partner_id, oem_id, status')
    .eq('id', installationId)
    .single();

  if (fetchErr || !existing) {
    return { success: false, error: 'Installation not found' };
  }

  // OEM scoping check: OEM users can only assign partners for their own OEM installations
  if (profile.role === 'OEM' && existing.oem_id !== profile.org_id) {
    return { success: false, error: 'Unauthorized: Installation does not belong to your OEM organization' };
  }

  // 3. Verify selected partner organization is actually an active Installation Partner
  const { data: partnerOrg } = await supabase
    .from('organizations')
    .select('id, type, status')
    .eq('id', partnerId)
    .single();

  if (!partnerOrg || (partnerOrg.type !== 'PARTNER' && partnerOrg.type !== 'INSTALLATION_PARTNER') || partnerOrg.status !== 'ACTIVE') {
    return { success: false, error: 'Invalid or inactive Installation Partner selected' };
  }

  if (existing.partner_id === partnerId) {
    return { success: true, message: 'Partner already assigned' };
  }

  // Preserve state machine: transition NEW to PARTNER_ASSIGNED, or preserve current state if already advanced
  const newStatus = (!existing.status || existing.status === 'NEW') ? 'PARTNER_ASSIGNED' : existing.status;

  // 4. Assign the partner
  const { error: updateError } = await supabase
    .from('installations')
    .update({ 
      status: newStatus, 
      partner_id: partnerId,
      updated_at: new Date().toISOString()
    })
    .eq('id', installationId);

  if (updateError) {
    console.error(`[Assignment Error] Installation ${installationId}:`, updateError);
    return { success: false, error: 'Failed to assign partner due to a database error.' };
  }

  // 5. Send Notifications Non-Blockingly
  notifyPartnerAssigned(installationId, partnerId).catch(console.error);
  
  notifyOrganization(
    partnerId, 
    'PARTNER', 
    'New Installation Assigned', 
    `Installation ${installationId} has been assigned to your organization.`,
    'installations',
    installationId
  ).catch(console.error);

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function getActivePartnersAction() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized', data: [] };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'ACS_ADMIN' && profile.role !== 'OEM')) {
    return { success: false, error: 'Unauthorized', data: [] };
  }

  const { data, error } = await supabase
    .from('organizations')
    .select('id, display_id, name, type, status')
    .eq('type', 'PARTNER')
    .eq('status', 'ACTIVE')
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching active partners:', error);
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data: data || [] };
}

