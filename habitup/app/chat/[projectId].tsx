import React, { useEffect, useRef } from 'react';
import {
  View, Text, FlatList, ActivityIndicator,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMessages } from '@/hooks/useMessages';
import { useAuthStore } from '@/stores/authStore';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import type { Message } from '@/types/models';
import { Screen } from '@/components/ui';
import { ArrowLeft, MessageSquareMore } from 'lucide-react-native';

export default function ChatScreen() {
  const { projectId, recipientId, title } = useLocalSearchParams<{
    projectId: string;
    recipientId: string;
    title?: string;
  }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const listRef = useRef<FlatList<Message>>(null);

  const { messages, isLoading, isSending, error, sendMessage } = useMessages(
    projectId,
    recipientId,
  );

  // Scroll al final cuando llegan mensajes nuevos
  useEffect(() => {
    if (messages.length > 0) {
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
        {/* Header */}
        <View className="bg-surface px-6 pt-16 pb-4 shadow-sm shadow-primary/10 border-b border-border/50 rounded-b-2xl z-10 flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#6366F1" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-text leading-tight" numberOfLines={1}>
              {title ?? 'Proyecto'}
            </Text>
            <Text className="text-sm font-medium text-muted-text mt-0.5">Chat del proyecto</Text>
          </View>
        </View>

        {/* Mensajes */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#6366F1" size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerClassName="px-4 pt-6 pb-2 flex-grow"
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
              <View className="flex-1 items-center justify-center py-20 px-6">
                <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-6">
                  <MessageSquareMore size={40} color="#6366F1" strokeWidth={1.5} />
                </View>
                <Text className="text-xl font-bold text-text mb-2 text-center">Sin mensajes</Text>
                <Text className="text-muted-text text-center leading-relaxed">
                  Envía un mensaje para comenzar la conversación sobre este proyecto.
                </Text>
              </View>
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
      <Text className="text-[11px] font-bold text-muted-text bg-border/40 px-3 py-1.5 rounded-full capitalize">
        {label}
      </Text>
    </View>
  );
}
