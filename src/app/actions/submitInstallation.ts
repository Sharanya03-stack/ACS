"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function submitInstallation(installationId: string) {
  try {
    const supabase = await createClient();
    
    // 1. Authenticate user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = session.user.id;

    // 2. Fetch installation and verify ownership
    const { data: installation, error: instError } = await supabase
      .from('installations')
      .select('technician_id, status, checklist')
      .eq('id', installationId)
      .single();

    if (instError || !installation) {
      return { success: false, error: 'Installation not found.' };
    }

    if (installation.technician_id !== userId) {
      return { success: false, error: 'Forbidden: You are not assigned to this installation.' };
    }

    if (installation.status !== 'IN_PROGRESS') {
      return { success: false, error: 'Only installations in IN_PROGRESS state can be submitted.' };
    }

    // 3. Verify checklist is complete
    // Depending on schema, checklist might be JSONB
    const checklist = installation.checklist as Record<string, boolean> | null;
    if (checklist) {
      const allChecked = Object.values(checklist).every(val => val === true);
      // Wait, some items might be false. We just ensure that required items are completed.
      // Let's assume the UI sends updates, but we verify here if the essential keys exist and are true.
      // Actually, we should check if they checked everything.
      if (!allChecked) {
        return { success: false, error: 'All checklist items must be completed before submission.' };
      }
    }

    // 4. Verify required photos exist
    const { count, error: countError } = await supabase
      .from('installation_photos')
      .select('*', { count: 'exact', head: true })
      .eq('installation_id', installationId);

    if (countError || count === null || count === 0) {
      return { success: false, error: 'At least one evidence photo must be uploaded before submission.' };
    }

    // 5. Update Status to UNDER_VERIFICATION
    const { error: updateError } = await supabase
      .from('installations')
      .update({
        status: 'UNDER_VERIFICATION',
        updated_at: new Date().toISOString()
      })
      .eq('id', installationId)
      .eq('technician_id', userId)
      .eq('status', 'IN_PROGRESS'); // optimistic concurrency

    if (updateError) {
      return { success: false, error: 'Failed to update installation status.' };
    }

    revalidatePath(`/technician/jobs/${installationId}`);
    revalidatePath(`/technician/dashboard`);
    return { success: true, message: 'Installation submitted successfully for verification.' };

  } catch (error) {
    console.error('Submission error:', error);
    return { success: false, error: 'An unexpected error occurred during submission.' };
  }
}
