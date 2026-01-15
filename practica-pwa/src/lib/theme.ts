export const colors = {
  bg: '#0F1419',
  bgDark: '#0A0E13',
  bgElevated: '#1A1F2E',
  surface: '#151A28',

  text: '#FFFFFF',
  textSecondary: '#B0B8C1',
  textTertiary: '#7A8290',

  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  success: '#95E77D',
  warning: '#FFD93D',
  accent: '#A29BFE',
};

export const modes = {
  PRESENTATION: 'presentation',
  WORK: 'work',
} as const;

export type AppMode = typeof modes[keyof typeof modes];
