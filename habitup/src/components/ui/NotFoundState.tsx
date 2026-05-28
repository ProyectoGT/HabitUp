import React from 'react';
import { View, Text } from 'react-native';
import { SearchX } from 'lucide-react-native';
import { Button } from './Button';

interface Props {
  message?: string;
  onBack: () => void;
}

export function NotFoundState({ message = 'Elemento no encontrado', onBack }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="w-16 h-16 bg-border/30 rounded-full items-center justify-center mb-4">
        <SearchX size={32} color="#94A3B8" />
      </View>
      <Text className="text-muted-text text-lg text-center mb-6">{message}</Text>
      <Button label="Volver" variant="outline" onPress={onBack} />
    </View>
  );
}
