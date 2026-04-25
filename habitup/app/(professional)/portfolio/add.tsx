import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function AddPortfolioItemScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-white px-5 pt-14">
      <TouchableOpacity onPress={() => router.back()} className="mb-4">
        <Text className="text-brand">← Volver</Text>
      </TouchableOpacity>
      <Text className="text-xl font-bold text-gray-900 mb-2">Añadir trabajo</Text>
      <Text className="text-gray-400">Próximamente — subida de fotos y descripción</Text>
    </View>
  );
}
