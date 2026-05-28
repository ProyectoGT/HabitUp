import React from 'react';
import { View, Text, ViewProps } from 'react-native';

export interface BadgeProps extends ViewProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
}

export const Badge = ({ label, variant = 'default', size = 'sm', className, style, ...rest }: BadgeProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-success/20';
      case 'warning':
        return 'bg-warning/20';
      case 'error':
        return 'bg-error/20';
      case 'info':
        return 'bg-primary/20';
      case 'default':
      default:
        return 'bg-muted-text/20';
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'error':
        return 'text-error';
      case 'info':
        return 'text-primary';
      case 'default':
      default:
        return 'text-text';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 rounded-md';
      case 'md':
      default:
        return 'px-3 py-1 rounded-lg';
    }
  };

  const getTextSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'md':
      default:
        return 'text-sm';
    }
  };

  return (
    <View className={`self-start ${getVariantStyles()} ${getSizeStyles()} ${className || ''}`} style={style} {...rest}>
      <Text className={`font-medium ${getTextStyles()} ${getTextSizeStyles()}`}>{label}</Text>
    </View>
  );
};
