import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { projectsService } from '@/services/projects.service';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PROJECT_STATUS } from '@/utils/constants';
import type { ProjectWithDetails, ProjectStatus } from '@/services/projects.service';

const STATUS_CONFIG: Record<string, { label: string; badgeStyle: string }> = {
  pendiente:  { label: 'Pendiente',   badgeStyle: 'bg-yellow-100 text-yellow-700' },
  en_curso:   { label: 'En curso',    badgeStyle: 'bg-blue-100 text-brand' },
  pausado:    { label: 'Pausado',     badgeStyle: 'bg-gray-100 text-gray-600' },
  completado: { label: 'Completado',  badgeStyle: 'bg-green-100 text-green-700' },
  cancelado:  { label: 'Cancelado',   badgeStyle: 'bg-red-100 text-red-600' },
};

// Transiciones de estado permitidas para el profesional
const NEXT_STATUSES: Record<string, { status: ProjectStatus; label: string; style: string }[]> = {
  pendiente: [{ status: PROJECT_STATUS.IN_PROGRESS, label: 'Iniciar proyecto', style: 'bg-brand' }],
  en_curso: [
    { status: PROJECT_STATUS.PAUSED, label: 'Pausar proyecto', style: 'bg-gray-200 text-gray-800' },
    { status: PROJECT_STATUS.COMPLETED, label: 'Marcar como completado', style: 'bg-green-500' },
  ],
  pausado: [{ status: PROJECT_STATUS.IN_PROGRESS, label: 'Reanudar proyecto', style: 'bg-brand' }],
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
    const isComplete = next.status === PROJECT_STATUS.COMPLETED;
    Alert.alert(
      next.label,
      isComplete
        ? 'Una vez completado, el cliente podrá dejar su reseña y se procesará el pago. ¿Confirmas?'
        : '¿Confirmas el cambio de estado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: isComplete ? 'default' : 'default',
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

  if (isLoading) return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#2563eb" /></View>;
  if (!project) return <View className="flex-1 items-center justify-center"><Text className="text-gray-500">Proyecto no encontrado</Text></View>;

  const clientName = (project.client as { full_name: string } | undefined)?.full_name ?? 'Cliente';
  const clientId = project.client_id;
  const statusCfg = STATUS_CONFIG[project.status] ?? { label: project.status, badgeStyle: 'bg-gray-100 text-gray-500' };
  const nextActions = NEXT_STATUSES[project.status] ?? [];

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerClassName="pb-32"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="bg-white px-5 pt-14 pb-5 shadow-sm">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-brand">← Volver</Text>
          </TouchableOpacity>
          <View className="flex-row items-start justify-between">
            <Text className="text-xl font-bold text-gray-900 flex-1 mr-3">{project.title}</Text>
            <Text className={`text-xs px-3 py-1 rounded-full font-medium ${statusCfg.badgeStyle}`}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* Info financiera */}
        <Section title="Resumen económico">
          <FinanceRow
            label="Precio acordado"
            value={formatCurrency(project.agreed_price)}
            sublabel="Total cliente"
          />
          <View className="h-px bg-gray-100 my-3" />
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
              <ActivityIndicator color="#2563eb" />
            ) : (
              nextActions.map((action) => (
                <TouchableOpacity
                  key={action.status}
                  onPress={() => onChangeStatus(action)}
                  className={`py-3 rounded-xl items-center mb-2 ${action.style}`}
                >
                  <Text className={`font-semibold ${action.style.includes('gray-200') ? 'text-gray-800' : 'text-white'}`}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))
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
                params: { projectId: id, recipientId: clientId, title: clientName },
              })
            }
            className="bg-brand py-4 rounded-xl items-center"
          >
            <Text className="text-white font-semibold text-base">💬  Ir al chat</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white mx-4 mt-3 rounded-2xl p-5 shadow-sm">
      <Text className="text-base font-semibold text-gray-900 mb-4">{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-2 border-b border-gray-50">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="text-sm font-medium text-gray-800">{value}</Text>
    </View>
  );
}

function FinanceRow({
  label, value, sublabel, highlight,
}: {
  label: string; value: string; sublabel?: string; highlight?: boolean;
}) {
  return (
    <View className="flex-row justify-between items-start">
      <View>
        <Text className="text-sm text-gray-700">{label}</Text>
        {sublabel && <Text className="text-xs text-gray-400">{sublabel}</Text>}
      </View>
      <Text className={`text-base font-bold ${highlight ? 'text-green-600' : 'text-gray-700'}`}>
        {value}
      </Text>
    </View>
  );
}
