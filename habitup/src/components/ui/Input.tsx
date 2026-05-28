import React from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ label, error, leftIcon, rightIcon, className, style, ...rest }, ref) => {
    return (
      <View className="mb-4">
        {label && (
          <Text className="text-sm font-medium text-text mb-1.5 ml-1">
            {label}
          </Text>
        )}
        <View
          className={`flex-row items-center bg-input-background border rounded-2xl px-4 py-3 ${
            error ? 'border-error' : 'border-border'
          } ${className || ''}`}
        >
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <TextInput
            ref={ref}
            className="flex-1 text-text text-base"
            placeholderTextColor="#94A3B8"
            style={style}
            {...rest}
          />
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </View>
        {error && (
          <Text className="text-xs text-error mt-1.5 ml-1">{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';
