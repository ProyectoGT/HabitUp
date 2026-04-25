import { View, Text } from 'react-native';
import type { Message } from '@/types/models';

interface Props {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: Props) {
  const time = new Date(message.created_at).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isTemp = message.id.startsWith('temp-');

  if (message.message_type === 'system') {
    return (
      <View className="items-center my-2">
        <Text className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          {message.content}
        </Text>
      </View>
    );
  }

  return (
    <View className={`flex-row mb-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <View
        className={`max-w-[78%] px-4 py-2.5 rounded-2xl ${
          isOwn
            ? 'bg-brand rounded-tr-sm'
            : 'bg-white border border-gray-100 rounded-tl-sm'
        }`}
      >
        {message.content && (
          <Text className={`text-sm leading-5 ${isOwn ? 'text-white' : 'text-gray-800'}`}>
            {message.content}
          </Text>
        )}
        <View className={`flex-row items-center mt-1 ${isOwn ? 'justify-end' : 'justify-start'} gap-1`}>
          <Text className={`text-[10px] ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
            {time}
          </Text>
          {isOwn && (
            <Text className={`text-[10px] ${isTemp ? 'text-blue-200' : 'text-blue-100'}`}>
              {isTemp ? '·' : '✓'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
