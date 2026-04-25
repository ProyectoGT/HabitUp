import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, RefreshControl, TextInput, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useConfirmPayment } from '@stripe/stripe-react-native';
import { projectsService } from '@/services/projects.service';
import { reviewsService } from '@/services/reviews.service';
import { paymentsService } from '@/services/payments.service';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PROJECT_STATUS } from '@/utils/constants';
import type { Review } from '@/types/models';
import type { ProjectWithDetails } from '@/services/projects.service';

// ── Review form ────────────���───────────────────────
const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(10, 'Añade al menos 10 caracteres'),
  rating_quality: z.coerce.number().int().min(1).max(5),
  rating_communication: z.coerce.number().int().min(1).max(5),
  rating_timeline: z.coerce.number().int().min(1).max(5),
  rating_value: z.coerce.number().int().min(1).max(5),
});

type ReviewForm = z.infer<typeof reviewSchema>;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pendiente:  { label: 'Pendiente de inicio',  color: 'text-yellow-600' },
  en_curso:   { label: 'En curso',              color: 'text-brand' },
  pausado:    { label: 'Pausado',               color: 'text-gray-500' },
  completado: { label: 'Completado',            color: 'text-green-600' },
  cancelado:  { label: 'Cancelado',             color: 'text-red-500' },
};

