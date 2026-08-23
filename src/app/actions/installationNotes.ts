"use server";

import { createClient as createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addInstallationNote(installationId: string, content: string) {
  try {
    const supabase = await createServerClient();
    
    // 1. Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!content || content.trim().length === 0) {
      return { success: false, error: 'Content cannot be empty.' };
    }

    // 2. Insert the note.
    // We strictly use the authenticated user's ID for created_by.
    // RLS will block the insert if the user does not have permission to access this installation.
    const { error: insertError } = await supabase
      .from('installation_notes')
      .insert({
        installation_id: installationId,
        content: content.trim(),
        created_by: user.id,
      });

    if (insertError) {
      throw insertError;
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error adding installation note:", error);
    return { success: false, error: error.message || 'Failed to add note.' };
  }
}

export async function getInstallationNotes(installationId: string) {
  try {
    const supabase = await createServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] };
    }

    // Read notes.
    // The query automatically filters via RLS - if you can't read the note, it won't be returned.
    const { data, error } = await supabase
      .from('installation_notes')
      .select(`
        id,
        content,
        created_at,
        created_by,
        profiles (
          name,
          role
        )
      `)
      .eq('installation_id', installationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Error fetching installation notes:", error);
    return { success: false, error: error.message || 'Failed to fetch notes.', data: [] };
  }
}
