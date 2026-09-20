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

  if (!installation.partner_id) {
    return { error: 'Cannot assign technician: Please assign an Installation Partner to this job first.' };
  }

  if (!technicianInput || technicianInput.trim() === '') {
    return { error: 'Technician name, phone, or Display ID is required.' };
  }

  const trimmed = technicianInput.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

  const { createClient: createAdminClient } = await import('@supabase/supabase-js');
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let targetTech: any = null;

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
    // Search active technicians belonging to installation.partner_id by phone, display_id, or name
    const { data: matches, error: matchErr } = await adminClient
      .from('profiles')
      .select('id, role, org_id, status, name, phone, display_id')
      .eq('role', 'TECHNICIAN')
      .eq('status', 'ACTIVE')
      .eq('org_id', installation.partner_id)
      .or(`display_id.eq.${trimmed},phone.eq.${trimmed},name.ilike.${trimmed}`);

    if (matchErr) {
      console.error('Error resolving technician:', matchErr);
      return { error: 'Database error resolving technician.' };
    }

    if (!matches || matches.length === 0) {
      // Partial name fallback
      const { data: partialMatches } = await adminClient
        .from('profiles')
        .select('id, role, org_id, status, name, phone, display_id')
        .eq('role', 'TECHNICIAN')
        .eq('status', 'ACTIVE')
        .eq('org_id', installation.partner_id)
        .ilike('name', `%${trimmed}%`);

      if (!partialMatches || partialMatches.length === 0) {
        return { error: `No active technician found matching "${trimmed}" for this Partner.` };
      }
      if (partialMatches.length > 1) {
        return { error: `Multiple technicians match "${trimmed}". Please enter the exact phone number or Technician ID.` };
      }
      targetTech = partialMatches[0];
    } else if (matches.length > 1) {
      return { error: `Multiple technicians match "${trimmed}". Please enter the exact phone number or Technician ID.` };
    } else {
      targetTech = matches[0];
    }
  }

  const resolvedTechnicianId = targetTech.id;

  // 6. Update installation with new technician_id
  const { error: updateError } = await supabase
    .from('installations')
    .update({ technician_id: resolvedTechnicianId })
    .eq('id', installationId);

  if (updateError) {
    console.error("Error updating technician:", updateError);
    return { error: 'Failed to assign technician' };
  }

  // Send notifications non-blockingly
  notifyTechnicianAssigned(installationId, resolvedTechnicianId).catch(console.error);
  notifyTechnicianAssignedWhatsApp(installationId, resolvedTechnicianId).catch(console.error);

  // 7. Create Audit Log
  const { error: logError } = await supabase
    .from('audit_logs')
    .insert({
      entity_type: 'INSTALLATION',
      entity_id: installationId,
      action: 'TECHNICIAN_ASSIGNED',
      user_id: user.id,
      new_value: { technician_id: resolvedTechnicianId }
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
