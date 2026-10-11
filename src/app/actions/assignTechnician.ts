"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { notifyTechnicianAssigned } from '@/lib/email/notifications';
import { notifyTechnicianAssignedWhatsApp } from '@/lib/whatsapp/notifications';

export async function assignTechnician(installationId: string, technicianInput: string) {
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

  if (!profile || (profile.role !== 'ACS_ADMIN' && profile.role !== 'PARTNER' && profile.role !== 'OEM')) {
    return { error: 'Forbidden: Only ACS Admin, Installation Partner, or OEM can assign technicians.' };
  }

  // 3. Get installation details (to verify partner/oem ownership)
  const { data: installation } = await supabase
    .from('installations')
    .select('id, partner_id, custom_partner_name, oem_id, status, tracking_token, remarks')
    .eq('id', installationId)
    .single();

  if (!installation) {
    return { error: 'Installation not found' };
  }

  // 4. Verify Partner/OEM authorization
  if (profile.role === 'PARTNER') {
    if (installation.partner_id !== profile.org_id) {
      return { error: 'Forbidden: You can only assign technicians to your own installations.' };
    }
  }

  if (profile.role === 'OEM') {
    if (installation.oem_id !== profile.org_id) {
      return { error: 'Forbidden: Installation does not belong to your OEM organization.' };
    }
  }

  if (!installation.partner_id && !installation.custom_partner_name) {
    return { error: 'Cannot assign technician: Please assign an Installation Partner first.' };
  }

  if (!technicianInput || technicianInput.trim() === '') {
    return { error: 'Technician name is required.' };
  }

  const trimmed = technicianInput.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let targetTech: any = null;

  // Check if matches an existing registered technician under the partner
  if (installation.partner_id) {
    if (isUuid) {
      const { data: tp } = await adminClient
        .from('profiles')
        .select('id, role, org_id, status, name')
        .eq('id', trimmed)
        .maybeSingle();

      if (tp && tp.role === 'TECHNICIAN' && tp.status === 'ACTIVE' && tp.org_id === installation.partner_id) {
        targetTech = tp;
      }
    }

    if (!targetTech) {
      // Exact match on display_id, phone, or name
      const { data: exactMatches } = await adminClient
        .from('profiles')
        .select('id, role, org_id, status, name, phone, display_id')
        .eq('role', 'TECHNICIAN')
        .eq('status', 'ACTIVE')
        .eq('org_id', installation.partner_id)
        .or(`display_id.eq.${trimmed},phone.eq.${trimmed},name.ilike.${trimmed}`);

      if (exactMatches && exactMatches.length === 1) {
        targetTech = exactMatches[0];
      }
    }
  }

  const isRegistered = Boolean(targetTech);
  const resolvedTechnicianId = isRegistered ? targetTech.id : null;
  const customTechnicianName = isRegistered ? null : trimmed;

  const updatePayload: Record<string, any> = {
    technician_id: resolvedTechnicianId,
    custom_technician_name: customTechnicianName,
    updated_at: new Date().toISOString()
  };

  // Ensure tracking token exists
  if (!installation.tracking_token) {
    updatePayload.tracking_token = crypto.randomUUID();
  }

  // Advance status if NEW or PARTNER_ASSIGNED
  if (installation.status === 'NEW' || installation.status === 'PARTNER_ASSIGNED') {
    updatePayload.status = 'TECHNICIAN_ASSIGNED';
  }

  // Update installation record
  let { data: updatedData, error: updateError } = await adminClient
    .from('installations')
    .update(updatePayload)
    .eq('id', installationId)
    .select('id, tracking_token');

  // Resilient fallback if custom_technician_name column not yet applied via migration
  if (updateError && updateError.message?.includes('custom_technician_name')) {
    console.warn('[assignTechnician] custom_technician_name column not found in database; using remarks fallback.');
    delete updatePayload.custom_technician_name;
    const existingRemarks = installation.remarks ? installation.remarks.replace(/\[Tech:\s*[^\]]+\]\s*/g, '').trim() : '';
    const newRemarks = customTechnicianName ? `[Tech: ${customTechnicianName}] ${existingRemarks}`.trim() : existingRemarks;
    updatePayload.remarks = newRemarks;

    const fallbackRes = await adminClient
      .from('installations')
      .update(updatePayload)
      .eq('id', installationId)
      .select('id, tracking_token');

    updatedData = fallbackRes.data;
    updateError = fallbackRes.error;
  }

  if (updateError || !updatedData || updatedData.length === 0) {
    console.error("Error updating technician:", updateError);
    return { error: 'Failed to assign technician: ' + (updateError?.message || 'Database error') };
  }

  // Send notifications if assigned to registered technician
  if (resolvedTechnicianId) {
    notifyTechnicianAssigned(installationId, resolvedTechnicianId).catch(console.error);
    notifyTechnicianAssignedWhatsApp(installationId, resolvedTechnicianId).catch(console.error);
  }

  // Create Audit Log
  await supabase
    .from('audit_logs')
    .insert({
      entity_type: 'INSTALLATION',
      entity_id: installationId,
      action: 'TECHNICIAN_ASSIGNED',
      user_id: user.id,
      new_value: {
        technician_id: resolvedTechnicianId,
        custom_technician_name: customTechnicianName
      }
    });

  if (installation.status === 'NEW' || installation.status === 'PARTNER_ASSIGNED') {
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
  return {
    success: true,
    technicianName: isRegistered ? targetTech.name : trimmed,
    isManual: !isRegistered
  };
}
