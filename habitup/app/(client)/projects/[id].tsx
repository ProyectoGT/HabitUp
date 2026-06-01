import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Modal,
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
import { PROJECT_STATUS, PAYMENT_STATUS } from '@/utils/constants';
import type { Review, ProjectWithDetails } from '@/types/models';
import { Screen, Card, Badge, Button, Input, LoadingState, NotFoundState } from '@/components/ui';
import { ArrowLeft, MessageCircle, Star, X, CreditCard, Clock, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

// ── Review form ────────────────────────────────────
const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(10, 'Añade al menos 10 caracteres'),
  rating_quality: z.coerce.number().int().min(1).max(5),
  rating_communication: z.coerce.number().int().min(1).max(5),
  rating_timeline: z.coerce.number().int().min(1).max(5),
  rating_value: z.coerce.number().int().min(1).max(5),
});

type ReviewForm = z.infer<typeof reviewSchema>;

const STATUS_CONFIG: Record<string, { label: string; variant: 'warning' | 'info' | 'default' | 'success' | 'error' }> = {
  pendiente:  { label: 'Pendiente de inicio',  variant: 'warning' },
  en_curso:   { label: 'En curso',              variant: 'info' },
  pendiente_finalizacion: { label: 'Pendiente de confirmación', variant: 'warning' },
  pausado:    { label: 'Pausado',               variant: 'default' },
  completado: { label: 'Completado',            variant: 'success' },
  cancelado:  { label: 'Cancelado',             variant: 'error' },
};

export default function ClientProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [project, setProject] = useState<ProjectWithDetails | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const { confirmPayment } = useConfirmPayment();

  const { control, handleSubmit, formState: { errors, isSubmitting }, setError } =
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
  }, [load]);

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
        Alert.alert('Pago completado', 'El pago se ha procesado correctamente. El profesional será notificado cuando se confirme.');
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

  const onConfirmCompletion = () => {
    Alert.alert(
      'Confirmar finalización',
      '¿El trabajo está terminado y todo está correcto?',
      [
        { text: 'Todavía no', style: 'cancel' },
        {
          text: 'Sí, confirmar',
          onPress: async () => {
            try {
              await projectsService.completeProject(id);
              await load();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Error al confirmar');
            }
          },
        },
      ],
    );
  };

  if (isLoading) return (
    <Screen safeArea>
      <LoadingState />
    </Screen>
  );
  if (!project) return (
    <Screen safeArea>
      <NotFoundState message="Proyecto no encontrado" onBack={() => router.back()} />
    </Screen>
  );

  const proName = project.professional?.company_name ?? project.professional?.users?.full_name ?? 'Profesional';
  const recipientId = project.professional?.user_id ?? '';
  const statusCfg = STATUS_CONFIG[project.status] ?? { label: project.status, variant: 'default' };
  const isCompleted = project.status === PROJECT_STATUS.COMPLETED;
  const isPendingCompletion = project.status === PROJECT_STATUS.PENDING_COMPLETION;

  return (
    <Screen safeArea={false} className="flex-1">
      <ScrollView
        contentContainerClassName="pb-32"
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
          <View className="flex-row items-start justify-between">
            <Text className="text-2xl font-extrabold text-text flex-1 mr-4 leading-tight">{project.title}</Text>
          </View>
          <View className="mt-4 self-start">
            <Badge label={statusCfg.label} variant={statusCfg.variant} />
          </View>
        </View>

        <View className="px-6 pt-6 gap-6">
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
            <PaymentStatusCard status={project.payment_status} amount={project.agreed_price} isDark={isDark} />
            {project.payment_status === PAYMENT_STATUS.PENDING && project.status !== PROJECT_STATUS.CANCELLED && (
              <Button
                label={`Pagar ${formatCurrency(project.agreed_price)}`}
                onPress={onPay}
                isLoading={paymentLoading}
                className="mt-4 shadow-sm shadow-primary/30"
                leftIcon={<CreditCard size={20} color="#FFF" />}
              />
            )}
          </Section>

          {/* Reseña */}
          {isPendingCompletion && (
            <Section title="Finalización">
              <Text className="text-sm text-muted-text leading-relaxed mb-4">
                El profesional ha marcado el trabajo como finalizado. Confirma solo si el proyecto está terminado.
              </Text>
              <Button
                label="Confirmar finalización"
                onPress={onConfirmCompletion}
                leftIcon={<CheckCircle2 size={20} color="#FFF" />}
              />
            </Section>
          )}

          {isCompleted && (
            <Section title="Reseña">
              {review ? (
                <ReviewSummary review={review} />
              ) : (
                <Button
                  label="Dejar una reseña"
                  onPress={() => setShowReviewModal(true)}
                  variant="outline"
                  leftIcon={<Star size={20} color="#F59E0B" />}
                />
              )}
            </Section>
          )}
        </View>
      </ScrollView>

      {/* CTA — ir al chat */}
      {project.status !== PROJECT_STATUS.CANCELLED && (
        <View className="absolute bottom-0 left-0 right-0 bg-surface px-6 py-4 border-t border-border/50 shadow-lg shadow-black/10 z-20">
          <Button
            label="Ir al chat"
            onPress={() =>
              router.push({
                pathname: '/chat/[projectId]',
                params: { projectId: id, recipientId, title: proName },
              })
            }
            leftIcon={<MessageCircle size={20} color="#FFF" />}
            size="lg"
            className="shadow-sm shadow-primary/30"
          />
        </View>
      )}

      {/* Modal de reseña */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <ScrollView className="bg-surface rounded-t-[32px]" contentContainerClassName="px-6 pt-6 pb-12" bounces={false}>
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-extrabold text-text">Valorar a {proName}</Text>
              <TouchableOpacity 
                onPress={() => setShowReviewModal(false)}
                className="w-10 h-10 bg-border/30 rounded-full items-center justify-center"
              >
                <X size={20} color={isDark ? '#FFF' : '#000'} />
              </TouchableOpacity>
            </View>

            {/* Rating general */}
            <Text className="text-sm font-bold text-text mb-3">Valoración general <Text className="text-error">*</Text></Text>
            <Controller control={control} name="rating" render={({ field: { onChange, value } }) => (
              <View className="mb-2">
                <StarRating value={value} onChange={onChange} size="lg" />
              </View>
            )} />
            {errors.rating && <Text className="text-error text-xs mb-4">{errors.rating.message}</Text>}

            <View className="h-px bg-border/50 my-6" />

            {/* Ratings detallados */}
            {([
              ['rating_quality', 'Calidad del trabajo'],
              ['rating_communication', 'Comunicación'],
              ['rating_timeline', 'Cumplimiento de plazos'],
              ['rating_value', 'Relación calidad/precio'],
            ] as const).map(([field, label]) => (
              <View key={field} className="flex-row items-center justify-between mb-4">
                <Text className="text-sm font-medium text-text">{label}</Text>
                <Controller control={control} name={field} render={({ field: { onChange, value } }) => (
                  <StarRating value={value} onChange={onChange} size="sm" />
                )} />
              </View>
            ))}

            <View className="h-px bg-border/50 my-6" />

            {/* Comentario */}
            <Controller control={control} name="comment" render={({ field: { onChange, value } }) => (
              <Input
                label="Comentario *"
                placeholder="Comparte tu experiencia con el profesional..."
                multiline
                numberOfLines={4}
                onChangeText={onChange}
                value={value}
                error={errors.comment?.message}
              />
            )} />
            
            {errors.root && (
              <Text className="text-error text-sm text-center mb-4 bg-error/10 p-3 rounded-xl mt-2">
                {errors.root.message}
              </Text>
            )}

            <Button
              label="Publicar reseña"
              onPress={handleSubmit(onSubmitReview)}
              isLoading={isSubmitting}
              size="lg"
              className="mt-4 shadow-sm shadow-primary/30"
            />
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

// ── Sub-componentes ────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="elevated" className="p-5">
      <Text className="text-lg font-bold text-text mb-4 border-b border-border/50 pb-2">{title}</Text>
      {children}
    </Card>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View className="flex-row justify-between items-center py-2.5 border-b border-border/30">
      <Text className="text-sm font-medium text-muted-text">{label}</Text>
      <Text className={`text-sm font-bold ${highlight ? 'text-primary' : 'text-text'}`}>{value}</Text>
    </View>
  );
}

