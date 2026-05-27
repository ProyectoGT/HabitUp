import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

interface Props {
  message?: string;
}

export function LoadingState({ message }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <ActivityIndicator color="#6366F1" size="large" />
      {message && (
        <Text className="text-muted-text text-sm mt-4 text-center">{message}</Text>
      )}
    </View>
  );
}