export default function ClientProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<ProjectWithDetails | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const { confirmPayment } = useConfirmPayment();

  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting }, setError } =
    useForm<ReviewForm>({
      resolver: zodResolver(reviewSchema) as Resolver<ReviewForm>,
      defaultValues: {
        rating: 5, rating_quality: 5, rating_communication: 5,
        rating_timeline: 5, rating_value: 5,
      },
    });

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([
      projectsService.getById(id),
      reviewsService.getByProject(id),
    ]);
    setProject(p);
    setReview(r);
  }, [id]);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onPay = async () => {
    if (!project) return;
    setPaymentLoading(true);
    try {
      const clientSecret = await paymentsService.createPaymentIntent(id);
      const { error } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });
      if (error) {
        Alert.alert('Pago fallido', error.message);
      } else {
        Alert.alert('¡Pago completado! 🎉', 'El profesional ha sido notificado.');
        await load();
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al procesar el pago');
    } finally {
      setPaymentLoading(false);
    }
  };

  const onSubmitReview = async (data: ReviewForm) => {
    if (!project) return;
    try {
      await reviewsService.create({
        project_id: id,
        professional_id: project.professional_id,
        ...data,
      });
      setShowReviewModal(false);
      await load();
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'Error al enviar reseña' });
    }
  };

  if (isLoading) return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#2563eb" /></View>;
  if (!project) return <View className="flex-1 items-center justify-center"><Text className="text-gray-500">Proyecto no encontrado</Text></View>;

  const proName = project.professional?.company_name ?? project.professional?.users?.full_name ?? 'Profesional';
  const recipientId = project.professional?.user_id ?? '';
  const statusCfg = STATUS_CONFIG[project.status] ?? { label: project.status, color: 'text-gray-500' };
  const isCompleted = project.status === PROJECT_STATUS.COMPLETED;

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
          <Text className="text-xl font-bold text-gray-900">{project.title}</Text>
          <Text className={`text-sm font-medium mt-1 ${statusCfg.color}`}>{statusCfg.label}</Text>
        </View>

        {/* Info del proyecto */}
        <Section title="Resumen">
          <Row label="Profesional" value={proName} />
          <Row label="Precio acordado" value={formatCurrency(project.agreed_price)} highlight />
          <Row label="Comisión plataforma" value={formatCurrency(project.platform_commission_amount)} />
          {project.start_date && <Row label="Inicio" value={formatDate(project.start_date)} />}
          {project.expected_end_date && <Row label="Fin previsto" value={formatDate(project.expected_end_date)} />}
          {project.actual_end_date && <Row label="Finalizado" value={formatDate(project.actual_end_date)} />}
          {project.categories && <Row label="Categoría" value={(project.categories as { name: string }).name} />}
        </Section>

        {/* Estado del pago */}
        <Section title="Pago">
          <PaymentStatusCard status={project.payment_status} amount={project.agreed_price} />
          {project.payment_status === 'pendiente' && project.status !== PROJECT_STATUS.CANCELLED && (
            <TouchableOpacity
              onPress={onPay}
              disabled={paymentLoading}
              className="bg-brand py-3 rounded-xl items-center mt-4"
            >
              {paymentLoading
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-semibold">
                    Pagar {formatCurrency(project.agreed_price)}
                  </Text>}
            </TouchableOpacity>
          )}
        </Section>

        {/* Reseña */}
        {isCompleted && (
          <Section title="Reseña">
            {review ? (
              <ReviewSummary review={review} />
            ) : (
              <TouchableOpacity
                onPress={() => setShowReviewModal(true)}
                className="bg-brand py-3 rounded-xl items-center"
              >
                <Text className="text-white font-semibold">Dejar una reseña</Text>
              </TouchableOpacity>
            )}
          </Section>
        )}
      </ScrollView>

      {/* CTA — ir al chat */}
      {project.status !== PROJECT_STATUS.CANCELLED && (
        <View className="absolute bottom-0 left-0 right-0 bg-white px-5 py-4 border-t border-gray-100">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/chat/[projectId]',
                params: { projectId: id, recipientId, title: proName },
              })
            }
            className="bg-brand py-4 rounded-xl items-center"
          >
            <Text className="text-white font-semibold text-base">💬  Ir al chat</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de reseña */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <ScrollView className="bg-white rounded-t-3xl" contentContainerClassName="px-5 pt-6 pb-12">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-lg font-bold text-gray-900">Valorar a {proName}</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Text className="text-gray-400 text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            {/* Rating general */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Valoración general *</Text>
            <Controller control={control} name="rating" render={({ field: { onChange, value } }) => (
              <StarRating value={value} onChange={onChange} />
            )} />
            {errors.rating && <Text className="text-red-500 text-xs mb-3">{errors.rating.message}</Text>}

            {/* Ratings detallados */}
            {([
              ['rating_quality', 'Calidad del trabajo'],
              ['rating_communication', 'Comunicación'],
              ['rating_timeline', 'Cumplimiento de plazos'],
              ['rating_value', 'Relación calidad/precio'],
            ] as const).map(([field, label]) => (
              <View key={field} className="flex-row items-center justify-between mb-3">
                <Text className="text-sm text-gray-600">{label}</Text>
                <Controller control={control} name={field} render={({ field: { onChange, value } }) => (
                  <StarRating value={value} onChange={onChange} size="sm" />
                )} />
              </View>
            ))}

            {/* Comentario */}
            <Text className="text-sm font-medium text-gray-700 mb-1 mt-2">Comentario *</Text>
            <Controller control={control} name="comment" render={({ field: { onChange, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 mb-1"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Comparte tu experiencia con el profesional..."
                onChangeText={onChange}
                value={value}
              />
            )} />
            {errors.comment && <Text className="text-red-500 text-xs mb-3">{errors.comment.message}</Text>}
            {errors.root && <Text className="text-red-500 text-sm mb-3">{errors.root.message}</Text>}

            <TouchableOpacity
              onPress={handleSubmit(onSubmitReview)}
              disabled={isSubmitting}
              className="bg-brand py-4 rounded-xl items-center mt-2"
            >
              {isSubmitting
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-semibold text-base">Publicar reseña</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Sub-componentes ────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white mx-4 mt-3 rounded-2xl p-5 shadow-sm">
      <Text className="text-base font-semibold text-gray-900 mb-4">{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View className="flex-row justify-between items-center py-2 border-b border-gray-50">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className={`text-sm font-medium ${highlight ? 'text-brand' : 'text-gray-800'}`}>{value}</Text>
    </View>
  );
}

function PaymentStatusCard({ status, amount }: { status: string; amount: number }) {
  const LABELS: Record<string, { icon: string; label: string; style: string }> = {
    pendiente:   { icon: '⏳', label: 'Pago pendiente',    style: 'bg-yellow-50 border-yellow-200' },
    en_proceso:  { icon: '⚙️', label: 'Procesando pago',  style: 'bg-blue-50 border-blue-200' },
    completado:  { icon: '✅', label: 'Pago completado',   style: 'bg-green-50 border-green-200' },
    fallido:     { icon: '❌', label: 'Pago fallido',      style: 'bg-red-50 border-red-200' },
  };
  const cfg = LABELS[status] ?? { icon: '·', label: status, style: 'bg-gray-50 border-gray-200' };
  return (
    <View className={`flex-row items-center gap-3 p-4 rounded-xl border ${cfg.style}`}>
      <Text className="text-2xl">{cfg.icon}</Text>
      <View>
        <Text className="font-semibold text-gray-900">{cfg.label}</Text>
        <Text className="text-sm text-gray-500">{formatCurrency(amount)}</Text>
      </View>
    </View>
  );
}

function StarRating({ value, onChange, size = 'md' }: { value: number; onChange: (v: number) => void; size?: 'sm' | 'md' }) {
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)}>
          <Text className={size === 'md' ? 'text-3xl' : 'text-xl'}>
            {star <= value ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ReviewSummary({ review }: { review: Review }) {
  return (
    <View>
      <View className="flex-row gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <Text key={s} className="text-xl">{s <= review.rating ? '★' : '☆'}</Text>
        ))}
      </View>
      {review.comment && <Text className="text-gray-700 text-sm leading-5">{review.comment}</Text>}
      <Text className="text-xs text-gray-400 mt-2">
        Publicada el {new Date(review.created_at).toLocaleDateString('es-ES')}
      </Text>
    </View>
  );
}
