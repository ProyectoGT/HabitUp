import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { leadsService } from '@/services/leads.service';
import { LeadCard } from '@/components/leads';
import type { Lead } from '@/types/models';
import { Screen, Button } from '@/components/ui';
import { ClipboardList, Plus } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function ClientLeadsScreen() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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
    <Screen safeArea={false} className="flex-1">
      <View className="bg-surface px-6 pt-16 pb-4 rounded-b-3xl shadow-sm shadow-primary/10 z-10 border-b border-border/50 flex-row items-center justify-between">
        <Text className="text-2xl font-extrabold text-text">Mis solicitudes</Text>
        <Button
          label="Nueva"
          leftIcon={<Plus size={16} color="#FFF" />}
          onPress={() => router.push('/(client)/leads/create')}
          size="sm"
          className="shadow-sm shadow-primary/30"
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366F1" size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-error text-center bg-error/10 p-4 rounded-xl w-full">{error}</Text>
          <Button label="Reintentar" variant="outline" onPress={loadLeads} className="mt-4" />
        </View>
      ) : (
        <FlatList
          data={leads}
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
          renderItem={({ item }) => (
            <LeadCard
              lead={item}
              onPress={() => router.push(`/(client)/leads/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center mt-20">
              <View className="w-20 h-20 bg-border/30 rounded-full items-center justify-center mb-6">
                <ClipboardList size={40} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={1.5} />
              </View>
              <Text className="text-text font-bold text-xl mb-2">Sin solicitudes todavía</Text>
              <Text className="text-muted-text text-center px-4 leading-relaxed">
                Crea una solicitud para recibir presupuestos de los mejores profesionales.
              </Text>
              <Button
                label="Crear solicitud"
                onPress={() => router.push('/(client)/leads/create')}
                className="mt-8 px-8 shadow-sm shadow-primary/30"
                size="lg"
              />
            </View>
          }
        />
      )}
    </Screen>
  );
}
