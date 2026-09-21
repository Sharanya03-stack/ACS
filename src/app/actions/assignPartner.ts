"use server";

import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { notifyPartnerAssigned } from '@/lib/email/notifications';
import { notifyOrganization } from '@/lib/notifications';

export async function assignPartnerAction(installationId: string, partnerInput: string) {
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

  // 2. Fetch current installation details to verify ownership
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

  if (!partnerInput || partnerInput.trim() === '') {
    return { success: false, error: 'Partner name, email, or Display ID is required.' };
  }

  const trimmed = partnerInput.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let targetPartner: any = null;

  if (isUuid) {
    const { data: p } = await adminClient
      .from('organizations')
      .select('id, type, status, name')
      .eq('id', trimmed)
      .maybeSingle();
    if (p && p.type === 'PARTNER' && p.status === 'ACTIVE') {
      targetPartner = p;
    }
  }

  if (!targetPartner) {
    // Search active partners by exact display_id, contact_email, or name
    const { data: matches, error: matchErr } = await adminClient
      .from('organizations')
      .select('id, name, contact_email, display_id')
      .eq('type', 'PARTNER')
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .or(`display_id.eq.${trimmed},contact_email.ilike.${trimmed},name.ilike.${trimmed}`);

    if (matchErr) {
      console.error('Error resolving partner:', matchErr);
      return { success: false, error: 'Database error resolving partner.' };
    }

    if (!matches || matches.length === 0) {
      // Partial name fallback
      const { data: partialMatches } = await adminClient
        .from('organizations')
        .select('id, name, contact_email, display_id')
        .eq('type', 'PARTNER')
        .eq('status', 'ACTIVE')
        .is('deleted_at', null)
        .ilike('name', `%${trimmed}%`);

      if (!partialMatches || partialMatches.length === 0) {
        return { success: false, error: `No active Installation Partner found matching "${trimmed}". Please check the exact partner name, email, or Display ID.` };
      }
      if (partialMatches.length > 1) {
        return { success: false, error: `Multiple partners match "${trimmed}". Please enter the exact email address or Display ID.` };
      }
      targetPartner = partialMatches[0];
    } else if (matches.length > 1) {
      return { success: false, error: `Multiple partners match "${trimmed}". Please enter the exact email address or Display ID.` };
    } else {
      targetPartner = matches[0];
    }
  }

  const partnerId = targetPartner.id;

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
  return { success: true, partnerName: targetPartner.name };
}

export async function getActivePartnersAction() {
  // Security/Privacy: Do not return lists of partners to the client
  return { success: true, data: [] };
}


