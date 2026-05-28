import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useNotificationStore } from '@/stores/notificationStore';
import { Home, Search, ClipboardList, Briefcase, User, Bell } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

function TabIcon({ Icon, focused, color }: { Icon: any; focused: boolean; color: string }) {
  return (
    <View className="items-center justify-center mt-1">
      <Icon color={color} size={24} strokeWidth={focused ? 2.5 : 2} opacity={focused ? 1 : 0.6} />
    </View>
  );
}

function BellTabIcon({ focused, color }: { focused: boolean; color: string }) {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  return (
    <View className="items-center justify-center mt-1">
      <View className="relative">
        <Bell color={color} size={24} strokeWidth={focused ? 2.5 : 2} opacity={focused ? 1 : 0.6} />
        {unreadCount > 0 && (
          <View className="absolute -top-1 -right-2 bg-error rounded-full min-w-[16px] h-4 items-center justify-center px-1 border-2 border-surface">
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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366F1', // primary color
        tabBarInactiveTintColor: isDark ? '#94A3B8' : '#64748B', // mutedText
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: isDark ? '#1A1D29' : '#FFFFFF',
          borderTopColor: isDark ? '#2D3548' : '#E2E8F0',
          paddingBottom: 8,
          height: 65,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused, color }) => <TabIcon Icon={Home} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Explorar',
          tabBarIcon: ({ focused, color }) => <TabIcon Icon={Search} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leads/index"
        options={{
          title: 'Solicitudes',
          tabBarIcon: ({ focused, color }) => <TabIcon Icon={ClipboardList} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects/index"
        options={{
          title: 'Proyectos',
          tabBarIcon: ({ focused, color }) => <TabIcon Icon={Briefcase} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused, color }) => <TabIcon Icon={User} focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}

