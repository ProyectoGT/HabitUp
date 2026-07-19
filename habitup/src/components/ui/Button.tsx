import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

export interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  textClassName?: string;
}

export const Button = ({
  label,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  textClassName,
  disabled,
  ...rest
}: ButtonProps) => {
  const { colors } = useThemeColors();
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-surface border border-border';
      case 'outline':
        return 'bg-transparent border-2 border-primary';
      case 'ghost':
        return 'bg-transparent';
      case 'destructive':
        return 'bg-error';
      case 'primary':
      default:
        return 'bg-primary';
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'text-text';
      case 'outline':
      case 'ghost':
        return 'text-primary';
      case 'destructive':
        return 'text-on-primary';
      case 'primary':
      default:
        return 'text-on-primary';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'min-h-11 py-2 px-4 rounded';
      case 'lg':
        return 'min-h-14 py-3 px-6 rounded';
      case 'md':
      default:
        return 'min-h-12 py-3 px-5 rounded';
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      className={`flex-row items-center justify-center ${getVariantStyles()} ${getSizeStyles()} ${
        isDisabled ? 'opacity-50' : 'opacity-100'
      } ${className || ''}`}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'destructive' ? colors.onPrimary : colors.primary} className="mr-2" />
      ) : leftIcon ? (
        <>{leftIcon}</>
      ) : null}
      
      <Text className={`font-semibold text-center ${getTextStyles()} ${leftIcon ? 'ml-2' : ''} ${rightIcon ? 'mr-2' : ''} ${textClassName || ''}`}>
        {label}
      </Text>
      
      {!isLoading && rightIcon && <>{rightIcon}</>}
    </TouchableOpacity>
  );
};
