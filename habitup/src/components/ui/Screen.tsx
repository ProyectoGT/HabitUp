import React from 'react';
import { View, ViewProps, SafeAreaView } from 'react-native';

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
