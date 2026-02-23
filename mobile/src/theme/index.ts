export const colors = {
  light: {
    bgPrimary: '#F7F9FC',
    bgSecondary: '#EEF2F8',
    bgCard: '#FFFFFF',
    bgCardHover: '#F2F6FD',
    surface: '#EDF1F8',
    textPrimary: '#1E2535',
    textSecondary: '#4A5568',
    textMuted: '#8896A8',
    accentPrimary: '#2563EB',
    accentLight: '#3B82F6',
    accentDark: '#1E40AF',
    teal: '#0D9488',
    rose: '#E11D48',
    amber: '#D97706',
    green: '#059669',
    border: '#E2E8F0',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
  },
  dark: {
    bgPrimary: '#121018',
    bgSecondary: '#1A1726',
    bgCard: '#221F2E',
    bgCardHover: '#2A2740',
    surface: '#2A2740',
    textPrimary: '#E8E0F0',
    textSecondary: '#A89FBF',
    textMuted: '#6B6280',
    accentPrimary: '#9B6DFF',
    accentLight: '#B08FFF',
    accentDark: '#7C4DFF',
    teal: '#2DD4BF',
    rose: '#FB7185',
    amber: '#FBBF24',
    green: '#34D399',
    border: '#2A2740',
    tabBar: '#1A1726',
    tabBarBorder: '#2A2740',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  fontFamily: 'System',
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 34,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#1E2535',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#1E2535',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1E2535',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 6,
  },
};
