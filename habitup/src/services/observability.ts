import * as Sentry from '@sentry/react-native';
import { supabase } from './supabase';
import type { Json } from '@/types/database.types';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function initSentry() {
  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.warn('[observability] Sentry DSN not configured — skipping init');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    attachScreenshot: false,
    attachViewHierarchy: false,
  });
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function captureError(error: Error, context?: Record<string, unknown>) {
  const userId = await getUserId();

  if (SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (userId) scope.setUser({ id: userId });
      if (context) scope.setExtras(context);
      Sentry.captureException(error);
    });
  }

  if (!userId) return;

  const { error: dbError } = await supabase.rpc('record_app_error', {
    p_level: 'ERROR',
    p_message: error.message,
    p_stack: error.stack ?? null,
    p_context: (context ?? null) as Json | null,
  });

  if (dbError && __DEV__) {
    console.warn('[observability] Failed to record error_log:', dbError.message);
  }
}

export async function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  const userId = await getUserId();

  if (SENTRY_DSN) {
    Sentry.addBreadcrumb({
      category: 'event',
      message: eventName,
      data: properties,
      level: 'info',
    });
  }

  if (!userId) return;

  const { error: dbError } = await supabase.rpc('record_app_event', {
    p_event_name: eventName,
    p_properties: (properties ?? null) as Json | null,
  });

  if (dbError && __DEV__) {
    console.warn('[observability] Failed to record event_log:', dbError.message);
  }
}
