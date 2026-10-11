"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { isValidTransition } from '@/lib/transitions';
import { notifySubmittedForVerification } from '@/lib/email/notifications';
import { notifyOrganization } from '@/lib/notifications';

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
    .select(`*`)
    .eq('tracking_token', token)
    .single();

  if (error || !inst) return null;

  // Fetch relations manually to avoid FK ambiguity if any
  let customers: any[] = [], vehicles: any[] = [], chargers: any[] = [], partner = null, technician = null, dealer = null, oem = null;

  if (inst.customer_id) {
    const { data: c } = await supabase.from('customers').select('*').eq('id', inst.customer_id).single();
    if (c) {
      customers = [c];
      if (c.dealer_id) {
        const { data: d } = await supabase.from('organizations').select('*').eq('id', c.dealer_id).single();
        dealer = d;
        if (d && d.parent_org_id) {
          const { data: o } = await supabase.from('organizations').select('*').eq('id', d.parent_org_id).single();
          oem = o;
        }
      }
    }
  }

  if (inst.vehicle_id) {
    const { data: v } = await supabase.from('vehicles').select('*').eq('id', inst.vehicle_id).single();
    if (v) vehicles = [v];
  }

  if (inst.charger_id) {
    const { data: c } = await supabase.from('chargers').select('*').eq('id', inst.charger_id).single();
    if (c) chargers = [c];
  }

  if (inst.partner_id) {
    const { data: p } = await supabase.from('organizations').select('*').eq('id', inst.partner_id).single();
    partner = p;
  }

  if (inst.technician_id) {
    const { data: tp } = await supabase.from('profiles').select('*').eq('id', inst.technician_id).single();
    technician = tp;
  } else if ((inst as any).custom_technician_name) {
    technician = { id: null, name: (inst as any).custom_technician_name, is_custom: true };
  } else if (inst.remarks && inst.remarks.includes('[Tech: ')) {
    const match = inst.remarks.match(/\[Tech:\s*([^\]]+)\]/);
    if (match) {
      technician = { id: null, name: match[1].trim(), is_custom: true };
    }
  }

  return {
    ...inst,
    custom_technician_name: (inst as any).custom_technician_name || (technician?.name ?? null),
    customers,
    vehicles,
    chargers,
    partner,
    technician,
    dealer,
    oem
  };
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful fallback outside Next.js request lifecycle
  }
}

