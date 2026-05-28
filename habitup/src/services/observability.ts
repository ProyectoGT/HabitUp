import * as Sentry from '@sentry/react-native';
import { supabase } from './supabase';

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

  const { error: dbError } = await supabase.from('error_log').insert({
    level: 'ERROR',
    message: error.message,
    stack: error.stack,
    context: context ?? null,
    user_id: userId,
    source: 'app',
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

  const { error: dbError } = await supabase.from('event_log').insert({
    event_name: eventName,
    properties: properties ?? null,
    user_id: userId,
    source: 'app',
  });

  if (dbError && __DEV__) {
    console.warn('[observability] Failed to record event_log:', dbError.message);
  }
}
