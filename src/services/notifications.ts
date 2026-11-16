import { supabase } from '@/services/supabase';

export type TripMateNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  trip_id: string | null;
  request_id: string | null;
  is_read: boolean;
  created_at: string;
};

export async function loadNotifications(userId: string) {
  if (!userId) {
    throw new Error('Please log in to view notifications.');
  }

  const [list, unread] = await Promise.all([
    supabase
      .from('notifications')
      .select(
        'id, user_id, type, title, body, trip_id, request_id, is_read, created_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(50),

    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false),
  ]);

  if (list.error) {
    throw new Error(list.error.message);
  }

  if (unread.error) {
    throw new Error(unread.error.message);
  }

  return {
    notifications:
      (list.data ?? []) as TripMateNotification[],
    unreadCount: unread.count ?? 0,
  };
}

export async function markNotificationRead(
  userId: string,
  id: string
) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      'This notification is no longer available. Refresh the list.'
    );
  }
}

export async function markAllNotificationsRead(
  userId: string
) {
  if (!userId) {
    throw new Error('Please log in first.');
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    throw new Error(error.message);
  }
}