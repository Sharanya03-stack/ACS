import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendWhatsAppTemplate } from './client';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function notifyTechnicianAssignedWhatsApp(
  installationId: string,
  technicianId: string
): Promise<void> {
  try {
    const adminClient = getAdminClient();

    // 1. Fetch technician profile (name & phone)
    const { data: techProfile, error: techError } = await adminClient
      .from('profiles')
      .select('name, phone')
      .eq('id', technicianId)
      .single();

    if (techError || !techProfile) {
      console.error(`[WhatsApp Notification] Failed to fetch technician profile for ${technicianId}:`, techError);
      return;
    }

    if (!techProfile.phone) {
      console.warn(`[WhatsApp Notification] Technician ${technicianId} has no phone number configured. Skipping.`);
      return;
    }

    // 2. Fetch installation details (display_id & tracking_token)
    const { data: inst, error: instError } = await adminClient
      .from('installations')
      .select('display_id, tracking_token')
      .eq('id', installationId)
      .single();

    if (instError || !inst) {
      console.error(`[WhatsApp Notification] Failed to fetch installation details for ${installationId}:`, instError);
      return;
    }

    if (!inst.tracking_token) {
      console.error(`[WhatsApp Notification] Installation ${installationId} missing tracking_token.`);
      return;
    }

    // 3. Send WhatsApp notification via official template
    const result = await sendWhatsAppTemplate({
      to: techProfile.phone,
      templateName: 'technician_job_assignment',
      languageCode: 'en',
      bodyParameters: [techProfile.name || 'Technician', inst.display_id || installationId],
      buttonUrlParameter: inst.tracking_token,
    });

    if (result.skipped) {
      // Credentials not set, silent/safe no-op
      return;
    }

    if (!result.success) {
      console.error(`[WhatsApp Notification] Delivery failed for installation ${inst.display_id}`);
    }
  } catch (error) {
    console.error('[WhatsApp Notification] Unexpected error sending assignment notification:', error);
  }
}
