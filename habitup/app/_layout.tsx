import '../global.css';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { USER_TYPES } from '@/utils/constants';
import { ENV } from '@/config/env';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initSentry } from '@/services/observability';

initSentry();

// Stripe no soporta web — se carga solo en nativo
const NativeStripeWrapper =
  Platform.OS !== 'web'
    ? require('@stripe/stripe-react-native').StripeProvider
    : ({ children }: { children: React.ReactNode }) => <>{children}</>;

export default function RootLayout() {
  const { session, user, professionalProfile, isLoading } = useAuth();
  useNotifications();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const inOnboarding = segs[0] === '(professional)' && segs[1] === 'onboarding';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (session && !user && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (session && user) {
      if (inAuthGroup) {
        if (user.user_type === USER_TYPES.PROFESSIONAL) {
          if (!professionalProfile) {
            router.replace('/(professional)/onboarding');
          } else {
            router.replace('/(professional)/home');
          }
        } else {
          router.replace('/(client)/home');
        }
        return;
      }

      if (
        user.user_type === USER_TYPES.PROFESSIONAL &&
        !professionalProfile &&
        !inOnboarding
      ) {
        router.replace('/(professional)/onboarding');
      }
    }
  }, [session, user, professionalProfile, isLoading]);

  const canUseStripe = Platform.OS !== 'web' && ENV.STRIPE_PUBLISHABLE_KEY.length > 0;
  const StripeWrapper = canUseStripe
    ? NativeStripeWrapper
    : ({ children }: { children: React.ReactNode }) => <>{children}</>;

  const stripeProps = canUseStripe
    ? {
        publishableKey: ENV.STRIPE_PUBLISHABLE_KEY,
        urlScheme: 'habitup',
        merchantIdentifier: 'merchant.com.habitup.app',
      }
    : {};

  return (
    <ErrorBoundary>
      <StripeWrapper {...stripeProps}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </StripeWrapper>
    </ErrorBoundary>
  );
}
