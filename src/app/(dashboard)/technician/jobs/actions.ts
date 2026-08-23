"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Valid transitions for a technician
const VALID_TRANSITIONS: Record<string, string[]> = {
  'TECHNICIAN_ASSIGNED': ['IN_PROGRESS'],
  'SCHEDULED': ['IN_PROGRESS'],
  'IN_PROGRESS': ['UNDER_VERIFICATION', 'ON_HOLD'],
  'ON_HOLD': ['IN_PROGRESS'],
  'REVISIT_REQUIRED': ['IN_PROGRESS', 'UNDER_VERIFICATION']
};

export async function startJobAction(installationId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Fetch installation to verify ownership and current status
  const { data: installation, error: fetchError } = await supabase
    .from('installations')
    .select('technician_id, status, partner_id, dealer_id')
    .eq('id', installationId)
    .single();

  if (fetchError || !installation) return { error: 'Installation not found' };
  
  if (installation.technician_id !== user.id) {
    return { error: 'Forbidden: Installation belongs to another technician' };
  }

  const currentStatus = installation.status;
  if (!VALID_TRANSITIONS[currentStatus]?.includes('IN_PROGRESS')) {
    return { error: `Invalid transition from ${currentStatus} to IN_PROGRESS` };
  }

  // Update status to IN_PROGRESS and set started_at server-side
  const { error: updateError } = await supabase
    .from('installations')
    .update({ 
      status: 'IN_PROGRESS',
      started_at: new Date().toISOString()
    })
    .eq('id', installationId)
    .eq('technician_id', user.id); // Double-lock

  if (updateError) return { error: 'Failed to update database' };

  // Notify Partner
  if (installation.partner_id) {
    import('@/lib/notifications').then(({ notifyOrganization }) => {
      notifyOrganization(
        installation.partner_id,
        'PARTNER',
        'Installation Started',
        `Technician has started work on installation ${installationId}.`,
        'installations',
        installationId
      ).catch(console.error);
    });
  }
  
  // Notify Dealer
  if (installation.dealer_id) {
    import('@/lib/notifications').then(({ notifyOrganization }) => {
      notifyOrganization(
        installation.dealer_id,
        'DEALER',
        'Installation Started',
        `Installation ${installationId} is now in progress.`,
        'installations',
        installationId
      ).catch(console.error);
    });
  }

  revalidatePath(`/technician/jobs/${installationId}`);
  revalidatePath('/technician/dashboard');
  return { success: true };
}

export async function saveChecklistAction(
  installationId: string, 
  checklist: { item_code: string, item_name: string, status: string, is_required: boolean }[]
) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Verify ownership
  const { data: installation } = await supabase
    .from('installations')
    .select('technician_id, status')
    .eq('id', installationId)
    .single();

  if (!installation || installation.technician_id !== user.id) {
    return { error: 'Forbidden' };
  }

  // Checklists should only be saved if IN_PROGRESS or REVISIT_REQUIRED
  if (installation.status !== 'IN_PROGRESS' && installation.status !== 'REVISIT_REQUIRED') {
    return { error: 'Can only update checklist while IN_PROGRESS' };
  }

  // UPSERT the checklist into installation_checklists
  const records = checklist.map(c => ({
    installation_id: installationId,
    item_code: c.item_code,
    item_name: c.item_name,
    status: c.status,
    is_required: c.is_required,
    checked_by: user.id,
    checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  // We need to delete old ones and insert new ones, OR upsert based on unique constraint.
  // The schema in 0001 doesn't have a unique constraint on (installation_id, item_code).
  // Safest approach: delete existing for this installation, then insert.
  await supabase
    .from('installation_checklists')
    .delete()
    .eq('installation_id', installationId);

  const { error: insertError } = await supabase
    .from('installation_checklists')
    .insert(records);

  if (insertError) {
    console.error('Checklist insert error:', insertError);
    return { error: 'Failed to save checklist' };
  }

  revalidatePath(`/technician/jobs/${installationId}`);
  return { success: true };
}

export async function submitInstallationAction(installationId: string) {
  // Enforcing the Phase 2G strict rule: Do not fake photos.
  // In a real flow, we would verify that records exist in installation_photos.
  // Since we are not doing photos until Phase 2J, we cannot transition to UNDER VERIFICATION legally.
  return { error: 'Cannot complete installation. Photo uploads are required and will be implemented in Phase 2J.' };
}
