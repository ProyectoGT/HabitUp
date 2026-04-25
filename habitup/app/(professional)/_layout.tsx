import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useNotificationStore } from '@/stores/notificationStore';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text className={focused ? 'text-xl' : 'text-xl opacity-50'}>{emoji}</Text>;
}

function BellTabIcon({ focused }: { focused: boolean }) {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  return (
    <View className="relative items-center justify-center">
      <Text className={focused ? 'text-xl' : 'text-xl opacity-50'}>🔔</Text>
      {unreadCount > 0 && (
        <View className="absolute -top-1 -right-2 bg-red-500 rounded-full min-w-[14px] h-3.5 items-center justify-center px-0.5">
          <Text className="text-white text-[9px] font-bold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function ProfessionalLayout() {
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
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="leads/available"
        options={{
          title: 'Leads',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📢" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="projects/index"
        options={{
          title: 'Proyectos',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔨" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="portfolio/index"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🖼️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
