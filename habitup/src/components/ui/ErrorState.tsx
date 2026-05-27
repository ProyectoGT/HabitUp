import React from 'react';
import { View, Text } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Button } from './Button';

interface Props {
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export function ErrorState({ message, onRetry, onBack }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="w-16 h-16 bg-error/10 rounded-full items-center justify-center mb-4">
        <AlertTriangle size={32} color="#EF4444" />
      </View>
      <Text className="text-error font-semibold text-center mb-6 leading-relaxed">{message}</Text>
      <View className="flex-row gap-3">
        {onBack && (
          <Button label="Volver" variant="outline" onPress={onBack} />
        )}
        {onRetry && (
          <Button label="Reintentar" onPress={onRetry} />
        )}
      </View>
    </View>
  );
}
