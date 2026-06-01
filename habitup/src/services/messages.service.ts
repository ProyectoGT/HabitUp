import { supabase } from './supabase';
import { trackEvent } from './analytics.service';
import type { Conversation, Message } from '@/types/models';

type SendMessageParams = {
  conversationId: string;
  projectId?: string | null;
  recipientId: string;
  content?: string;
  messageType?: Message['message_type'];
  attachmentUrl?: string;
};

export const messagesService = {
  async isProjectParticipant(projectId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .maybeSingle();

    if (error) throw error;
    return data !== null;
  },

  async getOrCreateProjectConversation(projectId: string): Promise<Conversation> {
    const { data, error } = await supabase
      .rpc('get_or_create_project_conversation', { p_project_id: projectId });

    if (error) throw error;

    const conversation = ((data ?? []) as Conversation[])[0];
    if (!conversation) throw new Error('No se pudo resolver la conversacion del proyecto');
    return conversation;
  },

  async getOrCreateLeadConversation(
    leadId: string,
    professionalId: string,
  ): Promise<Conversation> {
    const { data, error } = await supabase
      .rpc('get_or_create_lead_conversation', {
        p_lead_id: leadId,
        p_professional_id: professionalId,
      });

    if (error) throw error;

    const conversation = ((data ?? []) as Conversation[])[0];
    if (!conversation) throw new Error('No se pudo resolver la conversacion del lead');
    return conversation;
  },

  async getByConversation(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Message[];
  },

  async getByProject(projectId: string): Promise<Message[]> {
    const conversation = await this.getOrCreateProjectConversation(projectId);
    return this.getByConversation(conversation.id);
  },

  async send({
    conversationId,
    projectId = null,
    recipientId,
    content,
    messageType = 'text',
    attachmentUrl,
  }: SendMessageParams): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
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

    trackEvent('message_sent', {
      conversation_id: conversationId,
      project_id: projectId,
      message_type: messageType,
    });

    return data as Message;
  },

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  },

  subscribeToConversation(
    conversationId: string,
    onMessage: (message: Message) => void,
  ) {
    return supabase
      .channel(`messages:conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => onMessage(payload.new as Message),
      )
      .subscribe();
  },
};
