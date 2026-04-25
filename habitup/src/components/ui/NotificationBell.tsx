import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '@/stores/notificationStore';

export function NotificationBell() {
  const router = useRouter();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications')}
      className="relative w-10 h-10 items-center justify-center"
    >
      <Text className="text-2xl">🔔</Text>
      {unreadCount > 0 && (
        <View className="absolute top-0 right-0 bg-red-500 rounded-full min-w-[16px] h-4 items-center justify-center px-1">
          <Text className="text-white text-[10px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
