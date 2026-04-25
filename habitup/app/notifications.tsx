import { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '@/stores/notificationStore';
import { notificationsService } from '@/services/notifications.service';
import { formatRelativeTime } from '@/utils/formatters';
import type { Notification } from '@/types/models';

const TYPE_ICON: Record<string, string> = {
  new_quote:         '💰',
  quote_accepted:    '🎉',
  project_started:   '🔨',
  project_completed: '✅',
  new_message:       '💬',
  review_received:   '⭐',
};

const TYPE_LABEL: Record<string, string> = {
  new_quote:         'Nuevo presupuesto',
  quote_accepted:    'Presupuesto aceptado',
  project_started:   'Proyecto iniciado',
  project_completed: 'Proyecto completado',
  new_message:       'Mensaje nuevo',
  review_received:   'Nueva reseña',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, setNotifications } =
    useNotificationStore();

  const onRefresh = useCallback(async () => {
    const data = await notificationsService.getAll();
    setNotifications(data);
  }, []);

  const onPressNotification = async (n: Notification) => {
    if (!n.is_read) {
      await notificationsService.markAsRead(n.id);
      markAsRead(n.id);
    }
    navigateFromNotification(n, router);
  };

  const onMarkAllRead = async () => {
    await notificationsService.markAllAsRead();
    markAllAsRead();
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 pt-14 pb-4 shadow-sm flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-brand text-base">←</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Notificaciones</Text>
          {unreadCount > 0 && (
            <View className="bg-brand w-5 h-5 rounded-full items-center justify-center">
              <Text className="text-white text-xs font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={onMarkAllRead}>
            <Text className="text-brand text-sm font-medium">Leer todo</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-10"
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <NotificationRow notification={item} onPress={() => onPressNotification(item)} />
        )}
        ItemSeparatorComponent={() => <View className="h-px bg-gray-100 mx-4" />}
        ListEmptyComponent={
          <View className="items-center justify-center mt-24">
            <Text className="text-4xl mb-4">🔔</Text>
            <Text className="text-gray-500 text-center">Sin notificaciones todavía</Text>
          </View>
        }
      />
    </View>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: Notification;
  onPress: () => void;
}) {
  const icon = TYPE_ICON[notification.type] ?? '🔔';
  const label = TYPE_LABEL[notification.type] ?? notification.type;

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row gap-3 px-4 py-4 ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`}
    >
      {/* Icono */}
      <View className="w-10 h-10 rounded-full bg-white border border-gray-100 items-center justify-center shadow-sm flex-shrink-0">
        <Text className="text-lg">{icon}</Text>
      </View>

      {/* Contenido */}
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-gray-900">{label}</Text>
          <Text className="text-xs text-gray-400">
            {formatRelativeTime(notification.created_at)}
          </Text>
        </View>
        {notification.message && (
          <Text className="text-sm text-gray-600 mt-0.5" numberOfLines={2}>
            {notification.message}
          </Text>
        )}
      </View>

      {/* Punto de no leído */}
      {!notification.is_read && (
        <View className="w-2 h-2 rounded-full bg-brand self-center flex-shrink-0" />
      )}
    </TouchableOpacity>
  );
}

function navigateFromNotification(
  n: Notification,
  router: ReturnType<typeof useRouter>,
) {
  if (!n.related_id) return;

  switch (n.type) {
    case 'new_quote':
      router.push(`/(client)/leads/${n.related_id}` as never);
      break;
    case 'quote_accepted':
      router.push(`/(professional)/leads/${n.related_id}` as never);
      break;
    case 'project_completed':
      router.push(`/(client)/projects/${n.related_id}` as never);
      break;
    case 'new_message':
      router.push(`/chat/${n.related_id}` as never);
      break;
  }
}
