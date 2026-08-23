"use server";

import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { notifyRevisitRequested, notifyInstallationVerified } from '@/lib/email/notifications';
import { createNotification, notifyOrganization } from '@/lib/notifications';

export async function reviewInstallation(installationId: string, decision: 'VERIFIED' | 'REVISIT_REQUIRED', reason?: string) {
  const supabase = await createServerClient();
  
  // 1. Authenticate & Resolve Reviewer Identity
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { success: false, error: 'Profile not found' };
  }

  if (profile.role !== 'ACS_ADMIN' && profile.role !== 'PARTNER') {
    return { success: false, error: 'Unauthorized: Only Admin or Partner can review' };
  }

  if (decision === 'REVISIT_REQUIRED' && (!reason || reason.trim() === '')) {
    return { success: false, error: 'Reason is required for REVISIT_REQUIRED' };
  }

  // 2. Fetch Installation securely using user context
  const { data: installation, error: instError } = await supabase
    .from('installations')
    .select('id, status, partner_id, technician_id')
    .eq('id', installationId)
    .single();

  if (instError || !installation) {
    return { success: false, error: 'Installation not found or unauthorized to view' };
  }

  // 3. Authorization Checks
  if (installation.status !== 'UNDER_VERIFICATION') {
    return { success: false, error: 'Installation is not UNDER_VERIFICATION' };
  }

  if (profile.role === 'PARTNER' && installation.partner_id !== profile.org_id) {
    return { success: false, error: 'Unauthorized: Installation belongs to a different Partner' };
  }

  if (installation.technician_id === user.id) {
    // Should theoretically not happen as technicians cannot be partners/admins, but strict check:
    return { success: false, error: 'Unauthorized: Cannot verify your own installation' };
  }

  // 4. Atomic Mutation via RPC (Requires Service Role to execute the protected RPC)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: rpcError } = await adminClient.rpc('review_installation_atomic', {
    p_installation_id: installationId,
    p_reviewer_id: user.id,
    p_decision: decision,
    p_reason: decision === 'REVISIT_REQUIRED' ? reason?.trim() : null
  });

  if (rpcError) {
    console.error(`[Review Error] Failed for Installation ${installationId}:`, rpcError);
    return { success: false, error: `Review failed: ${rpcError.message}` };
  }

  // Trigger emails non-blockingly
  if (decision === 'REVISIT_REQUIRED' && installation.technician_id) {
    notifyRevisitRequested(installationId, installation.technician_id, reason?.trim() || '').catch(console.error);
    createNotification({
      user_id: installation.technician_id,
      title: 'Revisit Required',
      message: `Installation ${installationId} requires a revisit. Reason: ${reason}`,
      entity_type: 'installations',
      entity_id: installationId
    }).catch(console.error);
    if (installation.partner_id) {
      notifyOrganization(
        installation.partner_id,
        'PARTNER',
        'Revisit Required',
        `Installation ${installationId} requires a revisit by the technician.`,
        'installations',
        installationId
      ).catch(console.error);
    }
  } else if (decision === 'VERIFIED' && installation.partner_id) {
    notifyInstallationVerified(installationId, installation.partner_id).catch(console.error);
    notifyOrganization(
      installation.partner_id,
      'PARTNER',
      'Installation Verified',
      `Installation ${installationId} has been successfully verified.`,
      'installations',
      installationId
    ).catch(console.error);
    if (installation.technician_id) {
      createNotification({
        user_id: installation.technician_id,
        title: 'Installation Verified',
        message: `Your work on installation ${installationId} has been verified.`,
        entity_type: 'installations',
        entity_id: installationId
      }).catch(console.error);
    }
  }

  return { success: true };
}
