import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { projectsService } from '@/services/projects.service';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PROJECT_STATUS } from '@/utils/constants';
import type { ProjectWithDetails, ProjectStatus } from '@/types/models';
import { Screen, Card, Badge, Button } from '@/components/ui';
import { ArrowLeft, MessageCircle, PlayCircle, PauseCircle, CheckCircle2 } from 'lucide-react-native';

type ProjectAction = {
  status: ProjectStatus;
  label: string;
  variant: 'primary' | 'outline' | 'ghost';
  icon: React.ComponentType<{ size?: number; color?: string }>;
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'warning' | 'info' | 'default' | 'success' | 'error' }> = {
  pendiente:  { label: 'Pendiente',   variant: 'warning' },
  en_curso:   { label: 'En curso',    variant: 'info' },
  pendiente_finalizacion: { label: 'Pendiente de confirmación', variant: 'warning' },
  pausado:    { label: 'Pausado',     variant: 'default' },
  completado: { label: 'Completado',  variant: 'success' },
  cancelado:  { label: 'Cancelado',   variant: 'error' },
};

// Transiciones de estado permitidas para el profesional
const NEXT_STATUSES: Record<string, ProjectAction[]> = {
  pendiente: [{ status: PROJECT_STATUS.IN_PROGRESS, label: 'Iniciar proyecto', variant: 'primary', icon: PlayCircle }],
  en_curso: [
    { status: PROJECT_STATUS.PAUSED, label: 'Pausar proyecto', variant: 'outline', icon: PauseCircle },
    { status: PROJECT_STATUS.PENDING_COMPLETION, label: 'Trabajo finalizado', variant: 'primary', icon: CheckCircle2 },
  ],
  pausado: [{ status: PROJECT_STATUS.IN_PROGRESS, label: 'Reanudar proyecto', variant: 'primary', icon: PlayCircle }],
};

export default function ProfessionalProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<ProjectWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const load = useCallback(async () => {
    const p = await projectsService.getById(id);
    setProject(p);
  }, [id]);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onChangeStatus = (next: { status: ProjectStatus; label: string }) => {
    const isPendingCompletion = next.status === PROJECT_STATUS.PENDING_COMPLETION;
    Alert.alert(
      next.label,
      isPendingCompletion
        ? 'Una vez completado, el cliente podrá dejar su reseña y se procesará el pago. ¿Confirmas?'
        : '¿Confirmas el cambio de estado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'default',
          onPress: async () => {
            setIsUpdating(true);
            try {
              await projectsService.updateStatus(id, next.status);
              await load();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Error al actualizar');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ],
    );
  };

  if (isLoading) return (
    <Screen safeArea className="items-center justify-center">
      <ActivityIndicator color="#6366F1" size="large" />
    </Screen>
  );
  
  if (!project) return (
    <Screen safeArea className="items-center justify-center p-6">
      <Text className="text-muted-text text-lg text-center">Proyecto no encontrado</Text>
      <Button label="Volver" variant="outline" onPress={() => router.back()} className="mt-4" />
    </Screen>
  );

  const clientName = (project.client as { full_name: string } | undefined)?.full_name ?? 'Cliente';
  const clientId = project.client_id;
  const statusCfg = STATUS_CONFIG[project.status] ?? { label: project.status, variant: 'default' };
  const nextActions = NEXT_STATUSES[project.status] ?? [];

  return (
    <Screen safeArea={false} className="flex-1">
      <ScrollView
        contentContainerClassName="pb-32"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        {/* Header */}
        <View className="bg-surface px-6 pt-16 pb-6 shadow-sm shadow-primary/10 border-b border-border/50 rounded-b-3xl z-10">
          <TouchableOpacity onPress={() => router.back()} className="mb-4 flex-row items-center -ml-1">
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
          {/* Info financiera */}
          <Section title="Resumen económico">
            <FinanceRow
              label="Precio acordado"
              value={formatCurrency(project.agreed_price)}
              sublabel="Total cliente"
            />
            <View className="h-px bg-border/50 my-3" />
            <FinanceRow
              label="Tu cobro"
              value={formatCurrency(project.professional_receives)}
              sublabel={`Tras comisión ${project.platform_commission_pct}%`}
              highlight
            />
            <FinanceRow
              label="Comisión HabitUp"
              value={formatCurrency(project.platform_commission_amount)}
              sublabel={`${project.platform_commission_pct}%`}
            />
          </Section>

          {/* Detalles */}
          <Section title="Detalles del proyecto">
            <Row label="Cliente" value={clientName} />
            {project.categories && (
              <Row label="Categoría" value={(project.categories as { name: string }).name} />
            )}
            {project.start_date && <Row label="Inicio" value={formatDate(project.start_date)} />}
            {project.expected_end_date && (
              <Row label="Fin previsto" value={formatDate(project.expected_end_date)} />
            )}
            {project.actual_end_date && (
              <Row label="Fecha fin real" value={formatDate(project.actual_end_date)} />
            )}
            <Row label="Estado de pago" value={project.payment_status} />
          </Section>

          {/* Cambios de estado */}
          {nextActions.length > 0 && (
            <Section title="Acciones">
              {isUpdating ? (
                <ActivityIndicator color="#6366F1" size="small" className="py-2" />
              ) : (
                <View className="gap-3">
                  {nextActions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <Button
                        key={action.status}
                        label={action.label}
                        variant={action.variant}
                        onPress={() => onChangeStatus(action)}
                        leftIcon={<ActionIcon size={20} color={action.variant === 'primary' ? '#FFF' : '#6366F1'} />}
                        className={action.variant === 'primary' ? 'shadow-sm shadow-primary/30' : ''}
                      />
                    );
                  })}
                </View>
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
                params: { projectId: id, recipientId: clientId, title: clientName },
              })
            }
            leftIcon={<MessageCircle size={20} color="#FFF" />}
            size="lg"
            className="shadow-sm shadow-primary/30"
          />
        </View>
      )}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="elevated" className="p-5">
      <Text className="text-lg font-bold text-text mb-4 border-b border-border/50 pb-2">{title}</Text>
      {children}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-2.5 border-b border-border/30">
      <Text className="text-sm font-medium text-muted-text">{label}</Text>
      <Text className="text-sm font-bold text-text">{value}</Text>
    </View>
  );
}

function FinanceRow({
  label, value, sublabel, highlight,
}: {
  label: string; value: string; sublabel?: string; highlight?: boolean;
}) {
  return (
    <View className="flex-row justify-between items-start py-1">
      <View>
        <Text className="text-sm font-medium text-text">{label}</Text>
        {sublabel && <Text className="text-xs font-medium text-muted-text mt-0.5">{sublabel}</Text>}
      </View>
      <Text className={`text-base font-bold ${highlight ? 'text-success' : 'text-text'}`}>
        {value}
      </Text>
    </View>
  );
}
