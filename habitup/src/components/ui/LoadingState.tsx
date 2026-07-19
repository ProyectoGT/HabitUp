import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  message?: string;
}

export function LoadingState({ message }: Props) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={message ?? 'Cargando contenido'} className="flex-1 px-5 pt-6">
      <View className="h-7 w-2/3 rounded-lg bg-border/70 mb-5" />
      <View className="h-28 rounded-xl bg-border/50 mb-3" />
      <View className="h-28 rounded-xl bg-border/50 mb-3" />
      <View className="h-20 rounded-xl bg-border/40" />
      {message && (
        <Text className="text-muted-text text-sm mt-5">{message}</Text>
      )}
    </View>
  );
}
