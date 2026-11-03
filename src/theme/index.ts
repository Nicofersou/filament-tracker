import { useColorScheme } from 'react-native';

const light = {
  background: '#F6F6F7',
  surface: '#FFFFFF',
  border: '#E6E6EA',
  text: '#111113',
  textSecondary: '#6C6C78',
  accent: '#4F46E5',
  accentText: '#FFFFFF',
  danger: '#DC2626',
  sealed: '#16A34A',
  inUse: '#D97706',
  empty: '#9CA3AF',
};

export type Colors = typeof light;

const dark: Colors = {
  background: '#0E0E10',
  surface: '#18181B',
  border: '#2A2A30',
  text: '#F4F4F5',
  textSecondary: '#9A9AA5',
  accent: '#6366F1',
  accentText: '#FFFFFF',
  danger: '#F87171',
  sealed: '#4ADE80',
  inUse: '#FBBF24',
  empty: '#6B7280',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { md: 12, lg: 16, pill: 999 } as const;

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { colors: isDark ? dark : light, isDark };
}
