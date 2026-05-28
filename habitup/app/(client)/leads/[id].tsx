import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { leadsService } from '@/services/leads.service';
import { quotesService } from '@/services/quotes.service';
import { LEAD_STATUS, QUOTE_STATUS } from '@/utils/constants';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Lead, Quote } from '@/types/models';
import { Screen, Card, Badge, Button, LoadingState, NotFoundState, EmptyState, ErrorState } from '@/components/ui';
import { ArrowLeft, MapPin, CircleDollarSign, Calendar, Clock, Check, X, Inbox } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

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
  
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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
            const project = await quotesService.accept(quote.id);
            await load();
            if (project?.id) {
              router.replace(`/(client)/projects/${project.id}`);
            }
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

  if (isLoading) return (
    <Screen safeArea>
      <LoadingState />
    </Screen>
  );
  if (!lead) return (
    <Screen safeArea>
      <NotFoundState message="Solicitud no encontrada" onBack={() => router.back()} />
    </Screen>
  );

  const canInteract = lead.status === LEAD_STATUS.ACTIVE || lead.status === LEAD_STATUS.NEGOTIATING;

  return (
    <Screen safeArea={false} className="flex-1">
      <ScrollView
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#6366F1" 
            colors={['#6366F1']} 
          />
        }
      >
        {/* Header */}
        <View className="bg-surface px-6 pt-16 pb-6 shadow-sm shadow-primary/10 border-b border-border/50 rounded-b-3xl z-10">
          <TouchableOpacity onPress={() => router.back()} className="mb-4 flex-row items-center">
            <ArrowLeft size={20} color="#6366F1" />
            <Text className="text-primary font-semibold text-base ml-2">Volver</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-extrabold text-text mb-1 leading-tight">{lead.title}</Text>
          <Text className="text-muted-text text-sm font-medium">Publicado el {formatDate(lead.created_at)}</Text>
        </View>

        {/* Detalle */}
        <View className="px-6 pt-6 gap-6">
          <Card variant="flat" className="border border-border/50">
            <Text className="text-text leading-relaxed mb-5">{lead.description}</Text>
            <View className="flex-row flex-wrap gap-2 border-t border-border/50 pt-4">
              {lead.location_city && <Chip Icon={MapPin} text={lead.location_city} isDark={isDark} />}
              {lead.budget_max && <Chip Icon={CircleDollarSign} text={`Hasta ${formatCurrency(lead.budget_max)}`} isDark={isDark} />}
              {lead.preferred_start_date && <Chip Icon={Calendar} text={formatDate(lead.preferred_start_date)} isDark={isDark} />}
            </View>
          </Card>

          {/* Presupuestos */}
          <View>
            <Text className="text-lg font-bold text-text mb-4">
              Presupuestos recibidos ({quotes.length})
            </Text>

            {quotes.length === 0 ? (
              <EmptyState
                icon={<Inbox size={32} color="#6366F1" />}
                title="Aún no hay presupuestos"
                description="Los profesionales te enviarán ofertas pronto."
              />
            ) : (
              quotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  canInteract={canInteract}
                  onAccept={() => onAcceptQuote(quote)}
                  onReject={() => onRejectQuote(quote)}
                  isDark={isDark}
                />
              ))
            )}
          </View>

          {/* Cancelar */}
          {canInteract && (
            <Button
              label="Cancelar solicitud"
              variant="ghost"
              onPress={onCancelLead}
              className="mt-4 border border-error bg-error/10"
              textClassName="text-error"
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function QuoteCard({
  quote, canInteract, onAccept, onReject, isDark
}: {
  quote: QuoteWithProfile;
  canInteract: boolean;
  onAccept: () => void;
  onReject: () => void;
  isDark: boolean;
}) {
  const pro = quote.professional_profiles;
  const name = pro?.company_name ?? pro?.users?.full_name ?? 'Profesional';
  const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'error' | 'default'> = {
    enviado: 'info',
    visto: 'warning',
    aceptado: 'success',
    rechazado: 'error',
    expirado: 'default',
  };

  return (
    <Card className="mb-4">
      <View className="flex-row items-center justify-between mb-3 border-b border-border/50 pb-3">
        <Text className="text-base font-bold text-text flex-1 mr-2" numberOfLines={1}>{name}</Text>
        <Badge label={quote.status} variant={STATUS_VARIANT[quote.status] ?? 'default'} size="sm" />
      </View>

      <View className="flex-row justify-between items-end mb-4">
        <View>
          <Text className="text-3xl font-extrabold text-primary">{formatCurrency(quote.amount)}</Text>
        </View>
        
        {quote.delivery_days && (
          <View className="flex-row items-center bg-surface px-2 py-1 rounded-md border border-border">
            <Clock size={12} color={isDark ? '#94A3B8' : '#64748B'} />
            <Text className="text-xs font-medium text-muted-text ml-1.5">{quote.delivery_days} días est.</Text>
          </View>
        )}
      </View>

      {quote.description && (
        <Text className="text-sm text-muted-text mb-4 leading-relaxed bg-surface p-3 rounded-xl border border-border/30" numberOfLines={4}>
          {quote.description}
        </Text>
      )}

      {canInteract && quote.status === QUOTE_STATUS.SENT && (
        <View className="flex-row gap-3 mt-2 border-t border-border/50 pt-4">
          <Button
            label="Rechazar"
            variant="outline"
            onPress={onReject}
            className="flex-1"
            leftIcon={<X size={16} color={isDark ? '#F87171' : '#EF4444'} />}
          />
          <Button
            label="Aceptar"
            onPress={onAccept}
            className="flex-1 shadow-sm shadow-primary/30"
            leftIcon={<Check size={16} color="#FFF" />}
          />
        </View>
      )}
    </Card>
  );
}

function Chip({ Icon, text, isDark }: { Icon: any; text: string; isDark: boolean }) {
  return (
    <View className="flex-row items-center bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
      <Icon size={14} color="#6366F1" />
      <Text className="text-xs font-semibold text-primary ml-1.5">{text}</Text>
    </View>
  );
}
