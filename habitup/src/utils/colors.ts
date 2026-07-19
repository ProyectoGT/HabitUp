/**
 * HabitUp — Sistema visual "Plano y Obra"
 *
 * Estos valores son un ESPEJO de las variables CSS de `global.css`.
 * Si cambias uno, cambia el otro.
 *
 * ¿Cuándo usar esto y cuándo NativeWind?
 *   - Estilos de vista  → `className="bg-surface text-text"`. Siempre.
 *   - Props imperativas → estos tokens. Son los casos donde NativeWind no
 *     llega: el `color` de un icono de lucide-react-native, un
 *     `ActivityIndicator`, `shadowColor`, o valores de gráficas.
 *
 * Nunca escribas un hex suelto en un componente.
 */

export const lightTheme = {
  background:      '#F4F1EC',
  surface:         '#FFFFFF',
  surfaceSunken:   '#E5E0D8',

  text:            '#1C1B19',
  mutedText:       '#6B6862',

  primary:         '#E8590C',
  primaryDark:     '#C24708',
  primarySoft:     '#FDEAE0',
  onPrimary:       '#FFFFFF',

  blueprint:       '#2C5F7C',
  blueprintSoft:   '#E3EDF2',

  phasePending:    '#B8B3AA',
  phaseProgress:   '#E8590C',
  phaseDone:       '#2F7A4F',

  success:         '#2F7A4F',
  warning:         '#C98A0E',
  error:           '#C0392B',

  border:          '#D9D3C9',
  borderStrong:    '#B8B3AA',
  inputBackground: '#FFFFFF',

  gridLine:        'rgba(28, 27, 25, 0.04)',

  sealGold:        '#B8862B',
  sealSilver:      '#8A8578',
  sealVerified:    '#2C5F7C',

  promotedBg:      '#FAF6EF',
  promotedBorder:  '#E0D4BC',
};

export const darkTheme: typeof lightTheme = {
  background:      '#16151A',
  surface:         '#1F1E24',
  surfaceSunken:   '#131217',

  text:            '#EDEAE4',
  mutedText:       '#9A958C',

  primary:         '#FF7A33',
  primaryDark:     '#E8590C',
  primarySoft:     '#3A2318',
  onPrimary:       '#1C1B19',

  blueprint:       '#6FA8C7',
  blueprintSoft:   '#1B2C36',

  phasePending:    '#4A4740',
  phaseProgress:   '#FF7A33',
  phaseDone:       '#4CA372',

  success:         '#4CA372',
  warning:         '#E0A526',
  error:           '#E15A4A',

  border:          '#33313A',
  borderStrong:    '#4A4740',
  inputBackground: '#26252C',

  gridLine:        'rgba(237, 234, 228, 0.05)',

  sealGold:        '#D4A344',
  sealSilver:      '#A8A296',
  sealVerified:    '#6FA8C7',

  promotedBg:      '#221F1A',
  promotedBorder:  '#3D3527',
};

export type ThemeColors = typeof lightTheme;

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? darkTheme : lightTheme;
}

/** Grid base de 4px. Todo espaciado es múltiplo de 4. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Radios cortos por sistema: los materiales no son redondos. */
export const borderRadius = {
  chip: 4,
  card: 6,
  sheet: 12,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

/** Tracking de los labels de sección en mayúsculas, estilo rótulo de plano. */
export const BLUEPRINT_TRACKING = 1.2;
