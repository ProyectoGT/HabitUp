import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { USER_TYPES } from '@/utils/constants';
import { ENV } from '@/config/env';

export default function RootLayout() {
  const { session, user, professionalProfile, isLoading } = useAuth();
  useNotifications(); // registra token y suscribe Realtime globalmente
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

      // Profesional sin perfil → forzar onboarding
      if (
        user.user_type === USER_TYPES.PROFESSIONAL &&
        !professionalProfile &&
        !inOnboarding
      ) {
        router.replace('/(professional)/onboarding');
      }
    }
  }, [session, user, professionalProfile, isLoading]);

  return (
    <StripeProvider
      publishableKey={ENV.STRIPE_PUBLISHABLE_KEY}
      urlScheme="habitup"
      merchantIdentifier="merchant.com.habitup.app"
    >
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </StripeProvider>
  );
}
