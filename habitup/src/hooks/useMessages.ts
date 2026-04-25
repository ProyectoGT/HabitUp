import { useState, useEffect, useCallback, useRef } from 'react';
import { messagesService } from '@/services/messages.service';
import { useAuthStore } from '@/stores/authStore';
import type { Message } from '@/types/models';

export function useMessages(projectId: string, recipientId: string) {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof messagesService.subscribeToProject> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await messagesService.getByProject(projectId);
      setMessages(data);
      if (user) await messagesService.markAsRead(projectId, user.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar mensajes');
    }
  }, [projectId, user]);

  useEffect(() => {
    load().finally(() => setIsLoading(false));

    // Suscripción Realtime
    channelRef.current = messagesService.subscribeToProject(projectId, (newMsg) => {
      setMessages((prev) => {
        // Evitar duplicados si el mensaje ya está en el estado (optimistic update)
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      // Marcar como leído si el destinatario es el usuario actual
      if (user && newMsg.recipient_id === user.id) {
        messagesService.markAsRead(projectId, user.id).catch(() => null);
      }
    });

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [projectId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !user) return;

    setIsSending(true);
    setError(null);
    try {
      // Optimistic update: añadir mensaje temporal antes de la respuesta del servidor
      const tempId = `temp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId,
        project_id: projectId,
        sender_id: user.id,
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

      // Reemplazar el optimistic con el real
      setMessages((prev) => prev.map((m) => (m.id === tempId ? sent : m)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar');
      // Revertir optimistic
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
    } finally {
      setIsSending(false);
    }
  }, [projectId, recipientId, user]);

  return { messages, isLoading, isSending, error, sendMessage };
}
