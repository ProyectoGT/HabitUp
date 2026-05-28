import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

interface RatingStarsProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  onChange?: (rating: number) => void;
  showValue?: boolean;
  className?: string;
}

const SIZES = { sm: 14, md: 20, lg: 28 };

export const RatingStars = ({
  value,
  max = 5,
  size = 'md',
  readOnly = false,
  onChange,
  showValue = false,
  className,
}: RatingStarsProps) => {
  const starSize = SIZES[size];

  const renderStar = (index: number) => {
    const filled = index < Math.round(value);
    const star = filled ? '★' : '☆';
    const color = filled ? '#F59E0B' : '#D1D5DB';

    if (readOnly) {
      return (
        <Text
          key={index}
          style={{ fontSize: starSize, color, lineHeight: starSize + 4 }}
        >
          {star}
        </Text>
      );
    }

    return (
      <TouchableOpacity
        key={index}
        onPress={() => onChange?.(index + 1)}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <Text style={{ fontSize: starSize, color, lineHeight: starSize + 4 }}>
          {star}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className={`flex-row items-center ${className ?? ''}`}>
      {Array.from({ length: max }, (_, i) => renderStar(i))}
      {showValue && (
        <Text className="ml-1 text-sm text-gray-600 font-medium">
          {value > 0 ? value.toFixed(1) : '—'}
        </Text>
      )}
    </View>
  );
};
