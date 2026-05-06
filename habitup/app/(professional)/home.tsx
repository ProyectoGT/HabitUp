import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Screen, Card, NotificationBell } from '@/components/ui';
import { Megaphone, Hammer, Image as ImageIcon, User, ChevronRight } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function ProfessionalHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Screen safeArea={false} className="flex-1">
      {/* Header */}
      <View className="bg-surface px-6 pt-16 pb-6 rounded-b-[32px] shadow-sm shadow-primary/10 z-10 border-b border-border/50 flex-row items-center justify-between">
        <View className="flex-1 mr-4">
          <Text className="text-2xl font-extrabold text-text">
            Hola, {user?.full_name?.split(' ')[0]} 👋
          </Text>
          <Text className="text-muted-text text-sm mt-1 font-medium">Gestiona tus leads y proyectos</Text>
        </View>
        <NotificationBell />
      </View>

      <ScrollView contentContainerClassName="px-6 pt-6 pb-20" showsVerticalScrollIndicator={false}>
        {/* Acceso rápido */}
        <Text className="text-lg font-bold text-text mb-4">Acceso rápido</Text>
        
        <View className="flex-row gap-4 mb-4">
          <QuickAction
            Icon={Megaphone}
            label="Ver leads"
            color="#6366F1"
            onPress={() => router.push('/(professional)/leads/available')}
          />
          <QuickAction
            Icon={Hammer}
            label="Mis proyectos"
            color="#10B981"
            onPress={() => router.push('/(professional)/projects')}
          />
        </View>

        <View className="flex-row gap-4 mb-8">
          <QuickAction
            Icon={ImageIcon}
            label="Mi portfolio"
            color="#F59E0B"
            onPress={() => router.push('/(professional)/portfolio')}
          />
          <QuickAction
            Icon={User}
            label="Mi perfil"
            color="#8B5CF6"
            onPress={() => router.push('/(professional)/profile')}
          />
        </View>

        {/* Banner promocional (placeholder estético) */}
        <Card className="bg-primary/5 border border-primary/20 p-5 overflow-hidden">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-primary font-bold text-lg mb-1">Mejora tu perfil</Text>
              <Text className="text-muted-text text-sm leading-relaxed mb-4">
                Los profesionales con fotos en su portfolio consiguen un 40% más de clientes.
              </Text>
              <TouchableOpacity 
                className="bg-primary px-4 py-2 rounded-xl self-start"
                onPress={() => router.push('/(professional)/portfolio')}
              >
                <Text className="text-white font-bold text-sm">Subir fotos</Text>
              </TouchableOpacity>
            </View>
            <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center">
              <ImageIcon size={32} color="#6366F1" />
            </View>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function QuickAction({
  Icon, label, onPress, color
}: {
  Icon: any; label: string; onPress: () => void; color: string;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Card
      onPress={onPress}
      variant="elevated"
      className="flex-1 p-4 items-center"
    >
      <View 
        className="w-14 h-14 rounded-full items-center justify-center mb-3"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={28} color={color} strokeWidth={1.5} />
      </View>
      <Text className="text-sm font-bold text-text text-center mb-1">{label}</Text>
    </Card>
  );
}
