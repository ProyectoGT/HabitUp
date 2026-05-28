import React from 'react';
import { Text, View } from 'react-native';

interface PriceTagProps {
  amount: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'range' | 'commission';
  amountMax?: number;
  className?: string;
}

const SIZE_CLASSES = {
  sm:  { amount: 'text-sm font-semibold', symbol: 'text-xs' },
  md:  { amount: 'text-base font-bold',   symbol: 'text-sm' },
  lg:  { amount: 'text-2xl font-bold',    symbol: 'text-lg' },
};

function formatAmount(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  return value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export const PriceTag = ({
  amount,
  currency = '€',
  size = 'md',
  variant = 'default',
  amountMax,
  className,
}: PriceTagProps) => {
  const sizeClass = SIZE_CLASSES[size];

  if (variant === 'range' && amountMax != null) {
    return (
      <View className={`flex-row items-baseline ${className ?? ''}`}>
        <Text className={`text-gray-900 ${sizeClass.amount}`}>
          {formatAmount(amount)}
        </Text>
        <Text className={`text-gray-500 ${sizeClass.symbol}`}>{currency}</Text>
        <Text className="text-gray-400 mx-1">–</Text>
        <Text className={`text-gray-900 ${sizeClass.amount}`}>
          {formatAmount(amountMax)}
        </Text>
        <Text className={`text-gray-500 ${sizeClass.symbol}`}>{currency}</Text>
      </View>
    );
  }

  if (variant === 'commission') {
    return (
      <View className={`flex-row items-baseline ${className ?? ''}`}>
        <Text className={`text-coral-600 ${sizeClass.amount}`}>
          {formatAmount(amount)}
        </Text>
        <Text className={`text-coral-400 ${sizeClass.symbol}`}>{currency}</Text>
        <Text className="text-xs text-gray-400 ml-1">(comisión 10%)</Text>
      </View>
    );
  }

  return (
    <View className={`flex-row items-baseline ${className ?? ''}`}>
      <Text className={`text-gray-900 ${sizeClass.amount}`}>
        {formatAmount(amount)}
      </Text>
      <Text className={`text-gray-500 ${sizeClass.symbol}`}>{currency}</Text>
    </View>
  );
};
