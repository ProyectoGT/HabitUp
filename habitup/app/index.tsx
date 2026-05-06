import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';

export default function Index() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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
