import React from 'react';
import { View, ViewProps, TouchableOpacity } from 'react-native';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'flat';
}

export const Card = ({ children, style, className, onPress, variant = 'elevated', ...rest }: CardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return 'bg-surface border border-border';
      case 'flat':
        return 'bg-surface';
      case 'elevated':
      default:
        // NativeWind shadow mapping can be tricky, using general classes and standard shadow
        return 'bg-surface shadow-sm border border-border/50';
    }
  };

  const content = (
    <View
      className={`rounded-2xl p-4 ${getVariantStyles()} ${className || ''}`}
      style={style}
      {...rest}
    >
      {children}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity activeOpacity={0.8} onPress={onPress}>{content}</TouchableOpacity>;
  }

  return content;
};
