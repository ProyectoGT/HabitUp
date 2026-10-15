import React from 'react';
import { View, Text } from 'react-native';
import { BadgeCheck, Award } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ICON_STROKE_WIDTH } from '@/utils/categoryIcons';
import { BLUEPRINT_TRACKING } from '@/utils/colors';

/**
 * Sello de visado — el distintivo de mérito de HabitUp.
 *
 * Metáfora: el cuño de un proyecto visado por el colegio profesional.
 *
 * TRES NIVELES, ESCASOS POR DISEÑO. Si más o menos el 60% de los perfiles
 * lleva sello, el sello deja de significar nada. Los umbrales de percentil
 * se calculan en base de datos y SIEMPRE relativos a la combinación
 * categoría + zona de la búsqueda actual: ser top 10% de España no le sirve
 * de nada a quien busca un fontanero en Girona.
 *
 * Este componente solo pinta. No decide el nivel.
 */
export type SealLevel = 'top10' | 'top25' | 'verified';

const SEAL_CONFIG: Record<
  SealLevel,
  { label: string; colorKey: 'sealGold' | 'sealSilver' | 'sealVerified'; icon: typeof Award }
> = {
  top10:    { label: 'DESTACADO',  colorKey: 'sealGold',     icon: Award },
  top25:    { label: 'DESTACADO',  colorKey: 'sealSilver',   icon: Award },
  verified: { label: 'VERIFICADO', colorKey: 'sealVerified', icon: BadgeCheck },
};

interface Props {
  level: SealLevel;
  /** `compact` muestra solo el icono: úsalo en listados densos. */
  variant?: 'full' | 'compact';
}

export function ApprovalSeal({ level, variant = 'full' }: Props) {
  const { colors } = useThemeColors();
  const config = SEAL_CONFIG[level];
  const color = colors[config.colorKey];
  const Icon = config.icon;

  if (variant === 'compact') {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={`Profesional ${config.label.toLowerCase()}`}
        style={{
          width: 24,
          height: 24,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          borderWidth: 1,
          borderColor: color,
          backgroundColor: 'transparent',
        }}
      >
        <Icon size={14} color={color} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Profesional ${config.label.toLowerCase()}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <Icon size={12} color={color} strokeWidth={ICON_STROKE_WIDTH} />
      <Text
        style={{
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: BLUEPRINT_TRACKING,
          color,
        }}
      >
        {config.label}
      </Text>
    </View>
  );
}
