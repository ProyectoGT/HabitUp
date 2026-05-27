import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { leadsService } from '@/services/leads.service';
import { quotesService } from '@/services/quotes.service';
import { LEAD_STATUS, QUOTE_STATUS } from '@/utils/constants';
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/formatters';
import type { Lead, Quote } from '@/types/models';
import { Screen, Card, Button, Input, Badge } from '@/components/ui';
import { ArrowLeft, MapPin, CircleDollarSign, Calendar, Clock, AlertTriangle, X, SendHorizontal, FileText, CheckCircle2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const quoteSchema = z.object({
  amount: z.coerce.number().positive('Indica un importe válido'),
  description: z.string().min(10, 'Añade más detalle a tu propuesta'),
  delivery_days: z.coerce.number().int().positive().optional(),
  includes_materials: z.boolean(),
  payment_terms: z.string().optional(),
});

type QuoteForm = z.infer<typeof quoteSchema>;

export default function ProfessionalLeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [lead, setLead] = useState<Lead | null>(null);
  const [myQuote, setMyQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting }, setError, watch, setValue } = useForm<QuoteForm>({
    resolver: zodResolver(quoteSchema) as Resolver<QuoteForm>,
    defaultValues: { includes_materials: true },
  });
  
  const includesMaterials = watch('includes_materials');

  const load = useCallback(async () => {
    const [l, quotes] = await Promise.all([
      leadsService.getById(id),
      quotesService.getMyQuotes(),
    ]);
    setLead(l);
    setMyQuote(quotes.find((q) => q.lead_id === id) ?? null);
  }, [id]);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, []);

  const onSendQuote = async (data: QuoteForm) => {
    try {
      await quotesService.create({ lead_id: id, ...data });
      setShowModal(false);
      await load();
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'Error al enviar presupuesto' });
    }
  };

  if (isLoading) return (
    <Screen safeArea className="items-center justify-center">
      <ActivityIndicator color="#6366F1" size="large" />
    </Screen>
  );
  
  if (!lead) return (
    <Screen safeArea className="items-center justify-center p-6">
      <Text className="text-muted-text text-lg text-center">Lead no encontrado</Text>
      <Button label="Volver" variant="outline" onPress={() => router.back()} className="mt-4" />
    </Screen>
  );

  const URGENCY_CONFIG: Record<string, { label: string; color: string; iconColor: string }> = { 
    alta: { label: 'Urgente', color: 'bg-error/10 text-error border-error/20', iconColor: '#EF4444' }, 
    media: { label: 'Normal', color: 'bg-warning/10 text-warning border-warning/20', iconColor: '#F59E0B' }, 
    baja: { label: 'Sin prisa', color: 'bg-success/10 text-success border-success/20', iconColor: '#10B981' } 
  };
  
  const urgencyCfg = URGENCY_CONFIG[lead.urgency] ?? { label: lead.urgency, color: 'bg-border/20 text-muted-text', iconColor: '#94A3B8' };

  return (
    <Screen safeArea={false} className="flex-1">
      <ScrollView contentContainerClassName="pb-32" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-surface px-6 pt-16 pb-6 shadow-sm shadow-primary/10 border-b border-border/50 rounded-b-3xl z-10">
          <TouchableOpacity onPress={() => router.back()} className="mb-4 flex-row items-center -ml-1">
            <ArrowLeft size={20} color="#6366F1" />
            <Text className="text-primary font-semibold text-base ml-2">Volver</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-extrabold text-text leading-tight mb-1">{lead.title}</Text>
          <Text className="text-muted-text text-sm font-medium">Publicado {formatRelativeTime(lead.created_at)}</Text>
        </View>

        {/* Detalle del lead */}
        <View className="px-6 pt-6 gap-6">
          <Card variant="flat" className="border border-border/50">
            <Text className="text-text leading-relaxed mb-5">{lead.description}</Text>
            
            <View className="flex-row flex-wrap gap-2 pt-4 border-t border-border/50">
              {lead.location_city && <InfoChip Icon={MapPin} label="Lugar" value={lead.location_city} />}
              {lead.budget_max && <InfoChip Icon={CircleDollarSign} label="Presupuesto" value={`Hasta ${formatCurrency(lead.budget_max)}`} />}
              {lead.preferred_start_date && <InfoChip Icon={Calendar} label="Inicio" value={formatDate(lead.preferred_start_date)} />}
              
              <View className={`flex-row items-center px-3 py-1.5 rounded-xl border ${urgencyCfg.color}`}>
                <AlertTriangle size={14} color={urgencyCfg.iconColor} />
                <Text className={`text-xs font-bold ml-1.5 ${urgencyCfg.color.split(' ')[1]}`}>{urgencyCfg.label}</Text>
              </View>
            </View>
          </Card>

          {/* Mi presupuesto enviado */}
          {myQuote && (
            <Card variant="elevated" className="border border-primary/20 bg-primary/5">
              <View className="flex-row items-center justify-between mb-4 border-b border-primary/10 pb-3">
                <Text className="font-bold text-primary text-base">Tu presupuesto enviado</Text>
                <Badge 
                  label={myQuote.status} 
                  variant={myQuote.status === QUOTE_STATUS.ACCEPTED ? 'success' : myQuote.status === QUOTE_STATUS.REJECTED ? 'error' : 'info'} 
                  size="sm"
                />
              </View>
              
              <View className="flex-row justify-between items-end mb-4">
                <Text className="text-3xl font-extrabold text-text">{formatCurrency(myQuote.amount)}</Text>
                {myQuote.delivery_days && (
                  <View className="flex-row items-center bg-surface px-2 py-1 rounded-md border border-border">
                    <Clock size={12} color={isDark ? '#94A3B8' : '#64748B'} />
                    <Text className="text-xs font-medium text-muted-text ml-1.5">{myQuote.delivery_days} días est.</Text>
                  </View>
                )}
              </View>
              
              {myQuote.description && (
                <View className="bg-surface p-3 rounded-xl border border-border/50">
                  <Text className="text-sm text-text leading-relaxed">{myQuote.description}</Text>
                </View>
              )}
            </Card>
          )}
        </View>
      </ScrollView>

      {/* CTA */}
      {!myQuote && lead.status === LEAD_STATUS.ACTIVE && (
        <View className="absolute bottom-0 left-0 right-0 bg-surface px-6 py-4 border-t border-border/50 shadow-lg shadow-black/10 z-20">
          <Button
            label="Crear presupuesto"
            onPress={() => setShowModal(true)}
            leftIcon={<FileText size={20} color="#FFF" />}
            size="lg"
            className="shadow-sm shadow-primary/30"
          />
        </View>
      )}

      {/* Modal de envío de presupuesto */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          className="flex-1 justify-end bg-black/60"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView className="bg-surface rounded-t-[32px]" contentContainerClassName="px-6 pt-6 pb-12" bounces={false}>
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-extrabold text-text">Nuevo presupuesto</Text>
              <TouchableOpacity 
                onPress={() => setShowModal(false)}
                className="w-10 h-10 bg-border/30 rounded-full items-center justify-center"
              >
                <X size={20} color={isDark ? '#FFF' : '#000'} />
              </TouchableOpacity>
            </View>

            <Controller control={control} name="amount" render={({ field: { onChange, value } }) => (
              <Input
                label="Importe total (€) *"
                keyboardType="numeric"
                placeholder="0.00"
                onChangeText={onChange}
                value={value ? String(value) : ''}
                error={errors.amount?.message}
                className="mb-4"
              />
            )} />

            <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
              <Input
                label="Descripción de la propuesta *"
                multiline
                numberOfLines={3}
                placeholder="Explica qué incluye tu presupuesto..."
                onChangeText={onChange}
                value={value}
                error={errors.description?.message}
                className="mb-4"
              />
            )} />

            <Controller control={control} name="delivery_days" render={({ field: { onChange, value } }) => (
              <Input
                label="Días estimados"
                keyboardType="numeric"
                placeholder="Ej: 5"
                onChangeText={onChange}
                value={value ? String(value) : ''}
                error={errors.delivery_days?.message}
                className="mb-4"
              />
            )} />

            {/* Incluye materiales */}
            <TouchableOpacity
              onPress={() => setValue('includes_materials', !includesMaterials)}
              activeOpacity={0.7}
              className={`flex-row items-center p-4 rounded-2xl border mb-6 ${
                includesMaterials ? 'bg-primary/5 border-primary/30' : 'bg-surface border-border'
              }`}
            >
              <View className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-3 ${
                includesMaterials ? 'bg-primary border-primary' : 'border-muted-text'
              }`}>
                {includesMaterials && <CheckCircle2 size={16} color="#FFF" />}
              </View>
              <Text className="text-text font-medium flex-1">Este presupuesto incluye materiales</Text>
            </TouchableOpacity>

            {errors.root && (
              <Text className="text-error text-sm text-center mb-4 bg-error/10 p-3 rounded-xl">
                {errors.root.message}
              </Text>
            )}

            <Button
              label="Enviar presupuesto"
              onPress={handleSubmit(onSendQuote)}
              isLoading={isSubmitting}
              leftIcon={<SendHorizontal size={20} color="#FFF" />}
              size="lg"
              className="mt-2 shadow-sm shadow-primary/30"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

function InfoChip({ Icon, label, value }: { Icon: any; label: string; value: string }) {
  return (
    <View className="bg-surface-active px-3 py-2 rounded-xl border border-border/50">
      <View className="flex-row items-center mb-0.5">
        <Icon size={12} color="#64748B" />
        <Text className="text-[10px] text-muted-text font-semibold uppercase tracking-wider ml-1">{label}</Text>
      </View>
      <Text className="text-sm font-bold text-text">{value}</Text>
    </View>
  );
}
