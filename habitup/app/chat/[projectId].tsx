import React, { useEffect, useRef } from 'react';
import {
  View, Text, FlatList,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMessages } from '@/hooks/useMessages';
import { useAuthStore } from '@/stores/authStore';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import type { Message } from '@/types/models';
import {
  Screen, LoadingState, EmptyState, PhaseScaffold,
  type ConversationPhase,
} from '@/components/ui';
import { ArrowLeft, MessageSquareMore } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ICON_STROKE_WIDTH } from '@/utils/categoryIcons';

export default function ChatScreen() {
  const { projectId, recipientId, title } = useLocalSearchParams<{
    projectId: string;
    recipientId: string;
    title?: string;
  }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { colors } = useThemeColors();
  const listRef = useRef<FlatList<Message>>(null);

  const { conversation, messages, isLoading, isSending, error, sendMessage } = useMessages(
    projectId,
    recipientId,
  );

  const hasScrolledRef = useRef(false);

  // Scroll al fondo cuando cargan los mensajes iniciales
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 200);
    }
  }, [isLoading, messages.length]);

  // Scroll al final cuando llegan mensajes nuevos (después del inicial)
  useEffect(() => {
    if (messages.length > 0 && hasScrolledRef.current) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Screen safeArea={false} className="flex-1">
        {/* Cabecera con el andamio de fases */}
        <View className="bg-surface px-4 pt-16 pb-3 border-b border-border z-10">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 -ml-2"
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <ArrowLeft size={22} color={colors.text} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-lg font-bold text-text leading-tight" numberOfLines={1}>
                {title ?? 'Proyecto'}
              </Text>
            </View>
          </View>
          {conversation && (
            <View className="mt-2 ml-9">
              <PhaseScaffold
                phase={conversation.status as ConversationPhase}
                variant="compact"
              />
            </View>
          )}
        </View>

        {/* Mensajes */}
        {isLoading ? (
          <LoadingState />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerClassName="px-4 pt-6 pb-2 flex-grow w-full self-center"
            contentContainerStyle={{ maxWidth: 520 }}
            renderItem={({ item, index }) => {
              const isOwn = item.sender_id === user?.id;
              const prev = messages[index - 1];
              const showDateSeparator =
                !prev ||
                new Date(item.created_at).toDateString() !==
                  new Date(prev.created_at).toDateString();

              return (
                <View key={item.id}>
                  {showDateSeparator && (
                    <DateSeparator date={item.created_at} />
                  )}
                  <MessageBubble message={item} isOwn={isOwn} />
                </View>
              );
            }}
            ListEmptyComponent={
              <EmptyState
                icon={
                  <MessageSquareMore
                    size={32}
                    color={colors.blueprint}
                    strokeWidth={ICON_STROKE_WIDTH}
                  />
                }
                title="Aún no hay nada construido aquí"
                description="Escribe el primer mensaje: cuenta qué necesitas y añade fotos si ayudan."
              />
            }
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        {error && (
          <View className="bg-error/10 py-2 px-4 border-t border-error/20">
            <Text className="text-error text-xs font-semibold text-center">
              {error}
            </Text>
          </View>
        )}

        {/* Input */}
        <ChatInput onSend={sendMessage} isSending={isSending} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function DateSeparator({ date }: { date: string }) {
  const label = new Date(date).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return (
    <View className="items-center my-4">
      <Text className="text-[11px] font-bold text-muted-text bg-surface-sunken px-3 py-1.5 rounded-chip capitalize">
        {label}
      </Text>
    </View>
  );
}
