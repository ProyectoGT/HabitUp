import { View } from 'react-native';

interface Props {
  total: number;
  current: number;
}

export function StepIndicator({ total, current }: Props) {
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: current + 1 }} className="flex-row gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`h-1.5 rounded-full flex-1 ${i <= current ? 'bg-primary' : 'bg-border'}`}
        />
      ))}
    </View>
  );
}
