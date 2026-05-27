import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as ExpoNotifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { notificationsService } from '@/services/notifications.service';
import type { Notification } from '@/types/models';

// Notificaciones solo disponibles en nativo
const isNative = Platform.OS !== 'web';

if (isNative) {
  ExpoNotifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function useNotifications() {
  const user = useAuthStore((s) => s.user);
  const { setNotifications, addNotification, unreadCount } = useNotificationStore();
  const router = useRouter();
  const responseListenerRef = useRef<ExpoNotifications.EventSubscription | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof notificationsService.subscribeToNew> | null>(null);

  useEffect(() => {
    if (!user || !isNative) return;
    registerForPushNotifications();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    notificationsService.getAll().then(setNotifications).catch(() => null);

    realtimeChannelRef.current = notificationsService.subscribeToNew(
      user.id,
      (n: Notification) => addNotification(n),
    );

    return () => {
      realtimeChannelRef.current?.unsubscribe();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!isNative) return;

    responseListenerRef.current = ExpoNotifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, string>;
        navigateFromPushData(data, router);
      },
    );

    ExpoNotifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, string>;
      navigateFromPushData(data, router);
    });

    return () => {
      responseListenerRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!isNative) return;
    ExpoNotifications.setBadgeCountAsync(unreadCount).catch(() => null);
  }, [unreadCount]);

  return { unreadCount };
}

async function registerForPushNotifications() {
  if (!isNative) return;

  const { status: existing } = await ExpoNotifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await ExpoNotifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    // Permission denied — clear any stale token so we don't
    // attempt pushes that will never arrive.
    await notificationsService.clearExpoPushToken().catch(() => null);
    return;
  }

  if (Platform.OS === 'android') {
    await ExpoNotifications.setNotificationChannelAsync('default', {
      name: 'HabitUp',
      importance: ExpoNotifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    });
  }

  try {
    const tokenData = await ExpoNotifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    // Re-register even if the token is the same — this also
    // clears any prior last_push_error flag in the DB so push
    // triggers resume for this user.
    await notificationsService.saveExpoPushToken(tokenData.data);
  } catch {
    // Falla en emuladores sin servicios de Google
  }
}

function navigateFromPushData(
  data: Record<string, string>,
  router: ReturnType<typeof useRouter>,
) {
  const { type, projectId, leadId } = data;
  if (!type) return;

  switch (type) {
    case 'new_message':
      if (projectId) router.push(`/chat/${projectId}` as never);
      break;
    case 'new_quote':
      if (leadId) router.push(`/(client)/leads/${leadId}` as never);
      break;
    case 'quote_accepted':
      if (leadId) router.push(`/(professional)/leads/${leadId}` as never);
      break;
    case 'project_completed':
      if (projectId) router.push(`/(client)/projects/${projectId}` as never);
      break;
  }
}
