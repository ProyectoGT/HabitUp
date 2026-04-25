import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { NotificationBell } from '@/components/ui';

export default function ProfessionalHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 pt-14 pb-4 shadow-sm flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-gray-900">
            Hola, {user?.full_name?.split(' ')[0]} 👋
          </Text>
          <Text className="text-gray-500 text-sm mt-0.5">Gestiona tus leads y proyectos</Text>
        </View>
        <NotificationBell />
      </View>

      <ScrollView contentContainerClassName="px-4 pt-5 pb-10">
        {/* Acceso rápido */}
        <Text className="text-base font-semibold text-gray-900 mb-3">Acceso rápido</Text>
        <View className="flex-row gap-3 mb-6">
          <QuickAction
            emoji="📢"
            label="Ver leads"
            onPress={() => router.push('/(professional)/leads/available')}
          />
          <QuickAction
            emoji="🔨"
            label="Mis proyectos"
            onPress={() => router.push('/(professional)/projects')}
          />
        </View>

        <View className="flex-row gap-3">
          <QuickAction
            emoji="🖼️"
            label="Mi portfolio"
            onPress={() => router.push('/(professional)/portfolio')}
          />
          <QuickAction
            emoji="👤"
            label="Mi perfil"
            onPress={() => router.push('/(professional)/profile')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function QuickAction({
  emoji, label, onPress,
}: {
  emoji: string; label: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm border border-gray-100"
    >
      <Text className="text-3xl mb-2">{emoji}</Text>
      <Text className="text-sm font-medium text-gray-700 text-center">{label}</Text>
    </TouchableOpacity>
  );
}
