import React from 'react';
import { View, Text } from 'react-native';
import { ShieldCheck, ShieldHalf, ShieldAlert } from 'lucide-react-native';

type TrustLevel = 'verified' | 'partial' | 'pending' | 'none';

interface Props {
  level: TrustLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const CONFIG: Record<TrustLevel, { icon: any; label: string; bg: string; text: string; iconColor: string }> = {
  verified: {
    icon: ShieldCheck,
    label: 'Verificado',
    bg: 'bg-success/15',
    text: 'text-success',
    iconColor: '#10B981',
  },
  partial: {
    icon: ShieldHalf,
    label: 'Verificación parcial',
    bg: 'bg-warning/15',
    text: 'text-warning',
    iconColor: '#F59E0B',
  },
  pending: {
    icon: ShieldAlert,
    label: 'Sin verificar',
    bg: 'bg-muted-text/10',
    text: 'text-muted-text',
    iconColor: '#94A3B8',
  },
  none: {
    icon: ShieldAlert,
    label: 'Sin verificar',
    bg: 'bg-muted-text/10',
    text: 'text-muted-text',
    iconColor: '#94A3B8',
  },
};

export function VerifiedBadge({ level, showLabel = true, size = 'sm' }: Props) {
  const cfg = CONFIG[level] ?? CONFIG.none;
  const Icon = cfg.icon;
  const isSm = size === 'sm';

  return (
    <View className={`flex-row items-center gap-1.5 self-start ${cfg.bg} ${isSm ? 'px-2 py-1 rounded-md' : 'px-3 py-1.5 rounded-lg'}`}>
      <Icon size={isSm ? 12 : 16} color={cfg.iconColor} strokeWidth={2.5} />
      {showLabel && (
        <Text className={`font-bold ${cfg.text} ${isSm ? 'text-[10px]' : 'text-xs'}`}>
          {cfg.label}
        </Text>
      )}
    </View>
  );
}