function PaymentStatusCard({ status, amount, isDark }: { status: string; amount: number; isDark: boolean }) {
  const LABELS: Record<string, { icon: any; label: string; bg: string; border: string; iconColor: string }> = {
    pendiente:       { icon: Clock, label: 'Pago pendiente',            bg: 'bg-warning/10', border: 'border-warning/30', iconColor: '#F59E0B' },
    pendiente_pago:  { icon: AlertCircle, label: 'Procesando pago',     bg: 'bg-info/10', border: 'border-info/30', iconColor: '#3B82F6' },
    completado:      { icon: CheckCircle2, label: 'Pago completado',    bg: 'bg-success/10', border: 'border-success/30', iconColor: '#10B981' },
    fallido:         { icon: X, label: 'Pago fallido',                  bg: 'bg-error/10', border: 'border-error/30', iconColor: '#EF4444' },
    reembolsado:     { icon: X, label: 'Reembolsado',                   bg: 'bg-warning/10', border: 'border-warning/30', iconColor: '#F59E0B' },
    disputa:         { icon: AlertCircle, label: 'Pago en disputa',     bg: 'bg-error/10', border: 'border-error/30', iconColor: '#EF4444' },
  };
  
  const defaultCfg = { icon: Clock, label: status, bg: 'bg-border/20', border: 'border-border/50', iconColor: isDark ? '#94A3B8' : '#64748B' };
  const cfg = LABELS[status] ?? defaultCfg;
  const Icon = cfg.icon;

  return (
    <View className={`flex-row items-center gap-4 p-4 rounded-2xl border ${cfg.bg} ${cfg.border}`}>
      <View className="w-12 h-12 bg-surface rounded-full items-center justify-center shadow-sm">
        <Icon size={24} color={cfg.iconColor} />
      </View>
      <View>
        <Text className="font-bold text-text text-base">{cfg.label}</Text>
        <Text className="text-sm font-medium text-muted-text mt-0.5">{formatCurrency(amount)}</Text>
      </View>
    </View>
  );
}

function StarRating({ value, onChange, size = 'md' }: { value: number; onChange: (v: number) => void; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
  };
  const iconSize = sizeMap[size];

  return (
    <View className="flex-row gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7}>
          <Star 
            size={iconSize} 
            color={star <= value ? '#F59E0B' : '#CBD5E1'} 
            fill={star <= value ? '#F59E0B' : 'transparent'} 
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ReviewSummary({ review }: { review: Review }) {
  return (
    <View>
      <View className="flex-row gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star 
            key={s} 
            size={18} 
            color={s <= review.rating ? '#F59E0B' : '#CBD5E1'} 
            fill={s <= review.rating ? '#F59E0B' : 'transparent'} 
          />
        ))}
      </View>
      {review.comment && (
        <Text className="text-text text-sm leading-relaxed bg-surface p-4 rounded-xl border border-border/50">
          {review.comment}
        </Text>
      )}
      <Text className="text-xs font-medium text-muted-text mt-3">
        Publicada el {formatDate(review.created_at)}
      </Text>
    </View>
  );
}
