import { useEffect, useRef } from 'react';
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
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View className="bg-white px-4 pt-14 pb-3 shadow-sm flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-brand text-base">←</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="font-semibold text-gray-900" numberOfLines={1}>
            {title ?? 'Proyecto'}
          </Text>
          <Text className="text-xs text-gray-400">Chat del proyecto</Text>
        </View>
      </View>

      {/* Mensajes */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pt-4 pb-2"
          renderItem={({ item, index }) => {
            const isOwn = item.sender_id === user?.id;
            const prev = messages[index - 1];
            const showDateSeparator =
              !prev ||
              new Date(item.created_at).toDateString() !==
                new Date(prev.created_at).toDateString();

            return (
              <>
                {showDateSeparator && (
                  <DateSeparator date={item.created_at} />
                )}
                <MessageBubble message={item} isOwn={isOwn} />
              </>
            );
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-4xl mb-3">💬</Text>
              <Text className="text-gray-500 text-center">
                Sé el primero en escribir un mensaje
              </Text>
            </View>
          }
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
        />
      )}

      {error && (
        <Text className="text-red-500 text-xs text-center py-1 bg-red-50">
          {error}
        </Text>
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} isSending={isSending} />
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
    <View className="items-center my-3">
      <Text className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full capitalize">
        {label}
      </Text>
    </View>
  );
}
