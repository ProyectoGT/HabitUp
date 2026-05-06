import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator } from 'react-native';

export interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = ({
  label,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...rest
}: ButtonProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-surface border border-border';
      case 'outline':
        return 'bg-transparent border-2 border-primary';
      case 'ghost':
        return 'bg-transparent';
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
      case 'primary':
      default:
        return 'text-white';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'py-2 px-4 rounded-xl';
      case 'lg':
        return 'py-4 px-8 rounded-2xl';
      case 'md':
      default:
        return 'py-3 px-6 rounded-2xl';
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${getVariantStyles()} ${getSizeStyles()} ${
        isDisabled ? 'opacity-50' : 'opacity-100'
      } ${className || ''}`}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : '#6366F1'} className="mr-2" />
      ) : leftIcon ? (
        <>{leftIcon}</>
      ) : null}
      
      <Text className={`font-semibold text-center ${getTextStyles()} ${leftIcon ? 'ml-2' : ''} ${rightIcon ? 'mr-2' : ''}`}>
        {label}
      </Text>
      
      {!isLoading && rightIcon && <>{rightIcon}</>}
    </TouchableOpacity>
  );
};
