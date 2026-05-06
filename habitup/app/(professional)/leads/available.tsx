import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { leadsService } from '@/services/leads.service';
import { LeadCard } from '@/components/leads';
import type { Lead } from '@/types/models';
import { Screen, Button } from '@/components/ui';
import { ArrowLeft, Inbox, SearchX } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function AvailableLeadsScreen() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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
    <Screen safeArea={false} className="flex-1">
      <View className="bg-surface px-6 pt-16 pb-6 shadow-sm shadow-primary/10 border-b border-border/50 rounded-b-3xl z-10">
        <TouchableOpacity onPress={() => router.back()} className="mb-4 flex-row items-center -ml-1">
          <ArrowLeft size={20} color="#6366F1" />
          <Text className="text-primary font-semibold text-base ml-2">Volver</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-extrabold text-text leading-tight mb-1">Leads disponibles</Text>
        <Text className="text-muted-text text-sm font-medium">
          Solicitudes activas en tu zona y categorías
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366F1" size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 bg-error/10 rounded-full items-center justify-center mb-4">
            <SearchX size={32} color="#EF4444" />
          </View>
          <Text className="text-error font-semibold text-center mb-6">{error}</Text>
          <Button label="Reintentar" onPress={load} variant="outline" className="min-w-[120px]" />
        </View>
      ) : (
        <FlatList
          data={leads}
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
          renderItem={({ item }) => (
            <LeadCard
              lead={item}
              onPress={() => router.push(`/(professional)/leads/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20 px-4">
              <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-6">
                <Inbox size={40} color="#6366F1" strokeWidth={1.5} />
              </View>
              <Text className="text-xl font-bold text-text mb-2 text-center">Sin leads por ahora</Text>
              <Text className="text-muted-text text-center leading-relaxed max-w-[280px]">
                Cuando un cliente publique una solicitud que encaje con tu perfil, aparecerá aquí.
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}
