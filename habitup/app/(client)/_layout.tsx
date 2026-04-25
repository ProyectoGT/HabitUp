import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useNotificationStore } from '@/stores/notificationStore';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center">
      <Text className={focused ? 'text-xl' : 'text-xl opacity-50'}>{emoji}</Text>
    </View>
  );
}

function BellTabIcon({ focused }: { focused: boolean }) {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  return (
    <View className="items-center">
      <View className="relative">
        <Text className={focused ? 'text-xl' : 'text-xl opacity-50'}>🔔</Text>
        {unreadCount > 0 && (
          <View className="absolute -top-1 -right-2 bg-red-500 rounded-full min-w-[14px] h-3.5 items-center justify-center px-0.5">
            <Text className="text-white text-[9px] font-bold leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarShowLabel: true,
        tabBarStyle: { paddingBottom: 4, height: 60 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Inicio" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" label="Buscar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="leads/index"
        options={{
          title: 'Solicitudes',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Solicitudes" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="projects/index"
        options={{
          title: 'Proyectos',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔨" label="Proyectos" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Perfil" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
