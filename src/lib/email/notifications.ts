import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendEmail } from './postmark';

// Use admin client to fetch user emails from auth.users (which normal users cannot read)
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUserEmail(userId: string): Promise<string | null> {
  const adminClient = getAdminClient();
  const { data: { user }, error } = await adminClient.auth.admin.getUserById(userId);
  if (error || !user) {
    console.error(`[Email Resolver] Failed to get email for user ${userId}`);
    return null;
  }
  return user.email || null;
}

async function getOrgContactEmail(orgId: string): Promise<string | null> {
  const adminClient = getAdminClient();
  const { data: org, error } = await adminClient
    .from('organizations')
    .select('contact_email')
    .eq('id', orgId)
    .single();
    
  if (error || !org) return null;
  return org.contact_email || null;
}

export async function notifyPartnerAssigned(installationId: string, partnerId: string) {
  const email = await getOrgContactEmail(partnerId);
  if (!email) return;

  await sendEmail({
    to: email,
    subject: `New Installation Assigned: ${installationId}`,
    htmlBody: `
      <h2>New Installation Assigned</h2>
      <p>A new EV charger installation has been assigned to your organization.</p>
      <p><strong>Installation ID:</strong> ${installationId}</p>
      <p>Please log in to the partner dashboard to assign a technician.</p>
    `
  });
}

export async function notifyTechnicianAssigned(installationId: string, technicianId: string) {
  const email = await getUserEmail(technicianId);
  if (!email) return;

  await sendEmail({
    to: email,
    subject: `New Job Assigned: ${installationId}`,
    htmlBody: `
      <h2>New Job Assigned</h2>
      <p>You have been assigned a new installation job.</p>
      <p><strong>Installation ID:</strong> ${installationId}</p>
      <p>Please log in to your technician dashboard to view the job details and begin the checklist.</p>
    `
  });
}

export async function notifySubmittedForVerification(installationId: string, partnerId: string) {
  // In the current architecture, who is the reviewer?
  // Typically, it is the Partner admin or ACS Admin.
  // We'll notify the Partner contact email.
  const email = await getOrgContactEmail(partnerId);
  if (!email) return;

  await sendEmail({
    to: email,
    subject: `Installation Ready for Verification: ${installationId}`,
    htmlBody: `
      <h2>Installation Submitted for Verification</h2>
      <p>The technician has submitted the checklist and photos for installation <strong>${installationId}</strong>.</p>
      <p>Please log in to the dashboard to review and verify this installation.</p>
    `
  });
}

export async function notifyRevisitRequested(installationId: string, technicianId: string, reason: string) {
  const email = await getUserEmail(technicianId);
  if (!email) return;

  await sendEmail({
    to: email,
    subject: `Revisit Required for Installation: ${installationId}`,
    htmlBody: `
      <h2>Revisit Required</h2>
      <p>Your recent submission for installation <strong>${installationId}</strong> requires a revisit.</p>
      <p><strong>Reason provided by reviewer:</strong></p>
      <blockquote style="border-left: 4px solid #ccc; padding-left: 10px;">${reason}</blockquote>
      <p>Please correct these issues and resubmit the checklist and evidence.</p>
    `
  });
}

export async function notifyInstallationVerified(installationId: string, partnerId: string) {
  const email = await getOrgContactEmail(partnerId);
  if (!email) return;

  await sendEmail({
    to: email,
    subject: `Installation Verified: ${installationId}`,
    htmlBody: `
      <h2>Installation Verified</h2>
      <p>Installation <strong>${installationId}</strong> has been verified successfully.</p>
      <p>No further action is required for this job.</p>
    `
  });
}
