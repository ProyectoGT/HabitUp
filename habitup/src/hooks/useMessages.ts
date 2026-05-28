import { useState, useEffect, useCallback, useRef } from 'react';
import { messagesService } from '@/services/messages.service';
import { useAuthStore } from '@/stores/authStore';
import type { Message } from '@/types/models';

export function useMessages(projectId: string, recipientId: string) {
  const user = useAuthStore((s) => s.user);
  const userRef = useRef(user);
  userRef.current = user;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof messagesService.subscribeToProject> | null>(null);
  const markAsReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await messagesService.getByProject(projectId);
      setMessages(data);
      if (userRef.current) {
        await messagesService.markAsRead(projectId, userRef.current.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar mensajes');
    }
  }, [projectId]);

  useEffect(() => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));

    channelRef.current = messagesService.subscribeToProject(projectId, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      const currentUser = userRef.current;
      if (currentUser && newMsg.recipient_id === currentUser.id) {
        if (markAsReadTimer.current) clearTimeout(markAsReadTimer.current);
        markAsReadTimer.current = setTimeout(() => {
          messagesService.markAsRead(projectId, currentUser.id).catch(() => null);
        }, 1500);
      }
    });

    return () => {
      channelRef.current?.unsubscribe();
      if (markAsReadTimer.current) clearTimeout(markAsReadTimer.current);
    };
  }, [projectId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !userRef.current) return;

    setIsSending(true);
    setError(null);
    try {
      const tempId = `temp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId,
        project_id: projectId,
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

      const sent = await messagesService.send({ projectId, recipientId, content });

      setMessages((prev) => prev.map((m) => (m.id === tempId ? sent : m)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar');
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
    } finally {
      setIsSending(false);
    }
  }, [projectId, recipientId]);

  return { messages, isLoading, isSending, error, sendMessage };
}