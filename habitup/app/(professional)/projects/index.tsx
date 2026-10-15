import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { projectsService } from '@/services/projects.service';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Project } from '@/types/models';
import { Screen, Card, Badge, LoadingState, EmptyState } from '@/components/ui';
import { Hammer, ArrowLeft, Calendar, CircleDollarSign } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const STATUS_STYLE: Record<string, { label: string; variant: 'warning' | 'info' | 'default' | 'success' | 'error' }> = {
  pendiente:   { label: 'Pendiente',    variant: 'warning' },
  en_curso:    { label: 'En curso',     variant: 'info' },
  pendiente_finalizacion: { label: 'Pendiente de confirmación', variant: 'warning' },
  pausado:     { label: 'Pausado',      variant: 'default' },
  completado:  { label: 'Completado',   variant: 'success' },
  cancelado:   { label: 'Cancelado',    variant: 'error' },
};

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Activas' },
  { key: 'completed', label: 'Completadas' },
  { key: 'cancelled', label: 'Canceladas' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

const ACTIVE_STATUSES = ['pendiente', 'en_curso', 'pendiente_finalizacion', 'pausado'];

function matchFilter(project: Project, filter: FilterKey): boolean {
  switch (filter) {
    case 'all': return true;
    case 'active': return ACTIVE_STATUSES.includes(project.status);
    case 'completed': return project.status === 'completado';
    case 'cancelled': return project.status === 'cancelado';
  }
}

export default function ProfessionalProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const load = useCallback(async () => {
    const data = await projectsService.getMyProjects();
    setProjects(data);
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(
    () => projects.filter((p) => matchFilter(p, activeFilter)),
    [projects, activeFilter],
  );

  return (
    <Screen safeArea={false} className="flex-1">
      <View className="bg-surface px-6 pt-16 pb-4 shadow-sm shadow-primary/10 border-b border-border/50 rounded-b-3xl z-10">
        <TouchableOpacity onPress={() => router.back()} className="mb-4 flex-row items-center -ml-1">
          <ArrowLeft size={20} color="#6366F1" />
          <Text className="text-primary font-semibold text-base ml-2">Volver</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-extrabold text-text leading-tight mb-1">Mis proyectos</Text>
        <Text className="text-muted-text text-sm font-medium">Gestiona tus trabajos en curso y finalizados</Text>

        {/* Filtros */}
        <View className="flex-row gap-2 mt-4">
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            const count = f.key === 'all'
              ? projects.length
              : projects.filter((p) => matchFilter(p, f.key)).length;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
                className={`px-4 py-2 rounded-full border flex-row items-center gap-1.5 ${
                  isActive ? 'bg-primary border-primary' : 'bg-surface border-border'
                }`}
              >
                <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-muted-text'}`}>
                  {f.label}
                </Text>
                <View className={`min-w-[18px] h-[18px] rounded-full items-center justify-center px-1 ${
                  isActive ? 'bg-white/20' : 'bg-border/50'
                }`}>
                  <Text className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-muted-text'}`}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pt-6 pb-10 flex-grow"
          showsVerticalScrollIndicator={false}
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
                onPress={() => router.push(`/(professional)/projects/${item.id}`)}
                className="mb-4"
              >
                <View className="flex-row items-start justify-between mb-3 border-b border-border/50 pb-3">
                  <Text className="text-base font-bold text-text flex-1 mr-2" numberOfLines={1}>{item.title}</Text>
                  <Badge label={st.label} variant={st.variant} size="sm" />
                </View>
                
                <View className="flex-row justify-between items-end mt-2">
                  <View>
                    <View className="flex-row items-center mb-1">
                      <CircleDollarSign size={14} color="#6366F1" />
                      <Text className="text-sm font-extrabold text-primary ml-1.5">{formatCurrency(item.agreed_price)}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Calendar size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                      <Text className="text-xs font-medium text-muted-text ml-1.5">{formatDate(item.created_at)}</Text>
                    </View>
                  </View>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<Hammer size={40} color="#6366F1" />}
              title="Sin proyectos activos"
              description={activeFilter === 'all' ? 'Aquí aparecerán los proyectos en los que el cliente haya aceptado tu presupuesto.' : 'No hay proyectos en esta categoría.'}
            />
          }
        />
      )}
    </Screen>
  );
}
