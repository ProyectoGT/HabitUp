import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Megaphone, Briefcase, Image as ImageIcon, User } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

function TabIcon({ Icon, focused, color }: { Icon: any; focused: boolean; color: string }) {
  return (
    <View className="items-center justify-center mt-1">
      <Icon color={color} size={24} strokeWidth={focused ? 2.5 : 2} opacity={focused ? 1 : 0.6} />
    </View>
  );
}

export default function ProfessionalLayout() {
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
        name="leads/available"
        options={{
          title: 'Leads',
          tabBarIcon: ({ focused, color }) => <TabIcon Icon={Megaphone} focused={focused} color={color} />,
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
        name="portfolio/index"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ focused, color }) => <TabIcon Icon={ImageIcon} focused={focused} color={color} />,
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
