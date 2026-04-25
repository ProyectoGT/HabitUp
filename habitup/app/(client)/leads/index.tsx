import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { leadsService } from '@/services/leads.service';
import { LeadCard } from '@/components/leads';
import type { Lead } from '@/types/models';

export default function ClientLeadsScreen() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-14 pb-4 shadow-sm flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-900">Mis solicitudes</Text>
        <TouchableOpacity
          onPress={() => router.push('/(client)/leads/create')}
          className="bg-brand px-4 py-2 rounded-xl"
        >
          <Text className="text-white font-semibold text-sm">+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center">{error}</Text>
          <TouchableOpacity onPress={loadLeads} className="mt-4">
            <Text className="text-brand font-medium">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pt-4 pb-10"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <LeadCard
              lead={item}
              onPress={() => router.push(`/(client)/leads/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-4xl mb-4">📋</Text>
              <Text className="text-gray-700 font-semibold text-base">Sin solicitudes todavía</Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">
                Crea una solicitud para recibir presupuestos de profesionales
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(client)/leads/create')}
                className="bg-brand mt-6 px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">Crear solicitud</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}
