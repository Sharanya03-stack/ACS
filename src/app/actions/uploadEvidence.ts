"use server";

import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTOS_PER_INSTALLATION = 10;

export async function uploadEvidence(formData: FormData) {
  console.log('[UploadEvidence] 1. Server Action is invoked.');
  try {
    const supabase = await createClient();
    // Use the standard supabase-js client for admin operations to avoid SSR cookie requirements
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 1. Authenticate the user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      console.log('[UploadEvidence] 2. Authentication failed.');
      return { success: false, error: 'Unauthorized' };
    }
    
    const userId = session.user.id;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    console.log(`[UploadEvidence] 2. Authenticated user is identified. Role: ${profile?.role}`);

    // 2. Extract and validate input
    const file = formData.get('file') as File;
    const installationId = formData.get('installationId') as string;
    const category = formData.get('category') as string || 'general';
    
    if (!file || !installationId) {
      console.log('[UploadEvidence] 4. File validation fails (missing fields).');
      return { success: false, error: 'Missing required fields.' };
    }
    
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      console.log(`[UploadEvidence] 4. File validation fails (invalid type: ${file.type}).`);
      return { success: false, error: 'Unsupported file type. Allowed: JPEG, PNG, WEBP.' };
    }
    
    if (file.size > MAX_FILE_SIZE) {
      console.log(`[UploadEvidence] 4. File validation fails (size too large: ${file.size}).`);
      return { success: false, error: 'File exceeds 5MB size limit.' };
    }
    console.log('[UploadEvidence] 4. File validation passes.');

    // 3. Verify ownership of installation and status
    const { data: installation, error: instError } = await supabase
      .from('installations')
      .select('technician_id, status')
      .eq('id', installationId)
      .single();
      
    if (instError || !installation) {
      console.log('[UploadEvidence] 3. Installation authorization check fails (not found).');
      return { success: false, error: 'Installation not found.' };
    }
    
    if (profile?.role === 'TECHNICIAN') {
      if (installation.technician_id !== userId) {
        console.log('[UploadEvidence] 3. Installation authorization check fails (unassigned tech).');
        return { success: false, error: 'Forbidden: You are not assigned to this installation.' };
      }
      if (installation.status !== 'IN_PROGRESS') {
        console.log(`[UploadEvidence] 3. Installation authorization check fails (status is ${installation.status}).`);
        return { success: false, error: 'Evidence can only be uploaded while the installation is IN_PROGRESS.' };
      }
    }
    console.log('[UploadEvidence] 3. Installation authorization check passes.');

    // 4. Check photo limit
    const { count, error: countError } = await supabase
      .from('installation_photos')
      .select('*', { count: 'exact', head: true })
      .eq('installation_id', installationId);
      
    if (!countError && count !== null && count >= MAX_PHOTOS_PER_INSTALLATION) {
      console.log('[UploadEvidence] Photo limit reached.');
      return { success: false, error: `Maximum of ${MAX_PHOTOS_PER_INSTALLATION} photos reached.` };
    }

    // 5. Generate secure filename and path
    const fileExtension = file.name.split('.').pop();
    const uniqueId = crypto.randomUUID();
    const filePath = `${installationId}/${uniqueId}.${fileExtension}`;
    
    // 6. Upload to Supabase Storage (Node environment compat)
    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
      console.log('[UploadEvidence] 5. file.arrayBuffer() succeeds.');
    } catch (err) {
      console.error('[UploadEvidence] 5. file.arrayBuffer() fails:', err);
      return { success: false, error: 'Failed to read file data.' };
    }
    
    let buffer;
    try {
      buffer = Buffer.from(arrayBuffer);
      console.log('[UploadEvidence] 6. Buffer conversion succeeds.');
    } catch (err) {
      console.error('[UploadEvidence] 6. Buffer conversion fails:', err);
      return { success: false, error: 'Failed to convert file buffer.' };
    }
    
    console.log('[UploadEvidence] 7. Supabase Storage upload is attempted.');
    const { error: uploadError } = await adminClient.storage
      .from('installation-evidence')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });
      
    if (uploadError) {
      console.error('[UploadEvidence] 8. Storage upload returns error:', uploadError);
      return { success: false, error: 'Failed to upload photo to storage: ' + uploadError.message };
    }
    console.log('[UploadEvidence] 8. Storage upload returns success.');
    
    // 7. Check for existing photo in the same category and delete it from DB and storage
    const { data: existingPhotos } = await adminClient
      .from('installation_photos')
      .select('id, storage_path')
      .eq('installation_id', installationId)
      .eq('category', category);

    if (existingPhotos && existingPhotos.length > 0) {
      const pathsToDelete = existingPhotos.map(p => p.storage_path);
      const idsToDelete = existingPhotos.map(p => p.id);
      await adminClient.storage.from('installation-evidence').remove(pathsToDelete);
      await adminClient.from('installation_photos').delete().in('id', idsToDelete);
    }

    console.log('[UploadEvidence] 9. installation_photos INSERT is attempted.');
    // 8. Insert DB Metadata (Using authenticated client to respect RLS)
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
      console.error('[UploadEvidence] 10. INSERT returns error:', dbError);
      // Attempt rollback with admin client
      await adminClient.storage.from('installation-evidence').remove([filePath]);
      return { success: false, error: 'Failed to save photo metadata: ' + dbError.message };
    }
    console.log('[UploadEvidence] 10. INSERT returns success.');
    
    revalidatePath(`/technician/jobs/${installationId}`);
    console.log('[UploadEvidence] 11. Server Action returning success.');
    return { success: true, message: 'Photo uploaded successfully.' };
    
  } catch (error: any) {
    console.error('[UploadEvidence] Unexpected error during upload:', error);
    return { success: false, error: error?.message || 'An unexpected error occurred.' };
  }
}
