import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function PortfolioScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-14 pb-4 shadow-sm flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-900">Mi portfolio</Text>
        <TouchableOpacity
          onPress={() => router.push('/(professional)/portfolio/add')}
          className="bg-brand px-4 py-2 rounded-xl"
        >
          <Text className="text-white font-semibold text-sm">+ Añadir</Text>
        </TouchableOpacity>
      </View>
      <View className="flex-1 items-center justify-center">
        <Text className="text-4xl mb-4">🖼️</Text>
        <Text className="text-gray-500 text-center px-8">
          Añade fotos de tus trabajos anteriores para ganar más presupuestos
        </Text>
      </View>
    </View>
  );
}
