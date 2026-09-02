"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { notifySubmittedForVerification } from '@/lib/email/notifications';
import { notifyOrganization } from '@/lib/notifications';

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
      .select('technician_id, status, category, partner_id')
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
    const { data: checklists, error: checklistError } = await supabase
      .from('installation_checklists')
      .select('status, is_required')
      .eq('installation_id', installationId);

    if (checklistError || !checklists || checklists.length === 0) {
      return { success: false, error: 'Checklist not found or incomplete.' };
    }

    const hasPendingOrNo = checklists.some(c => 
      c.is_required && (c.status === 'PENDING' || c.status === 'NO')
    );

    if (hasPendingOrNo) {
      return { success: false, error: 'All required checklist items must be completed (YES or N/A) before submission.' };
    }

    // 4. Verify required photos exist
    const photoSections = [];
    if (installation.category === 'INSTALLATION_ONLY' || installation.category === 'INSTALLATION_AND_EARTHING') {
      photoSections.push('INSTALLATION_PHOTO');
    }
    if (installation.category === 'INSTALLATION_AND_EARTHING' || installation.category === 'EARTHING_ONLY') {
      photoSections.push('EARTHING_PHOTO');
    }
    if (installation.category === 'SERVICE_CALL') {
      photoSections.push('SERVICE_PHOTO');
    }
    if (photoSections.length === 0) {
      photoSections.push('GENERAL_PHOTO');
    }
    
    const { data: photos, error: photosError } = await supabase
      .from('installation_photos')
      .select('category')
      .eq('installation_id', installationId);

    if (photosError || !photos) {
      return { success: false, error: 'Failed to verify uploaded photos.' };
    }

    const uploadedCategories = new Set(photos.map((p: any) => p.category));
    const missingPhotos = photoSections.filter(c => !uploadedCategories.has(c));

    if (missingPhotos.length > 0) {
      const formattedMissing = missingPhotos.map(c => c.replace('_', ' '));
      return { success: false, error: `Missing required photos: ${formattedMissing.join(', ')}` };
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

    if (installation.partner_id) {
      notifySubmittedForVerification(installationId, installation.partner_id).catch(console.error);
      notifyOrganization(
        installation.partner_id,
        'PARTNER',
        'Installation Submitted',
        `Job ${installationId} is now submitted for verification.`,
        'installations',
        installationId
      ).catch(console.error);
    }

    revalidatePath(`/technician/jobs/${installationId}`);
    revalidatePath(`/technician/dashboard`);
    return { success: true, message: 'Installation submitted successfully for verification.' };

  } catch (error) {
    console.error('Submission error:', error);
    return { success: false, error: 'An unexpected error occurred during submission.' };
  }
}
