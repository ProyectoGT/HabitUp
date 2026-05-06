import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { NotificationBell, Screen, Card } from '@/components/ui';
import { Search, ClipboardList, FolderOpen, Hammer } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function ClientHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Screen safeArea={false} className="flex-1">
      {/* Header */}
      <View className="bg-surface px-6 pt-16 pb-6 rounded-b-3xl shadow-sm shadow-primary/10 z-10 border-b border-border/50">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-extrabold text-text">
              Hola, {user?.full_name?.split(' ')[0]} 👋
            </Text>
            <Text className="text-muted-text text-base mt-1 font-medium">¿Qué necesitas reformar hoy?</Text>
          </View>
          <NotificationBell />
        </View>
      </View>

      <ScrollView contentContainerClassName="px-6 pt-6 pb-20" showsVerticalScrollIndicator={false}>
        <Text className="text-lg font-bold text-text mb-4">Acceso rápido</Text>
        
        <View className="flex-row gap-4 mb-4">
          <QuickAction
            Icon={Search}
            label="Buscar profesional"
            onPress={() => router.push('/(client)/search')}
            isDark={isDark}
          />
          <QuickAction
            Icon={ClipboardList}
            label="Nueva solicitud"
            onPress={() => router.push('/(client)/leads/create')}
            isDark={isDark}
            primary
          />
        </View>

        <View className="flex-row gap-4 mb-8">
          <QuickAction
            Icon={FolderOpen}
            label="Mis solicitudes"
            onPress={() => router.push('/(client)/leads')}
            isDark={isDark}
          />
          <QuickAction
            Icon={Hammer}
            label="Mis proyectos"
            onPress={() => router.push('/(client)/projects')}
            isDark={isDark}
          />
        </View>

        {/* Placeholder for Activity/Recommendations */}
        <Text className="text-lg font-bold text-text mb-4">Actividad reciente</Text>
        <Card variant="outlined" className="items-center justify-center py-10 border-dashed border-2 border-border bg-transparent">
          <Text className="text-muted-text font-medium text-center">No hay actividad reciente.</Text>
          <Text className="text-muted-text text-sm text-center mt-2">Crea una nueva solicitud para empezar.</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function QuickAction({
  Icon, label, onPress, isDark, primary
}: {
  Icon: any; label: string; onPress: () => void; isDark: boolean; primary?: boolean;
}) {
  return (
    <Card 
      onPress={onPress}
      variant={primary ? 'elevated' : 'outlined'}
      className={`flex-1 items-center p-5 ${primary ? 'bg-primary border-primary' : 'bg-surface'}`}
    >
      <View className={`w-12 h-12 rounded-full items-center justify-center mb-3 ${primary ? 'bg-white/20' : 'bg-primary/10'}`}>
        <Icon size={24} color={primary ? '#FFFFFF' : '#6366F1'} strokeWidth={2} />
      </View>
      <Text className={`text-sm font-semibold text-center ${primary ? 'text-white' : 'text-text'}`}>
        {label}
      </Text>
    </Card>
  );
}
