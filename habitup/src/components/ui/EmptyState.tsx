import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';

interface Action {
  label: string;
  onPress: () => void;
}

interface Props {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: Action;
  secondaryAction?: Action;
}

export function EmptyState({ icon, title, description, action, secondaryAction }: Props) {
  return (
    <View className="items-center justify-center px-6 py-20">
      <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-6">
        {icon}
      </View>
      <Text className="text-xl font-bold text-text mb-2 text-center">{title}</Text>
      {description && (
        <Text className="text-muted-text text-center leading-relaxed max-w-[300px] mb-6">
          {description}
        </Text>
      )}
      {action && (
        <Button
          label={action.label}
          onPress={action.onPress}
          size="md"
        />
      )}
      {secondaryAction && (
        <Button
          label={secondaryAction.label}
          onPress={secondaryAction.onPress}
          variant="ghost"
          size="sm"
          className="mt-2"
        />
      )}
    </View>
  );
}
