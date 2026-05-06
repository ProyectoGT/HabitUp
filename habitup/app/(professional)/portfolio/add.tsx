import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card } from '@/components/ui';
import { ArrowLeft, ImagePlus } from 'lucide-react-native';

export default function AddPortfolioItemScreen() {
  const router = useRouter();
  
  return (
    <Screen safeArea={false} className="flex-1">
      <View className="bg-surface px-6 pt-16 pb-6 shadow-sm shadow-primary/10 border-b border-border/50 rounded-b-3xl z-10">
        <TouchableOpacity onPress={() => router.back()} className="mb-4 flex-row items-center -ml-1">
          <ArrowLeft size={20} color="#6366F1" />
          <Text className="text-primary font-semibold text-base ml-2">Volver</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-extrabold text-text leading-tight mb-1">Añadir trabajo</Text>
        <Text className="text-muted-text text-sm font-medium">Sube fotos de tus mejores proyectos</Text>
      </View>

      <View className="px-6 pt-6">
        <Card variant="flat" className="border border-dashed border-border p-8 items-center justify-center">
          <View className="w-16 h-16 bg-primary/5 rounded-full items-center justify-center mb-4">
            <ImagePlus size={32} color="#6366F1" />
          </View>
          <Text className="text-lg font-bold text-text mb-2">Próximamente</Text>
          <Text className="text-muted-text text-center leading-relaxed">
            La funcionalidad para subir fotos y añadir descripciones a tu portfolio estará disponible en la próxima actualización.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
