import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Button } from '@/components/ui';
import { Image as ImageIcon, Plus, ArrowLeft } from 'lucide-react-native';

export default function PortfolioScreen() {
  const router = useRouter();
  
  return (
    <Screen safeArea={false} className="flex-1">
      <View className="bg-surface px-6 pt-16 pb-6 shadow-sm shadow-primary/10 border-b border-border/50 rounded-b-3xl z-10 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Button 
            variant="ghost" 
            onPress={() => router.back()} 
            className="p-2 -ml-2 mr-2"
            label=""
            leftIcon={<ArrowLeft size={24} color="#6366F1" />}
          />
          <Text className="text-2xl font-extrabold text-text">Mi portfolio</Text>
        </View>
        <Button
          label="Añadir"
          onPress={() => router.push('/(professional)/portfolio/add')}
          size="sm"
          leftIcon={<Plus size={16} color="#FFF" />}
          className="shadow-sm shadow-primary/30"
        />
      </View>

      <View className="flex-1 items-center justify-center py-20 px-6">
        <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-6">
          <ImageIcon size={40} color="#6366F1" strokeWidth={1.5} />
        </View>
        <Text className="text-xl font-bold text-text mb-2 text-center">Sin trabajos publicados</Text>
        <Text className="text-muted-text text-center leading-relaxed">
          Añade fotos de tus trabajos anteriores para ganar más presupuestos y destacar frente a otros profesionales.
        </Text>
      </View>
    </Screen>
  );
}
