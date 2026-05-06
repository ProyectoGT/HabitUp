import React from 'react';
import { View, Text } from 'react-native';
import { formatRelativeTime, formatCurrency } from '@/utils/formatters';
import type { Lead } from '@/types/models';
import { Card, Badge } from '@/components/ui';
import { MapPin, Clock, CircleDollarSign } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const STATUS_LABEL: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'error' | 'default' }> = {
  activo:           { label: 'Activo',         variant: 'success' },
  en_negociacion:   { label: 'En negociación', variant: 'warning' },
  asignado:         { label: 'Asignado',       variant: 'info' },
  cerrado:          { label: 'Cerrado',        variant: 'default' },
  cancelado:        { label: 'Cancelado',      variant: 'error' },
};

const URGENCY_LABEL: Record<string, { text: string; color: string }> = {
  alta:  { text: 'Urgente', color: '#EF4444' }, // error
  media: { text: 'Normal', color: '#F59E0B' },  // warning
  baja:  { text: 'Sin prisa', color: '#10B981' }, // success
};

interface Props {
  lead: Lead & { categories?: { name: string } };
  onPress: () => void;
  showClientName?: boolean;
}

export function LeadCard({ lead, onPress }: Props) {
  const status = STATUS_LABEL[lead.status] ?? { label: lead.status, variant: 'default' };
  const urgency = URGENCY_LABEL[lead.urgency] ?? { text: lead.urgency, color: '#64748B' };
  
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Card onPress={onPress} className="mb-4">
      <View className="flex-row items-start justify-between mb-3">
        <Text className="text-lg font-bold text-text flex-1 mr-3 leading-tight" numberOfLines={2}>
          {lead.title}
        </Text>
        <Badge label={status.label} variant={status.variant} />
      </View>

      <Text className="text-sm text-muted-text mb-4 leading-relaxed" numberOfLines={2}>
        {lead.description}
      </Text>

      <View className="flex-row flex-wrap gap-y-2 gap-x-4 items-center mt-auto border-t border-border/50 pt-3">
        {lead.location_city && (
          <View className="flex-row items-center">
            <MapPin size={14} color={isDark ? '#94A3B8' : '#64748B'} />
            <Text className="text-xs font-medium text-muted-text ml-1">{lead.location_city}</Text>
          </View>
        )}
        
        {(lead.budget_min || lead.budget_max) && (
          <View className="flex-row items-center">
            <CircleDollarSign size={14} color={isDark ? '#94A3B8' : '#64748B'} />
            <Text className="text-xs font-medium text-muted-text ml-1">
              {lead.budget_min ? formatCurrency(lead.budget_min) : ''}
              {lead.budget_min && lead.budget_max ? ' – ' : ''}
              {lead.budget_max ? formatCurrency(lead.budget_max) : ''}
            </Text>
          </View>
        )}

        <View className="flex-row items-center">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: urgency.color }} />
          <Text className="text-xs font-medium text-muted-text ml-1.5">{urgency.text}</Text>
        </View>

        <View className="flex-row items-center ml-auto">
          <Clock size={12} color={isDark ? '#94A3B8' : '#64748B'} />
          <Text className="text-[11px] text-muted-text ml-1">{formatRelativeTime(lead.created_at)}</Text>
        </View>
      </View>
    </Card>
  );
}
