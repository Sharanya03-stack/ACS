"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTOS_PER_INSTALLATION = 10;

export async function uploadEvidence(formData: FormData) {
  try {
    const supabase = await createClient();
    
    // 1. Authenticate the user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const userId = session.user.id;

    // Verify role is TECHNICIAN
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
      
    if (profile?.role !== 'TECHNICIAN') {
      return { success: false, error: 'Forbidden: Only technicians can upload evidence.' };
    }

    // 2. Extract and validate input
    const file = formData.get('file') as File;
    const installationId = formData.get('installationId') as string;
    const category = formData.get('category') as string || 'general';
    
    if (!file || !installationId) {
      return { success: false, error: 'Missing required fields.' };
    }
    
    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { success: false, error: 'Unsupported file type. Allowed: JPEG, PNG, WEBP.' };
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'File exceeds 5MB size limit.' };
    }

    // 3. Verify ownership of installation and status
    const { data: installation, error: instError } = await supabase
      .from('installations')
      .select('technician_id, status')
      .eq('id', installationId)
      .single();
      
    if (instError || !installation) {
      return { success: false, error: 'Installation not found.' };
    }
    
    if (installation.technician_id !== userId) {
      return { success: false, error: 'Forbidden: You are not assigned to this installation.' };
    }
    
    if (installation.status !== 'IN_PROGRESS') {
      return { success: false, error: 'Evidence can only be uploaded while the installation is IN_PROGRESS.' };
    }

    // 4. Check photo limit
    const { count, error: countError } = await supabase
      .from('installation_photos')
      .select('*', { count: 'exact', head: true })
      .eq('installation_id', installationId);
      
    if (!countError && count !== null && count >= MAX_PHOTOS_PER_INSTALLATION) {
      return { success: false, error: `Maximum of ${MAX_PHOTOS_PER_INSTALLATION} photos reached.` };
    }

    // 5. Generate secure filename and path
    const fileExtension = file.name.split('.').pop();
    const uniqueId = crypto.randomUUID();
    const filePath = `${installationId}/${uniqueId}.${fileExtension}`;
    
    // 6. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('installation-evidence')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { success: false, error: 'Failed to upload photo to storage.' };
    }
    
    // 7. Insert DB Metadata
    const { error: dbError } = await supabase
      .from('installation_photos')
      .insert({
        installation_id: installationId,
        uploaded_by: userId,
        category: category,
        storage_path: filePath,
        file_type: file.type,
        file_size: file.size
      });
      
    if (dbError) {
      console.error('Database metadata error:', dbError);
      // Attempt rollback
      await supabase.storage.from('installation-evidence').remove([filePath]);
      return { success: false, error: 'Failed to save photo metadata. Upload rolled back.' };
    }
    
    revalidatePath(`/technician/jobs/${installationId}`);
    return { success: true, message: 'Photo uploaded successfully.' };
    
  } catch (error) {
    console.error('Unexpected error during upload:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
