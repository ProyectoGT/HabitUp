import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { leadsService } from '@/services/leads.service';
import { LeadCard } from '@/components/leads';
import type { Lead, LeadStatus } from '@/types/models';
import { Screen } from '@/components/ui';
import { ClipboardList, Plus } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

type Filter = 'all' | 'pending' | 'accepted' | 'rejected' | 'completed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'accepted', label: 'Aceptadas' },
  { key: 'rejected', label: 'Rechazadas' },
  { key: 'completed', label: 'Completadas' },
];

const FILTER_STATUS_MAP: Record<Exclude<Filter, 'all'>, LeadStatus[]> = {
  pending: ['activo', 'en_negociacion'],
  accepted: ['asignado'],
  rejected: ['cancelado'],
  completed: ['cerrado'],
};

export default function ClientLeadsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const loadLeads = useCallback(async () => {
    try {
      setError(null);
      const data = await leadsService.getMyLeads();
      setLeads(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    }
  }, []);

  useEffect(() => {
    loadLeads().finally(() => setIsLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeads();
    setRefreshing(false);
  };

  const filtered =
    filter === 'all' ? leads : leads.filter((l) => FILTER_STATUS_MAP[filter].includes(l.status));

  return (
    <Screen safeArea={false} className="flex-1">
      {/* ── Header ── */}
      <View
        className="px-6 pb-4 z-10"
        style={{
          paddingTop: 60,
          backgroundColor: isDark ? '#1A1D29' : '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#2D3548' : '#E2E8F0',
          shadowColor: '#6366F1',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View className="flex-row items-center justify-between mb-5">
          <Text className="text-2xl font-extrabold text-text">Mis solicitudes</Text>
          <TouchableOpacity
            onPress={() => router.push('/(client)/leads/create')}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#6366F1',
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 12,
              shadowColor: '#6366F1',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Plus size={15} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Nueva</Text>
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -24 }}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
        >
          {FILTERS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setFilter(key)}
              activeOpacity={0.8}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: filter === key ? '#6366F1' : isDark ? '#1E2433' : '#F1F5F9',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: filter === key ? '#fff' : isDark ? '#94A3B8' : '#64748B',
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366F1" size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-error text-center bg-error/10 p-4 rounded-xl w-full">{error}</Text>
          <TouchableOpacity
            onPress={loadLeads}
            className="mt-4 py-3 px-6 border-2 border-primary rounded-2xl"
          >
            <Text className="text-primary font-semibold">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366F1"
              colors={['#6366F1']}
            />
          }
          renderItem={({ item }) => (
            <LeadCard lead={item} onPress={() => router.push(`/(client)/leads/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center mt-20">
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-6"
                style={{ backgroundColor: isDark ? '#1E2433' : '#F1F5F9' }}
              >
                <ClipboardList size={38} color={isDark ? '#64748B' : '#94A3B8'} strokeWidth={1.5} />
              </View>
              <Text className="text-text font-bold text-xl mb-2">
                {filter === 'all' ? 'Sin solicitudes todavía' : 'Sin resultados'}
              </Text>
              <Text className="text-muted-text text-center px-6 leading-relaxed">
                {filter === 'all'
                  ? 'Crea una solicitud para recibir presupuestos de los mejores profesionales.'
                  : 'No tienes solicitudes con este estado aún.'}
              </Text>
              {filter === 'all' && (
                <TouchableOpacity
                  onPress={() => router.push('/(client)/leads/create')}
                  activeOpacity={0.85}
                  style={{
                    marginTop: 28,
                    backgroundColor: '#6366F1',
                    paddingVertical: 14,
                    paddingHorizontal: 32,
                    borderRadius: 16,
                    shadowColor: '#6366F1',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                    Crear solicitud
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </Screen>
  );
}