export async function externalStartJob(token: string) {
  const supabase = getAdminClient();
  const inst = await getInstallationByToken(token);
  if (!inst) return { error: 'Invalid token' };

  if (!isValidTransition(inst.status, 'IN_PROGRESS')) {
    return { error: 'Invalid transition from ' + inst.status + ' to IN_PROGRESS' };
  }

  if (inst.status !== 'IN_PROGRESS') {
    const { error: updateError } = await supabase
      .from('installations')
      .update({ status: 'IN_PROGRESS', started_at: new Date().toISOString() })
      .eq('id', inst.id);
    if (updateError) return { error: 'Failed to start job' };

    // Fire audit log if it's external, since we don't know the tech exactly
    await supabase.from('audit_logs').insert({
      entity_type: 'INSTALLATION',
      entity_id: inst.id,
      action: 'STATUS_CHANGED',
      new_value: { status: 'IN_PROGRESS' },
      created_at: new Date().toISOString()
    });
  }

  safeRevalidatePath(`/technician/workflow/${token}`);
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

  if (!inst.technician_id && !inst.custom_technician_name) {
    return { error: 'A technician must be assigned before photos can be uploaded.' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) return { error: 'Unsupported file type' };
  if (file.size > MAX_FILE_SIZE) return { error: 'File exceeds 5MB' };

  const fileExt = file.name.split('.').pop();
  const fileName = `${inst.id}/${category}_${Date.now()}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('installation-evidence')
    .upload(fileName, file, { cacheControl: '3600', upsert: true });

  if (uploadError) return { error: uploadError.message };

  let uploadedByProfileId: string | null = inst.technician_id || null;

  let { data: insertedPhoto, error: dbError } = await supabase.from('installation_photos').insert({
    installation_id: inst.id,
    uploaded_by: uploadedByProfileId,
    category: category,
    storage_path: uploadData.path,
    file_type: file.type,
    file_size: file.size,
    uploaded_at: new Date().toISOString()
  }).select().single();

  // If database still enforces NOT NULL constraint on uploaded_by (code 23502),
  // safely attribute to an active partner profile or admin profile
  if (dbError && dbError.code === '23502') {
    let fallbackProfileId: string | null = null;
    if (inst.partner_id) {
      const { data: partnerProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('org_id', inst.partner_id)
        .eq('status', 'ACTIVE')
        .limit(1);
      if (partnerProfiles && partnerProfiles.length > 0) {
        fallbackProfileId = partnerProfiles[0].id;
      }
    }
    if (!fallbackProfileId) {
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'ACS_ADMIN')
        .limit(1);
      if (adminProfiles && adminProfiles.length > 0) {
        fallbackProfileId = adminProfiles[0].id;
      }
    }

    if (fallbackProfileId) {
      const retry = await supabase.from('installation_photos').insert({
        installation_id: inst.id,
        uploaded_by: fallbackProfileId,
        category: category,
        storage_path: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        uploaded_at: new Date().toISOString()
      }).select().single();
      insertedPhoto = retry.data;
      dbError = retry.error;
    }
  }

  if (dbError) return { error: dbError.message };

  const { data: signedData } = await supabase.storage
    .from('installation-evidence')
    .createSignedUrl(uploadData.path, 3600);

  safeRevalidatePath(`/technician/workflow/${token}`);
  return {
    success: true,
    photo: {
      ...(insertedPhoto || {}),
      url: signedData?.signedUrl
    }
  };
}

export async function externalUploadDocument(formData: FormData) {
  const token = formData.get('trackingToken') as string;
  const file = formData.get('file') as File;

  if (!token || !file) return { error: 'Missing required fields' };

  const supabase = getAdminClient();
  const inst = await getInstallationByToken(token);
  if (!inst) return { error: 'Invalid token' };

  if (!inst.technician_id && !inst.custom_technician_name) {
    return { error: 'A technician must be assigned before documents can be uploaded.' };
  }

  if (file.type !== 'application/pdf') return { error: 'Unsupported file type, must be PDF' };
  if (file.size > MAX_FILE_SIZE) return { error: 'File exceeds 5MB' };

  const fileName = `${inst.id}/INSTALLATION_PDF_${Date.now()}.pdf`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('installation-evidence')
    .upload(fileName, file, { cacheControl: '3600', upsert: true });

  if (uploadError) return { error: uploadError.message };

  let uploadedByProfileId: string | null = inst.technician_id || null;

  let { data: insertedDoc, error: dbError } = await supabase.from('installation_photos').insert({
    installation_id: inst.id,
    uploaded_by: uploadedByProfileId,
    category: 'INSTALLATION_PDF',
    storage_path: uploadData.path,
    file_type: file.type,
    file_size: file.size,
    uploaded_at: new Date().toISOString()
  }).select().single();

  // If database still enforces NOT NULL constraint on uploaded_by (code 23502),
  // safely attribute to an active partner profile or admin profile
  if (dbError && dbError.code === '23502') {
    let fallbackProfileId: string | null = null;
    if (inst.partner_id) {
      const { data: partnerProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('org_id', inst.partner_id)
        .eq('status', 'ACTIVE')
        .limit(1);
      if (partnerProfiles && partnerProfiles.length > 0) {
        fallbackProfileId = partnerProfiles[0].id;
      }
    }
    if (!fallbackProfileId) {
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'ACS_ADMIN')
        .limit(1);
      if (adminProfiles && adminProfiles.length > 0) {
        fallbackProfileId = adminProfiles[0].id;
      }
    }

    if (fallbackProfileId) {
      const retry = await supabase.from('installation_photos').insert({
        installation_id: inst.id,
        uploaded_by: fallbackProfileId,
        category: 'INSTALLATION_PDF',
        storage_path: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        uploaded_at: new Date().toISOString()
      }).select().single();
      insertedDoc = retry.data;
      dbError = retry.error;
    }
  }

  if (dbError) return { error: dbError.message };

  const { data: signedData } = await supabase.storage
    .from('installation-evidence')
    .createSignedUrl(uploadData.path, 3600);

  // Revalidate to refresh the UI
  safeRevalidatePath(`/technician/workflow/${token}`);
  return {
    success: true,
    document: {
      ...(insertedDoc || {}),
      url: signedData?.signedUrl
    }
  };
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

  let requiredCategories: string[] = [];

  if (
    inst.category === 'INSTALLATION_ONLY' ||
    inst.category === 'INSTALLATION_EARTHING' ||
    inst.category === 'INSTALLATION_AND_EARTHING'
  ) {
    requiredCategories.push('INSTALLATION_PHOTO');
  }

  if (
    inst.category === 'INSTALLATION_EARTHING' ||
    inst.category === 'INSTALLATION_AND_EARTHING' ||
    inst.category === 'EARTHING_ONLY'
  ) {
    requiredCategories.push('EARTHING_PHOTO');
  }

  if (requiredCategories.length === 0) {
    requiredCategories.push('GENERAL_PHOTO');
  }

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

  notifySubmittedForVerification(inst.id, inst.partner_id).catch(console.error);
  if (inst.partner_id) {
    notifyOrganization(
      inst.partner_id,
      'PARTNER',
      'Installation Submitted',
      `Job ${inst.display_id || inst.id} is now submitted for verification.`,
      'installations',
      inst.id
    ).catch(console.error);
  }

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
