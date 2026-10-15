import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useMemo } from 'react';
import { getThemeColors, type ThemeColors } from '@/utils/colors';

/**
 * Devuelve la paleta activa segun el tema.
 *
 * OJO CON EL ORIGEN DEL TEMA
 *   `useColorScheme` de NativeWind devuelve `undefined` en web hasta que el
 *   usuario elige tema a mano. Si nos fiamos solo de el, el CSS pinta el fondo
 *   oscuro mientras estos tokens siguen devolviendo los del tema claro: texto
 *   gris oscuro sobre fondo casi negro, ilegible.
 *
 *   Por eso caemos al `useColorScheme` de React Native, que si lee la
 *   preferencia del sistema.
 *
 * Usalo SOLO para props imperativas (color de iconos, ActivityIndicator,
 * shadowColor). Para estilos de vista usa NativeWind: `className="bg-surface"`.
 */
export function useThemeColors(): { colors: ThemeColors; isDark: boolean } {
  const { colorScheme } = useNativeWindColorScheme();
  const systemScheme = useSystemColorScheme();

  const isDark = (colorScheme ?? systemScheme) === 'dark';

  return useMemo(
    () => ({ colors: getThemeColors(isDark), isDark }),
    [isDark],
  );
}
