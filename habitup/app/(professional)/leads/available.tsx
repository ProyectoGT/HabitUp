import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { leadsService } from '@/services/leads.service';
import { LeadCard } from '@/components/leads';
import type { Lead } from '@/types/models';

export default function AvailableLeadsScreen() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await leadsService.getAvailableForProfessional();
      setLeads(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    }
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
        <Text className="text-xl font-bold text-gray-900">Leads disponibles</Text>
        <Text className="text-gray-500 text-sm mt-0.5">
          Solicitudes activas en tu zona y categorías
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center">{error}</Text>
          <TouchableOpacity onPress={load} className="mt-4">
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
              onPress={() => router.push(`/(professional)/leads/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-4xl mb-4">📭</Text>
              <Text className="text-gray-700 font-semibold text-base">Sin leads por ahora</Text>
              <Text className="text-gray-400 text-sm mt-1 text-center px-8">
                Cuando un cliente publique una solicitud en tu zona aparecerá aquí
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
