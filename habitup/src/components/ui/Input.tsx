import React from 'react';
import { View, TextInput, Text, TextInputProps } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, style, multiline, ...rest }, ref) => {
    const message = error ?? hint;
    const { colors } = useThemeColors();
    return (
      <View className="mb-5">
        {label && (
          <Text className="text-sm font-semibold text-text mb-2">
            {label}
          </Text>
        )}
        <View
          className={`flex-row ${multiline ? 'items-start' : 'items-center'} bg-surface border rounded px-4 min-h-12 ${
            error ? 'border-error' : 'border-border'
          } ${className || ''}`}
        >
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <TextInput
            ref={ref}
            className={`flex-1 text-text text-base py-3 ${multiline ? 'min-h-28' : ''}`}
            placeholderTextColor={colors.mutedText}
            style={style}
            multiline={multiline}
            accessibilityLabel={rest.accessibilityLabel ?? label}
            accessibilityHint={error ? `Error: ${error}` : hint}
            {...rest}
          />
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </View>
        {message && <Text className={`text-sm mt-1.5 ${error ? 'text-error' : 'text-muted-text'}`}>{message}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';
