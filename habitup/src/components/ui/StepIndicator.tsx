import { View } from 'react-native';

interface Props {
  total: number;
  current: number;
}

export function StepIndicator({ total, current }: Props) {
  return (
    <View className="flex-row gap-2 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`h-1.5 rounded-full ${i <= current ? 'bg-brand w-8' : 'bg-gray-200 w-4'}`}
        />
      ))}
    </View>
  );
}
