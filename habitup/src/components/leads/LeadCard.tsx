import { View, Text, TouchableOpacity } from 'react-native';
import { formatRelativeTime, formatCurrency } from '@/utils/formatters';
import type { Lead } from '@/types/models';

const STATUS_LABEL: Record<string, { label: string; style: string }> = {
  activo:           { label: 'Activo',         style: 'bg-green-100 text-green-700' },
  en_negociacion:   { label: 'En negociación', style: 'bg-yellow-100 text-yellow-700' },
  asignado:         { label: 'Asignado',       style: 'bg-blue-100 text-brand' },
  cerrado:          { label: 'Cerrado',        style: 'bg-gray-100 text-gray-500' },
  cancelado:        { label: 'Cancelado',      style: 'bg-red-100 text-red-500' },
};

const URGENCY_LABEL: Record<string, string> = {
  alta: '🔴 Urgente',
  media: '🟡 Normal',
  baja: '🟢 Sin prisa',
};

interface Props {
  lead: Lead & { categories?: { name: string } };
  onPress: () => void;
  showClientName?: boolean;
}

export function LeadCard({ lead, onPress }: Props) {
  const status = STATUS_LABEL[lead.status] ?? { label: lead.status, style: 'bg-gray-100 text-gray-500' };

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100"
    >
      <View className="flex-row items-start justify-between mb-2">
        <Text className="text-base font-semibold text-gray-900 flex-1 mr-2" numberOfLines={1}>
          {lead.title}
        </Text>
        <Text className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.style}`}>
          {status.label}
        </Text>
      </View>

      <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>
        {lead.description}
      </Text>

      <View className="flex-row items-center gap-3 flex-wrap">
        {lead.location_city && (
          <Text className="text-xs text-gray-500">📍 {lead.location_city}</Text>
        )}
        {(lead.budget_min || lead.budget_max) && (
          <Text className="text-xs text-gray-500">
            💰 {lead.budget_min ? formatCurrency(lead.budget_min) : ''}
            {lead.budget_min && lead.budget_max ? ' – ' : ''}
            {lead.budget_max ? formatCurrency(lead.budget_max) : ''}
          </Text>
        )}
        <Text className="text-xs text-gray-500">{URGENCY_LABEL[lead.urgency]}</Text>
        <Text className="text-xs text-gray-400 ml-auto">{formatRelativeTime(lead.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}
