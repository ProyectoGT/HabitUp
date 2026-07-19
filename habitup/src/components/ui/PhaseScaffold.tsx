import React from 'react';
import { View, Text } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BLUEPRINT_TRACKING } from '@/utils/colors';

/**
 * El andamio de 5 niveles — el elemento característico de HabitUp.
 *
 * Representa el flujo de contratación como una estructura que se va
 * construyendo. El mismo componente aparece en el chat (compact), en el
 * listado de proyectos (mini) y en el detalle (full).
 *
 * Mapea 1:1 con `conversations.status` (migración 029). Este componente
 * solo pinta: las transiciones válidas las vigila un trigger en base de
 * datos, no el cliente.
 */
export type ConversationPhase =
  | 'contacto'
  | 'presupuestada'
  | 'aceptada'
  | 'en_obra'
  | 'entregada'
  | 'descartada';

const PHASES: { key: Exclude<ConversationPhase, 'descartada'>; label: string }[] = [
  { key: 'contacto',      label: 'CONTACTO' },
  { key: 'presupuestada', label: 'PRESUPUESTO' },
  { key: 'aceptada',      label: 'ACEPTADO' },
  { key: 'en_obra',       label: 'EN OBRA' },
  { key: 'entregada',     label: 'ENTREGADO' },
];

function phaseIndex(phase: ConversationPhase): number {
  return PHASES.findIndex((p) => p.key === phase);
}

interface Props {
  phase: ConversationPhase;
  /**
   * `full` vertical con labels (detalle de proyecto),
   * `compact` horizontal con label de fase actual (cabecera de chat),
   * `mini` solo los segmentos (listados).
   */
  variant?: 'full' | 'compact' | 'mini';
}

export function PhaseScaffold({ phase, variant = 'compact' }: Props) {
  const { colors } = useThemeColors();
  const discarded = phase === 'descartada';
  const current = discarded ? -1 : phaseIndex(phase);

  const a11yLabel = discarded
    ? 'Conversación descartada'
    : `Fase ${current + 1} de 5: ${PHASES[current].label.toLowerCase()}`;

  const segmentColor = (i: number): string => {
    if (discarded || i > current) return colors.phasePending;
    if (i === current) return colors.phaseProgress;
    return colors.phaseDone;
  };

  if (variant === 'full') {
    // Vertical, el nivel 5 arriba: el andamio se construye desde abajo.
    return (
      <View accessibilityRole="image" accessibilityLabel={a11yLabel}>
        {[...PHASES].reverse().map((p, idx) => {
          const i = PHASES.length - 1 - idx;
          const reached = !discarded && i <= current;
          const isCurrent = !discarded && i === current;
          return (
            <View key={p.key} className="flex-row items-center" style={{ height: 28 }}>
              <View
                style={{
                  width: 40,
                  height: 8,
                  backgroundColor: segmentColor(i),
                  opacity: reached ? 1 : 0.5,
                }}
              />
              <Text
                style={{
                  marginLeft: 12,
                  fontSize: 10,
                  fontWeight: isCurrent ? '700' : '600',
                  letterSpacing: BLUEPRINT_TRACKING,
                  color: isCurrent
                    ? colors.phaseProgress
                    : reached
                      ? colors.text
                      : colors.mutedText,
                }}
              >
                {i + 1} · {p.label}
              </Text>
            </View>
          );
        })}
        {discarded && (
          <Text
            style={{
              marginTop: 8,
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: BLUEPRINT_TRACKING,
              color: colors.mutedText,
            }}
          >
            DESCARTADA
          </Text>
        )}
      </View>
    );
  }

  const bars = (height: number) => (
    <View className="flex-row" style={{ gap: 3 }}>
      {PHASES.map((p, i) => (
        <View
          key={p.key}
          style={{
            flex: 1,
            height,
            backgroundColor: segmentColor(i),
            opacity: discarded || i > current ? 0.5 : 1,
          }}
        />
      ))}
    </View>
  );

  if (variant === 'mini') {
    return (
      <View accessibilityRole="image" accessibilityLabel={a11yLabel} style={{ width: 64 }}>
        {bars(3)}
      </View>
    );
  }

  return (
    <View accessibilityRole="image" accessibilityLabel={a11yLabel}>
      {bars(4)}
      <Text
        style={{
          marginTop: 4,
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: BLUEPRINT_TRACKING,
          color: discarded ? colors.mutedText : colors.phaseProgress,
        }}
      >
        {discarded ? 'DESCARTADA' : `${current + 1}/5 · ${PHASES[current].label}`}
      </Text>
    </View>
  );
}
