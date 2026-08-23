import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Use service role client to bypass RLS when system generates notifications
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

type NotificationInsert = {
  user_id: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
};

export async function createNotification(notification: NotificationInsert) {
  if (!supabaseUrl || !supabaseServiceKey) return;

  try {
    const { error } = await adminClient
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        title: notification.title,
        message: notification.message,
        entity_type: notification.entity_type,
        entity_id: notification.entity_id,
        is_read: false
      });

    if (error) console.error('[Notification Error] Failed to create notification:', error);
  } catch (err) {
    console.error('[Notification Error] Exception creating notification:', err);
  }
}

export async function notifyOrganization(orgId: string, role: string, title: string, message: string, entity_type?: string, entity_id?: string) {
  if (!orgId) return;
  try {
    const { data: users, error } = await adminClient
      .from('profiles')
      .select('id')
      .eq('org_id', orgId)
      .eq('role', role);

    if (error || !users) return;

    for (const user of users) {
      await createNotification({
        user_id: user.id,
        title,
        message,
        entity_type,
        entity_id
      });
    }
  } catch (err) {
    console.error('[Notification Error] Failed to notify organization:', err);
  }
}
