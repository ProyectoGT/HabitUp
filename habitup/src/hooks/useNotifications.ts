import { useEffect, useRef } from 'react';
import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { notificationsService } from '@/services/notifications.service';
import type { Notification } from '@/types/models';

// Configurar cómo mostrar las notificaciones cuando la app está en primer plano
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const user = useAuthStore((s) => s.user);
  const { setNotifications, addNotification, unreadCount } = useNotificationStore();
  const router = useRouter();
  const responseListenerRef = useRef<ExpoNotifications.EventSubscription | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof notificationsService.subscribeToNew> | null>(null);

  // ── 1. Solicitar permisos y registrar token ────────
  useEffect(() => {
    if (!user) return;
    registerForPushNotifications();
  }, [user?.id]);

  // ── 2. Cargar notificaciones y suscribir Realtime ──
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

  // ── 3. Manejar tap en notificación (foreground y background) ──
  useEffect(() => {
    responseListenerRef.current = ExpoNotifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, string>;
        navigateFromPushData(data, router);
      },
    );

    // Notificación que abrió la app desde estado cerrado
    ExpoNotifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, string>;
      navigateFromPushData(data, router);
    });

    return () => {
      responseListenerRef.current?.remove();
    };
  }, []);

  // Sincronizar el badge de la app con el contador de no leídas
  useEffect(() => {
    ExpoNotifications.setBadgeCountAsync(unreadCount).catch(() => null);
  }, [unreadCount]);

  return { unreadCount };
}

// ── Helpers ───────────────────────────────────────────

async function registerForPushNotifications() {
  if (Platform.OS === 'web') return;

  // Verificar / solicitar permisos
  const { status: existing } = await ExpoNotifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await ExpoNotifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  // Configurar canal para Android
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
    await notificationsService.saveExpoPushToken(tokenData.data);
  } catch {
    // Puede fallar en emuladores sin servicios de Google
  }
}

function navigateFromPushData(
  data: Record<string, string>,
  router: ReturnType<typeof useRouter>,
) {
  const { type, projectId, leadId, quoteId } = data;

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
