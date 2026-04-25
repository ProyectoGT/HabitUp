import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Project } from '@/types/models';

const STATUS_STYLE: Record<string, { label: string; style: string }> = {
  pendiente:   { label: 'Pendiente',    style: 'bg-yellow-50 text-yellow-700' },
  en_curso:    { label: 'En curso',     style: 'bg-blue-50 text-brand' },
  pausado:     { label: 'Pausado',      style: 'bg-gray-100 text-gray-500' },
  completado:  { label: 'Completado',   style: 'bg-green-50 text-green-700' },
  cancelado:   { label: 'Cancelado',    style: 'bg-red-50 text-red-500' },
};

export default function ClientProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setProjects((data ?? []) as Project[]);
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-14 pb-4 shadow-sm">
        <Text className="text-xl font-bold text-gray-900">Mis proyectos</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#2563eb" /></View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pt-4 pb-10"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const st = STATUS_STYLE[item.status] ?? { label: item.status, style: 'bg-gray-100 text-gray-500' };
            return (
              <TouchableOpacity
                onPress={() => router.push(`/(client)/projects/${item.id}`)}
                className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100"
              >
                <View className="flex-row items-start justify-between mb-1">
                  <Text className="font-semibold text-gray-900 flex-1 mr-2" numberOfLines={1}>{item.title}</Text>
                  <Text className={`text-xs px-2 py-0.5 rounded-full ${st.style}`}>{st.label}</Text>
                </View>
                <Text className="text-brand font-bold mt-1">{formatCurrency(item.agreed_price)}</Text>
                <Text className="text-xs text-gray-400 mt-1">{formatDate(item.created_at)}</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-4xl mb-4">🔨</Text>
              <Text className="text-gray-500 text-center">Todavía no tienes proyectos activos</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
