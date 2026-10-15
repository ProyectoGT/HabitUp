import React from 'react';
import { View, Text } from 'react-native';
import type { Message } from '@/types/models';
import { CheckCheck, Clock } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: Props) {
  const { colors } = useThemeColors();
  const time = new Date(message.created_at).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isTemp = message.id.startsWith('temp-');

  if (message.message_type === 'system') {
    return (
      <View className="items-center my-4">
        <Text className="text-xs font-medium text-muted-text bg-border/30 px-4 py-1.5 rounded-full text-center">
          {message.content}
        </Text>
      </View>
    );
  }

  return (
    <View className={`flex-row mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <View
        className={`max-w-[80%] px-4 py-3 rounded ${
          isOwn
            ? 'bg-primary rounded-br-none'
            : 'bg-surface border border-border rounded-bl-none'
        }`}
      >
        {message.content && (
          <Text className={`text-[15px] leading-6 ${isOwn ? 'text-on-primary' : 'text-text'}`}>
            {message.content}
          </Text>
        )}
        <View className={`flex-row items-center mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'} gap-1.5`}>
          <Text className={`text-[10px] font-medium ${isOwn ? 'text-on-primary/70' : 'text-muted-text'}`}>
            {time}
          </Text>
          {isOwn && (
            <View style={{ opacity: isTemp ? 0.7 : 0.9 }}>
              {isTemp ? (
                <Clock size={10} color={colors.onPrimary} />
              ) : (
                <CheckCheck size={14} color={colors.onPrimary} />
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
