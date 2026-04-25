import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { leadsService } from '@/services/leads.service';
import { quotesService } from '@/services/quotes.service';
import { formatCurrency, formatRelativeTime, formatDate } from '@/utils/formatters';
import type { Lead, Quote } from '@/types/models';

type QuoteWithProfile = Quote & {
  professional_profiles?: {
    company_name: string | null;
    avg_rating: number;
    location_city: string | null;
    users: { full_name: string; avatar_url: string | null };
  };
};

export default function ClientLeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [lead, setLead] = useState<Lead | null>(null);
  const [quotes, setQuotes] = useState<QuoteWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [l, q] = await Promise.all([
      leadsService.getById(id),
      quotesService.getQuotesForLead(id),
    ]);
    setLead(l);
    setQuotes(q as QuoteWithProfile[]);
  }, [id]);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onAcceptQuote = (quote: QuoteWithProfile) => {
    Alert.alert(
      'Aceptar presupuesto',
      `¿Confirmas el presupuesto de ${formatCurrency(quote.amount)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar', onPress: async () => {
            await quotesService.accept(quote.id);
            await load();
          },
        },
      ],
    );
  };

  const onRejectQuote = (quote: QuoteWithProfile) => {
    Alert.alert('Rechazar presupuesto', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar', style: 'destructive', onPress: async () => {
          await quotesService.reject(quote.id);
          await load();
        },
      },
    ]);
  };

  const onCancelLead = () => {
    Alert.alert('Cancelar solicitud', '¿Quieres cancelar esta solicitud?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar', style: 'destructive', onPress: async () => {
          await leadsService.cancel(id);
          router.replace('/(client)/leads');
        },
      },
    ]);
  };

  if (isLoading) return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#2563eb" /></View>;
  if (!lead) return <View className="flex-1 items-center justify-center"><Text className="text-gray-500">Solicitud no encontrada</Text></View>;

  const canInteract = lead.status === 'activo' || lead.status === 'en_negociacion';

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerClassName="pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="bg-white px-5 pt-14 pb-5 shadow-sm">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-brand">← Volver</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">{lead.title}</Text>
          <Text className="text-sm text-gray-500 mt-1">{formatDate(lead.created_at)}</Text>
        </View>

        {/* Detalle */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
          <Text className="text-gray-700 leading-6 mb-4">{lead.description}</Text>
          <View className="flex-row flex-wrap gap-3">
            {lead.location_city && <Chip emoji="📍" text={lead.location_city} />}
            {lead.budget_max && <Chip emoji="💰" text={`hasta ${formatCurrency(lead.budget_max)}`} />}
            {lead.preferred_start_date && <Chip emoji="📅" text={formatDate(lead.preferred_start_date)} />}
          </View>
        </View>

        {/* Presupuestos */}
        <View className="mx-4 mt-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Presupuestos recibidos ({quotes.length})
          </Text>

          {quotes.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center shadow-sm">
              <Text className="text-3xl mb-2">⏳</Text>
              <Text className="text-gray-500 text-center">Aún no has recibido presupuestos</Text>
            </View>
          ) : (
            quotes.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                canInteract={canInteract}
                onAccept={() => onAcceptQuote(quote)}
                onReject={() => onRejectQuote(quote)}
              />
            ))
          )}
        </View>

        {/* Cancelar */}
        {canInteract && (
          <TouchableOpacity onPress={onCancelLead} className="mx-4 mt-6 border border-red-300 py-3 rounded-xl items-center">
            <Text className="text-red-500 font-medium">Cancelar solicitud</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function QuoteCard({
  quote, canInteract, onAccept, onReject,
}: {
  quote: QuoteWithProfile;
  canInteract: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const pro = quote.professional_profiles;
  const name = pro?.company_name ?? pro?.users?.full_name ?? 'Profesional';
  const STATUS_STYLE: Record<string, string> = {
    enviado: 'bg-blue-50 text-brand',
    visto: 'bg-yellow-50 text-yellow-700',
    aceptado: 'bg-green-50 text-green-700',
    rechazado: 'bg-red-50 text-red-500',
    expirado: 'bg-gray-100 text-gray-400',
  };

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-semibold text-gray-900">{name}</Text>
        <Text className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[quote.status] ?? 'bg-gray-100 text-gray-500'}`}>
          {quote.status}
        </Text>
      </View>

      {pro && (
        <View className="flex-row items-center gap-2 mb-3">
          <Text className="text-amber-400 text-sm">★ {pro.avg_rating.toFixed(1)}</Text>
          {pro.location_city && <Text className="text-gray-400 text-xs">· {pro.location_city}</Text>}
        </View>
      )}

      <Text className="text-2xl font-bold text-brand mb-1">{formatCurrency(quote.amount)}</Text>

      {quote.delivery_days && (
        <Text className="text-sm text-gray-500 mb-1">⏱ {quote.delivery_days} días estimados</Text>
      )}
      {quote.description && (
        <Text className="text-sm text-gray-600 mb-3" numberOfLines={3}>{quote.description}</Text>
      )}

      {canInteract && quote.status === 'enviado' && (
        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity onPress={onReject} className="flex-1 border border-gray-300 py-2.5 rounded-xl items-center">
            <Text className="text-gray-600 font-medium text-sm">Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onAccept} className="flex-1 bg-brand py-2.5 rounded-xl items-center">
            <Text className="text-white font-semibold text-sm">Aceptar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function Chip({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View className="flex-row items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-full">
      <Text className="text-sm">{emoji}</Text>
      <Text className="text-sm text-gray-600">{text}</Text>
    </View>
  );
}
