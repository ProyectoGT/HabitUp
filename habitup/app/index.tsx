import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useAuthStore } from '@/stores/authStore';
import { USER_TYPES } from '@/utils/constants';

export default function Index() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { session, user, professionalProfile, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      router.replace('/(auth)/login');
      return;
    }

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    if (user.user_type === USER_TYPES.PROFESSIONAL) {
      router.replace(professionalProfile ? '/(professional)/home' : '/(professional)/onboarding');
      return;
    }

    router.replace('/(client)/home');
  }, [isLoading, professionalProfile, router, session, user]);

  return (
    <LinearGradient
      colors={isDark ? ['#0F1117', '#1A1D29'] : ['#6366F1', '#8B5CF6']}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <View className="items-center justify-center p-8 bg-white/10 rounded-3xl mb-8">
        <Text className={`${isDark ? 'text-primary' : 'text-white'} text-4xl font-extrabold tracking-tight`}>
          HabitUp
        </Text>
      </View>
      <ActivityIndicator size="large" color={isDark ? '#6366F1' : '#FFFFFF'} />
    </LinearGradient>
  );
}
