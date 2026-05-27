import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Project } from '@/types/models';
import { Screen, Card, Badge, LoadingState, EmptyState } from '@/components/ui';
import { Hammer, Calendar, CircleDollarSign } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const STATUS_STYLE: Record<string, { label: string; variant: 'warning' | 'info' | 'default' | 'success' | 'error' }> = {
  pendiente:   { label: 'Pendiente',    variant: 'warning' },
  en_curso:    { label: 'En curso',     variant: 'info' },
  pendiente_finalizacion: { label: 'Pendiente de confirmación', variant: 'warning' },
  pausado:     { label: 'Pausado',      variant: 'default' },
  completado:  { label: 'Completado',   variant: 'success' },
  cancelado:   { label: 'Cancelado',    variant: 'error' },
};

export default function ClientProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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
    <Screen safeArea={false} className="flex-1">
      <View className="bg-surface px-6 pt-16 pb-6 rounded-b-3xl shadow-sm shadow-primary/10 z-10 border-b border-border/50">
        <Text className="text-2xl font-extrabold text-text">Mis proyectos</Text>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pt-6 pb-10"
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#6366F1" 
              colors={['#6366F1']} 
            />
          }
          renderItem={({ item }) => {
            const st = STATUS_STYLE[item.status] ?? { label: item.status, variant: 'default' };
            return (
              <Card
                onPress={() => router.push(`/(client)/projects/${item.id}`)}
                className="mb-4"
              >
                <View className="flex-row items-start justify-between mb-3">
                  <Text className="text-lg font-bold text-text flex-1 mr-3 leading-tight" numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Badge label={st.label} variant={st.variant} />
                </View>

                <View className="flex-row items-center justify-between border-t border-border/50 pt-3">
                  <View className="flex-row items-center">
                    <CircleDollarSign size={16} color="#10B981" />
                    <Text className="text-success font-bold ml-1.5">{formatCurrency(item.agreed_price)}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Calendar size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                    <Text className="text-xs font-medium text-muted-text ml-1.5">{formatDate(item.created_at)}</Text>
                  </View>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<Hammer size={40} color="#6366F1" />}
              title="Sin proyectos activos"
              description="Cuando aceptes un presupuesto de un profesional, aparecerá aquí."
            />
          }
        />
      )}
    </Screen>
  );
}
