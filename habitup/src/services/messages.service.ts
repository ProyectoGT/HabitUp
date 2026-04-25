import { supabase } from './supabase';
import type { Message } from '@/types/models';

export const messagesService = {
  async getByProject(projectId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Message[];
  },

  async send({
    projectId,
    recipientId,
    content,
    messageType = 'text',
    attachmentUrl,
  }: {
    projectId: string;
    recipientId: string;
    content?: string;
    messageType?: Message['message_type'];
    attachmentUrl?: string;
  }): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        sender_id: user.id,
        recipient_id: recipientId,
        content: content ?? null,
        message_type: messageType,
        attachment_url: attachmentUrl ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Message;
  },

  async markAsRead(projectId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('recipient_id', userId)
      .eq('is_read', false);
    if (error) throw error;
  },

  subscribeToProject(
    projectId: string,
    onMessage: (message: Message) => void,
  ) {
    return supabase
      .channel(`messages:project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => onMessage(payload.new as Message),
      )
      .subscribe();
  },
};
