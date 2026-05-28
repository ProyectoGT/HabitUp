import { trackEvent as trackObservabilityEvent } from './observability';

export type AnalyticsValue = string | number | boolean | null | undefined;
export type AnalyticsProperties = Record<string, AnalyticsValue>;

export function trackEvent(eventName: string, properties: AnalyticsProperties = {}) {
  if (__DEV__) {
    console.log('[analytics]', eventName, properties);
  }

  trackObservabilityEvent(eventName, properties as Record<string, unknown>);
}
