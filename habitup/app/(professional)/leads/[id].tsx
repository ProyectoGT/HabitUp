import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { leadsService } from '@/services/leads.service';
import { quotesService } from '@/services/quotes.service';
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/formatters';
import type { Lead, Quote } from '@/types/models';

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

  const [lead, setLead] = useState<Lead | null>(null);
  const [myQuote, setMyQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<QuoteForm>({
    resolver: zodResolver(quoteSchema) as Resolver<QuoteForm>,
    defaultValues: { includes_materials: true },
  });

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

  if (isLoading) return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#2563eb" /></View>;
  if (!lead) return <View className="flex-1 items-center justify-center"><Text className="text-gray-500">Lead no encontrado</Text></View>;

  const URGENCY_LABEL: Record<string, string> = { alta: '🔴 Urgente', media: '🟡 Normal', baja: '🟢 Sin prisa' };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="pb-32">
        {/* Header */}
        <View className="bg-white px-5 pt-14 pb-5 shadow-sm">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-brand">← Volver</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">{lead.title}</Text>
          <Text className="text-gray-400 text-sm mt-1">{formatRelativeTime(lead.created_at)}</Text>
        </View>

        {/* Detalle del lead */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
          <Text className="text-gray-700 leading-6 mb-4">{lead.description}</Text>
          <View className="flex-row flex-wrap gap-2">
            {lead.location_city && <InfoChip label="Lugar" value={lead.location_city} />}
            {lead.budget_max && <InfoChip label="Presupuesto" value={`hasta ${formatCurrency(lead.budget_max)}`} />}
            {lead.preferred_start_date && <InfoChip label="Inicio" value={formatDate(lead.preferred_start_date)} />}
            <InfoChip label="Urgencia" value={URGENCY_LABEL[lead.urgency]} />
          </View>
        </View>

        {/* Mi presupuesto enviado */}
        {myQuote && (
          <View className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm border border-blue-100">
            <Text className="font-semibold text-gray-900 mb-3">Tu presupuesto enviado</Text>
            <Text className="text-2xl font-bold text-brand mb-1">{formatCurrency(myQuote.amount)}</Text>
            {myQuote.delivery_days && (
              <Text className="text-sm text-gray-500">⏱ {myQuote.delivery_days} días</Text>
            )}
            {myQuote.description && (
              <Text className="text-sm text-gray-600 mt-2">{myQuote.description}</Text>
            )}
            <View className="mt-3 bg-blue-50 px-3 py-1.5 rounded-full self-start">
              <Text className="text-brand text-xs font-medium">Estado: {myQuote.status}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      {!myQuote && lead.status === 'activo' && (
        <View className="absolute bottom-0 left-0 right-0 bg-white px-5 py-4 border-t border-gray-100">
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            className="bg-brand py-4 rounded-xl items-center"
          >
            <Text className="text-white font-semibold text-base">Enviar presupuesto</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de envío de presupuesto */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          className="flex-1 justify-end bg-black/40"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="bg-white rounded-t-3xl px-5 pt-6 pb-10">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-lg font-bold text-gray-900">Nuevo presupuesto</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text className="text-gray-400 text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            <ModalField label="Importe total (€) *" error={errors.amount?.message}>
              <Controller control={control} name="amount" render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  keyboardType="numeric"
                  placeholder="0.00"
                  onChangeText={onChange}
                  value={value ? String(value) : ''}
                />
              )} />
            </ModalField>

            <ModalField label="Descripción de la propuesta *" error={errors.description?.message}>
              <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholder="Explica qué incluye tu presupuesto..."
                  onChangeText={onChange}
                  value={value}
                />
              )} />
            </ModalField>

            <ModalField label="Días estimados" error={errors.delivery_days?.message}>
              <Controller control={control} name="delivery_days" render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  keyboardType="numeric"
                  placeholder="Ej: 5"
                  onChangeText={onChange}
                  value={value ? String(value) : ''}
                />
              )} />
            </ModalField>

            {/* Incluye materiales */}
            <Controller control={control} name="includes_materials" render={({ field: { onChange, value } }) => (
              <TouchableOpacity
                onPress={() => onChange(!value)}
                className="flex-row items-center gap-3 mb-4"
              >
                <View className={`w-6 h-6 rounded border-2 items-center justify-center ${value ? 'bg-brand border-brand' : 'border-gray-300'}`}>
                  {value && <Text className="text-white text-xs font-bold">✓</Text>}
                </View>
                <Text className="text-gray-700">Incluye materiales</Text>
              </TouchableOpacity>
            )} />

            {errors.root && <Text className="text-red-500 text-sm mb-3">{errors.root.message}</Text>}

            <TouchableOpacity
              onPress={handleSubmit(onSendQuote)}
              disabled={isSubmitting}
              className="bg-brand py-4 rounded-xl items-center"
            >
              {isSubmitting
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-semibold text-base">Enviar presupuesto</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-gray-50 px-3 py-2 rounded-xl">
      <Text className="text-xs text-gray-400">{label}</Text>
      <Text className="text-sm font-medium text-gray-800">{value}</Text>
    </View>
  );
}

function ModalField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>
      {children}
      {error ? <Text className="text-red-500 text-xs mt-1">{error}</Text> : null}
    </View>
  );
}
