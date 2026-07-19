import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

/**
 * Retícula milimetrada de fondo, como el papel de un plano técnico.
 *
 * Va al 4% de opacidad: debe percibirse como textura, nunca leerse como
 * contenido. Si al mirar la pantalla ves la cuadrícula antes que la
 * información, está mal calibrada.
 *
 * Se dibuja con Views en lugar de SVG para no añadir dependencias y porque a
 * este tamaño de celda el coste es despreciable.
 */
interface Props {
  /** Lado de la celda en px. Múltiplo de 4 (grid base). */
  cellSize?: number;
  style?: ViewStyle;
}

export function BlueprintGrid({ cellSize = 24, style }: Props) {
  const { colors } = useThemeColors();

  // Cubrimos una superficie generosa; el contenedor padre recorta con overflow.
  const LINES = 40;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
        style,
      ]}
    >
      {Array.from({ length: LINES }).map((_, i) => (
        <View
          key={`h${i}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: i * cellSize,
            height: 1,
            backgroundColor: colors.gridLine,
          }}
        />
      ))}
      {Array.from({ length: LINES }).map((_, i) => (
        <View
          key={`v${i}`}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: i * cellSize,
            width: 1,
            backgroundColor: colors.gridLine,
          }}
        />
      ))}
    </View>
  );
}
