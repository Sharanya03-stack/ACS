"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 1. Verify token and get installation
export async function getInstallationByToken(token: string) {
  const supabase = getAdminClient();
  const { data: inst, error } = await supabase
    .from('installations')
    .select(`
      id, status, category, scheduled_date, tracking_token,
      customers(name, city, state, address, phone),
      vehicles(model, vin),
      chargers(model, serial_number, power_rating),
      partner_id
    `)
    .eq('tracking_token', token)
    .single();
    
  if (error || !inst) return null;
  return inst;
}

export async function externalStartJob(token: string) {
  const supabase = getAdminClient();
  const inst = await getInstallationByToken(token);
  if (!inst) return { error: 'Invalid token' };
  
  if (inst.status !== 'TECHNICIAN_ASSIGNED' && inst.status !== 'SCHEDULED' && inst.status !== 'IN_PROGRESS' && inst.status !== 'REVISIT_REQUIRED') {
    return { error: 'Invalid transition' };
  }
  
  if (inst.status !== 'IN_PROGRESS') {
    const { error: updateError } = await supabase
      .from('installations')
      .update({ status: 'IN_PROGRESS', started_at: new Date().toISOString() })
      .eq('id', inst.id);
    if (updateError) return { error: 'Failed to start job' };
  }
  
  revalidatePath(`/technician/workflow/${token}`);
  return { success: true };
}

export async function externalSaveChecklist(token: string, checklist: any[]) {
  const supabase = getAdminClient();
  const inst = await getInstallationByToken(token);
  if (!inst) return { error: 'Invalid token' };

  if (inst.status !== 'IN_PROGRESS' && inst.status !== 'REVISIT_REQUIRED') {
    return { error: 'Can only update checklist while IN_PROGRESS' };
  }

  const records = checklist.map(c => ({
    installation_id: inst.id,
    item_code: c.item_code,
    item_name: c.item_name,
    status: c.status,
    is_required: c.is_required,
    checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  await supabase.from('installation_checklists').delete().eq('installation_id', inst.id);
  const { error: insertError } = await supabase.from('installation_checklists').insert(records);
  
  if (insertError) return { error: 'Failed to save checklist' };
  return { success: true };
}

export async function externalUploadPhoto(formData: FormData) {
  const token = formData.get('trackingToken') as string;
  const file = formData.get('file') as File;
  const category = formData.get('category') as string || 'general';

  if (!token || !file) return { error: 'Missing required fields' };
  
  const supabase = getAdminClient();
  const inst = await getInstallationByToken(token);
  if (!inst) return { error: 'Invalid token' };

  if (!ALLOWED_MIME_TYPES.includes(file.type)) return { error: 'Unsupported file type' };
  if (file.size > MAX_FILE_SIZE) return { error: 'File exceeds 5MB' };

  const fileExt = file.name.split('.').pop();
  const fileName = `${inst.id}/${category}_${Date.now()}.${fileExt}`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('installation-evidence')
    .upload(fileName, file, { cacheControl: '3600', upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { error: dbError } = await supabase.from('installation_photos').insert({
    installation_id: inst.id,
    category: category,
    storage_path: uploadData.path,
    uploaded_at: new Date().toISOString()
  });

  if (dbError) return { error: dbError.message };
  return { success: true };
}

export async function externalDeletePhoto(token: string, photoId: string) {
  const supabase = getAdminClient();
  const inst = await getInstallationByToken(token);
  if (!inst) return { error: 'Invalid token' };

  const { data: photo } = await supabase.from('installation_photos').select('*').eq('id', photoId).eq('installation_id', inst.id).single();
  if (!photo) return { error: 'Photo not found' };

  await supabase.storage.from('installation-evidence').remove([photo.storage_path]);
  await supabase.from('installation_photos').delete().eq('id', photoId);

  return { success: true };
}

export async function externalSubmitInstallation(token: string) {
  const supabase = getAdminClient();
  const inst = await getInstallationByToken(token);
  if (!inst) return { error: 'Invalid token' };

  if (inst.status !== 'IN_PROGRESS') return { error: 'Must be IN_PROGRESS' };

  const { data: checklists } = await supabase.from('installation_checklists').select('*').eq('installation_id', inst.id);
  if (!checklists || checklists.length === 0) return { error: 'Checklist incomplete' };

  const hasPendingOrNo = checklists.some(c => c.is_required && (c.status === 'PENDING' || c.status === 'NO'));
  if (hasPendingOrNo) return { error: 'All required checklist items must be YES or N/A' };

  const { data: photos } = await supabase.from('installation_photos').select('category').eq('installation_id', inst.id);
  
  let requiredCategories = ['INSTALLATION_PHOTO'];
  if (inst.category === 'INSTALLATION_EARTHING') requiredCategories.push('EARTHING_PHOTO');
  
  for (const reqCat of requiredCategories) {
    if (!photos?.some(p => p.category === reqCat)) {
      return { error: `Missing required photos for category: ${reqCat}` };
    }
  }

  const { error: updateError } = await supabase.from('installations').update({ 
    status: 'UNDER_VERIFICATION',
    completed_at: new Date().toISOString() 
  }).eq('id', inst.id);
  
  if (updateError) return { error: updateError.message };

  await supabase.from('audit_logs').insert({
    entity_type: 'INSTALLATION',
    entity_id: inst.id,
    action: 'STATUS_CHANGED',
    new_value: { status: 'UNDER_VERIFICATION' },
    created_at: new Date().toISOString()
  });

  return { success: true };
}

export async function externalGetSignedUrls(token: string, paths: string[]) {
  const supabase = getAdminClient();
  const inst = await getInstallationByToken(token);
  if (!inst) return { error: 'Invalid token' };
  
  // SECURE: Fetch allowed paths from DB first
  const { data: allowedPhotos } = await supabase
    .from('installation_photos')
    .select('storage_path')
    .eq('installation_id', inst.id);
    
  const allowedPaths = new Set(allowedPhotos?.map(p => p.storage_path) || []);
  
  const urls: Record<string, string> = {};
  for (const path of paths) {
    if (!allowedPaths.has(path)) continue; // Prevent arbitrary access
    
    const { data } = await supabase.storage.from('installation-evidence').createSignedUrl(path, 3600);
    if (data?.signedUrl) urls[path] = data.signedUrl;
  }
  return { success: true, urls };
}
