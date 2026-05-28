export const colors = {
  primary: {
    50:  '#EEF2FF',
    100: '#C7D4FD',
    200: '#9FB6FB',
    400: '#5A7BF7',
    600: '#2952EF',
    800: '#1730B2',
    900: '#0D1E78',
  },
  coral: {
    50:  '#FFF0ED',
    100: '#FFD2C9',
    400: '#FF6B4A',
    600: '#E64020',
    800: '#9A2510',
  },
  gray: {
    50:  '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    400: '#9CA3AF',
    600: '#4B5563',
    800: '#1F2937',
    900: '#111827',
  },
  success: '#10B981',
  warning: '#F59E0B',
  error:   '#EF4444',
  info:    '#3B82F6',
  white:   '#FFFFFF',
  black:   '#000000',
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const borderRadius = {
  sm:   6,
  md:   10,
  lg:   16,
  xl:   24,
  full: 9999,
};

export const fontSize = {
  xs:   12,
  sm:   14,
  base: 16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 30,
};

export const fontWeight = {
  normal:    '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
};
