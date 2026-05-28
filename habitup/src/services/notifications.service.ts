import { supabase } from './supabase';
import type { Notification } from '@/types/models';

const EXPO_TOKEN_REGEX = /^ExponentPushToken\[[a-zA-Z0-9_-]+\]$/;

export const notificationsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as Notification[];
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async markAllAsRead(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('is_read', false);
    if (error) throw error;
  },

  async saveExpoPushToken(token: string): Promise<void> {
    if (!EXPO_TOKEN_REGEX.test(token)) {
      console.warn('saveExpoPushToken: formato de token invalido, ignorando', token.slice(0, 20));
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('users')
      .update({
        expo_push_token: token,
        last_push_error: null,
        last_push_error_at: null,
      })
      .eq('id', user.id);
    if (error) throw error;
  },

  async clearExpoPushToken(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('users').update({ expo_push_token: null }).eq('id', user.id);
  },

  subscribeToNew(userId: string, onNotification: (n: Notification) => void) {
    return supabase
      .channel(`notifications:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onNotification(payload.new as Notification),
      )
      .subscribe();
  },
};
