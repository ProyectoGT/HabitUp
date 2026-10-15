import React from 'react';
import { View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  safeArea?: boolean;
}

export const Screen = ({ children, style, safeArea = true, className, ...rest }: ScreenProps) => {
  const content = (
    <View className={`flex-1 bg-background ${className || ''}`} style={style} {...rest}>
      {children}
    </View>
  );

  if (safeArea) {
    return <SafeAreaView className="flex-1 bg-background">{content}</SafeAreaView>;
  }

  return content;
};
