import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { leadsService } from '@/services/leads.service';
import { quotesService } from '@/services/quotes.service';
import { supabase } from '@/services/supabase';
import { LeadCard } from '@/components/leads';
import { formatCurrency } from '@/utils/formatters';
import type { Lead, Quote } from '@/types/models';
import { Screen, LoadingState, EmptyState, ErrorState } from '@/components/ui';
import { ArrowLeft, Inbox, Clock, AlertTriangle, DollarSign, ArrowUpDown } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

type SortMode = 'newest' | 'urgent' | 'budget';

const SORT_OPTIONS: { key: SortMode; label: string; Icon: any }[] = [
  { key: 'newest', label: 'Nuevos', Icon: Clock },
  { key: 'urgent', label: 'Urgentes', Icon: AlertTriangle },
  { key: 'budget', label: 'Presupuesto', Icon: DollarSign },
];

function sortLeads(leads: Lead[], mode: SortMode): Lead[] {
  const copy = [...leads];
  switch (mode) {
    case 'newest':
      return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'urgent': {
      const order: Record<string, number> = { alta: 0, media: 1, baja: 2 };
      return copy.sort((a, b) => (order[a.urgency] ?? 1) - (order[b.urgency] ?? 1));
    }
    case 'budget':
      return copy.sort((a, b) => (b.budget_max ?? 0) - (a.budget_max ?? 0));
  }
}

export default function AvailableLeadsScreen() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotedLeadIds, setQuotedLeadIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const load = useCallback(async () => {
    try {
      setError(null);
      const [data, myQuotes] = await Promise.all([
        leadsService.getAvailableForProfessional(),
        quotesService.getMyQuotes(),
      ]);
      setLeads(data);
      setQuotedLeadIds(new Set(myQuotes.map((q: Quote) => q.lead_id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('available-leads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `status=eq.activo`,
        },
        () => {
          load();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const sorted = useMemo(() => sortLeads(leads, sortMode), [leads, sortMode]);

  return (
    <Screen safeArea={false} className="flex-1">
      <View className="bg-surface px-6 pt-16 pb-4 shadow-sm shadow-primary/10 border-b border-border/50 rounded-b-3xl z-10">
        <TouchableOpacity onPress={() => router.back()} className="mb-4 flex-row items-center -ml-1">
          <ArrowLeft size={20} color="#6366F1" />
          <Text className="text-primary font-semibold text-base ml-2">Volver</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-extrabold text-text leading-tight mb-1">Leads disponibles</Text>
        <Text className="text-muted-text text-sm font-medium">
          Solicitudes activas en tu zona y categorías
        </Text>

        {/* Sort controls */}
        <View className="flex-row gap-2 mt-4">
          {SORT_OPTIONS.map((opt) => {
            const isActive = sortMode === opt.key;
            const Icon = opt.Icon;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setSortMode(opt.key)}
                activeOpacity={0.7}
                className={`px-3 py-2 rounded-full border flex-row items-center gap-1.5 ${
                  isActive ? 'bg-primary border-primary' : 'bg-surface border-border'
                }`}
              >
                <Icon size={14} color={isActive ? '#FFF' : (isDark ? '#94A3B8' : '#64748B')} />
                <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-muted-text'}`}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          data={sorted}
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
              hasQuoted={quotedLeadIds.has(item.id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<Inbox size={40} color="#6366F1" />}
              title="Sin leads por ahora"
              description="Cuando un cliente publique una solicitud que encaje con tu perfil, aparecerá aquí."
            />
          }
        />
      )}
    </Screen>
  );
}
