import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendTransactionalEmail } from './send';
import { getAppBaseUrl } from './client';
import {
  renderWelcomeAccountEmail,
  renderPartnerAssignmentEmail,
  renderTechnicianAssignmentEmail,
  renderInstallationSubmittedEmail,
  renderRevisitRequestedEmail,
  renderInstallationVerifiedEmail
} from './templates';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ---------------------------------------------------------------------------
// Recipient Email Resolvers
// ---------------------------------------------------------------------------

export async function getUserEmail(userId: string): Promise<string | null> {
  if (!userId) return null;
  const adminClient = getAdminClient();

  // 1. Try profiles table first
  const { data: profile } = await adminClient
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.email && profile.email.trim().length > 0) {
    return profile.email.trim();
  }

  // 2. Fall back to auth.users
  const { data: { user }, error } = await adminClient.auth.admin.getUserById(userId);
  if (error || !user?.email) {
    console.warn(`[Email Resolver] Could not resolve email address for user ID ${userId}`);
    return null;
  }
  return user.email.trim();
}

export async function getOrgContactEmail(orgId: string): Promise<string | null> {
  if (!orgId) return null;
  const adminClient = getAdminClient();
  const { data: org, error } = await adminClient
    .from('organizations')
    .select('contact_email')
    .eq('id', orgId)
    .maybeSingle();

  if (error || !org?.contact_email) {
    console.warn(`[Email Resolver] Could not resolve contact email for organization ID ${orgId}`);
    return null;
  }
  return org.contact_email.trim();
}

export async function getCustomerEmail(customerId: string): Promise<string | null> {
  if (!customerId) return null;
  const adminClient = getAdminClient();
  const { data: customer } = await adminClient
    .from('customers')
    .select('email')
    .eq('id', customerId)
    .maybeSingle();

  return customer?.email?.trim() || null;
}

interface InstallationContext {
  id: string;
  display_id: string;
  tracking_token?: string;
  customers?: { name: string; address: string; city: string };
  partners?: { name: string };
  technicians?: { name: string };
}

async function getInstallationContext(installationId: string): Promise<InstallationContext | null> {
  const adminClient = getAdminClient();
  const { data: inst } = await adminClient
    .from('installations')
    .select(`
      id,
      display_id,
      tracking_token,
      customers:customer_id (name, address, city),
      partners:partner_id (name),
      technicians:technician_id (name)
    `)
    .eq('id', installationId)
    .maybeSingle();

  return inst as any || null;
}

// ---------------------------------------------------------------------------
// Email Notification Event Handlers
// ---------------------------------------------------------------------------

/**
 * 1. Account / User Created (OEM, Dealer, Partner, Technician)
 */
export async function notifyAccountCreated(params: {
  email: string;
  name: string;
  role: string;
}) {
  if (!params.email) {
    console.warn(`[Notification Warning] Account created notification skipped. Missing email for user ${params.name}`);
    return;
  }

  const { subject, htmlBody } = renderWelcomeAccountEmail({
    email: params.email,
    name: params.name,
    role: params.role,
  });

  return sendTransactionalEmail({
    to: params.email,
    subject,
    htmlBody,
  });
}

/**
 * 2. Partner Assigned to Installation
 */
export async function notifyPartnerAssigned(installationId: string, partnerId: string) {
  const email = await getOrgContactEmail(partnerId);
  if (!email) {
    console.warn(`[Notification Warning] Partner assigned notification skipped. No contact email for partner ${partnerId}`);
    return;
  }

  const inst = await getInstallationContext(installationId);
  const displayId = inst?.display_id || installationId;

  const { subject, htmlBody } = renderPartnerAssignmentEmail({
    partnerName: inst?.partners?.name || 'Partner Organization',
    displayId,
    customerName: inst?.customers?.name,
    city: inst?.customers?.city,
  });

  return sendTransactionalEmail({
    to: email,
    subject,
    htmlBody,
  });
}

/**
 * 3. Technician Assigned to Installation
 */
export async function notifyTechnicianAssigned(installationId: string, technicianId: string) {
  const email = await getUserEmail(technicianId);
  if (!email) {
    console.warn(`[Notification Warning] Technician assigned notification skipped. No email found for technician ${technicianId}`);
    return;
  }

  const inst = await getInstallationContext(installationId);
  const displayId = inst?.display_id || installationId;
  const baseUrl = getAppBaseUrl();

  const trackingUrl = inst?.tracking_token
    ? `${baseUrl}/technician/workflow/${inst.tracking_token}`
    : undefined;

  const { subject, htmlBody } = renderTechnicianAssignmentEmail({
    technicianName: inst?.technicians?.name || 'Technician',
    displayId,
    customerName: inst?.customers?.name,
    customerAddress: inst?.customers?.address,
    city: inst?.customers?.city,
    trackingUrl,
  });

  return sendTransactionalEmail({
    to: email,
    subject,
    htmlBody,
  });
}

/**
 * 4. Installation Submitted for Verification
 */
export async function notifySubmittedForVerification(installationId: string, partnerId?: string | null) {
  let email: string | null = null;
  if (partnerId) {
    email = await getOrgContactEmail(partnerId);
  }

  const inst = await getInstallationContext(installationId);
  const displayId = inst?.display_id || installationId;

  if (!email) {
    console.warn(`[Notification Warning] Submission notification skipped. No partner contact email for installation ${displayId}`);
    return;
  }

  const { subject, htmlBody } = renderInstallationSubmittedEmail({
    reviewerName: inst?.partners?.name || 'Reviewer',
    displayId,
    technicianName: inst?.technicians?.name,
  });

  return sendTransactionalEmail({
    to: email,
    subject,
    htmlBody,
  });
}

/**
 * 5. Revisit Requested
 */
export async function notifyRevisitRequested(installationId: string, technicianId: string, reason: string) {
  const email = await getUserEmail(technicianId);
  if (!email) {
    console.warn(`[Notification Warning] Revisit notification skipped. No email for technician ${technicianId}`);
    return;
  }

  const inst = await getInstallationContext(installationId);
  const displayId = inst?.display_id || installationId;
  const baseUrl = getAppBaseUrl();

  const jobUrl = inst?.tracking_token
    ? `${baseUrl}/technician/workflow/${inst.tracking_token}`
    : `${baseUrl}/technician/dashboard`;

  const { subject, htmlBody } = renderRevisitRequestedEmail({
    technicianName: inst?.technicians?.name || 'Technician',
    displayId,
    reason,
    jobUrl,
  });

  return sendTransactionalEmail({
    to: email,
    subject,
    htmlBody,
  });
}

/**
 * 6. Installation Verified
 */
export async function notifyInstallationVerified(installationId: string, partnerId?: string | null) {
  let email: string | null = null;
  if (partnerId) {
    email = await getOrgContactEmail(partnerId);
  }

  const inst = await getInstallationContext(installationId);
  const displayId = inst?.display_id || installationId;

  if (!email) {
    console.warn(`[Notification Warning] Verification notification skipped. No recipient email for installation ${displayId}`);
    return;
  }

  const { subject, htmlBody } = renderInstallationVerifiedEmail({
    recipientName: inst?.partners?.name || 'Partner',
    displayId,
    customerName: inst?.customers?.name,
  });

  return sendTransactionalEmail({
    to: email,
    subject,
    htmlBody,
  });
}
