import { useState, useEffect, useCallback, useRef } from 'react';
import { messagesService } from '@/services/messages.service';
import { useAuthStore } from '@/stores/authStore';
import type { Conversation, Message } from '@/types/models';

export function useMessages(projectId: string, recipientId: string) {
  const user = useAuthStore((s) => s.user);
  const userRef = useRef(user);
  userRef.current = user;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof messagesService.subscribeToConversation> | null>(null);
  const markAsReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const boot = useCallback(async () => {
    setError(null);
    const currentConversation = await messagesService.getOrCreateProjectConversation(projectId);
    setConversation(currentConversation);

    const data = await messagesService.getByConversation(currentConversation.id);
    setMessages(data);

    if (userRef.current) {
      await messagesService.markAsRead(currentConversation.id, userRef.current.id);
    }

    return currentConversation;
  }, [projectId]);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setConversation(null);
    setMessages([]);

    boot()
      .then((currentConversation) => {
        if (!isMounted) return;

        channelRef.current = messagesService.subscribeToConversation(currentConversation.id, (newMsg) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          const currentUser = userRef.current;
          if (currentUser && newMsg.recipient_id === currentUser.id) {
            if (markAsReadTimer.current) clearTimeout(markAsReadTimer.current);
            markAsReadTimer.current = setTimeout(() => {
              messagesService.markAsRead(currentConversation.id, currentUser.id).catch(() => null);
            }, 1500);
          }
        });
      })
      .catch((e) => {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : 'Error al cargar mensajes');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      channelRef.current?.unsubscribe();
      channelRef.current = null;
      if (markAsReadTimer.current) clearTimeout(markAsReadTimer.current);
    };
  }, [boot]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !userRef.current) return;

    setIsSending(true);
    setError(null);
    try {
      const currentConversation =
        conversation ?? await messagesService.getOrCreateProjectConversation(projectId);

      if (!conversation) setConversation(currentConversation);

      const tempId = `temp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId,
        project_id: projectId,
        conversation_id: currentConversation.id,
        sender_id: userRef.current.id,
        recipient_id: recipientId,
        message_type: 'text',
        content,
        attachment_url: null,
        is_read: false,
        read_at: null,
        deleted_at: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      const sent = await messagesService.send({
        conversationId: currentConversation.id,
        projectId,
        recipientId,
        content,
      });

      setMessages((prev) => prev.map((m) => (m.id === tempId ? sent : m)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar');
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
    } finally {
      setIsSending(false);
    }
  }, [conversation, projectId, recipientId]);

  return { conversation, messages, isLoading, isSending, error, sendMessage };
}
