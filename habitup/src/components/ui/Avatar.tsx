import React from 'react';
import { View, Text, Image, ViewProps } from 'react-native';

export interface AvatarProps extends ViewProps {
  url?: string | null;
  fallback: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Avatar = ({ url, fallback, size = 'md', className, style, ...rest }: AvatarProps) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8 rounded-full';
      case 'lg':
        return 'w-16 h-16 rounded-full';
      case 'xl':
        return 'w-24 h-24 rounded-full';
      case 'md':
      default:
        return 'w-12 h-12 rounded-full';
    }
  };

  const getTextSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-xl';
      case 'xl':
        return 'text-2xl';
      case 'md':
      default:
        return 'text-base';
    }
  };

  const fallbackInitial = fallback ? fallback.charAt(0).toUpperCase() : '?';

  return (
    <View
      className={`items-center justify-center bg-primary/20 overflow-hidden ${getSizeStyles()} ${className || ''}`}
      style={style}
      {...rest}
    >
      {url ? (
        <Image source={{ uri: url }} className="w-full h-full" resizeMode="cover" />
      ) : (
        <Text className={`font-semibold text-primary ${getTextSizeStyles()}`}>{fallbackInitial}</Text>
      )}
    </View>
  );
};
