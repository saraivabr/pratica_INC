export const colors = {
  bg: '#FFFFFF',
  bgDark: '#F5F5F7',
  bgElevated: '#FFFFFF',
  surface: '#F5F5F5',

  text: '#1D1D1F',
  textSecondary: '#86868B',
  textTertiary: '#6E6E73',

  white: '#FFFFFF',
  primary: '#1B4332',   /* Forest Green */
  secondary: '#F5F5F7',
  success: '#34C759',
  warning: '#FFCC00',
  accent: '#C9A962',    /* Gold */
};

export const modes = {
  PRESENTATION: 'presentation',
  WORK: 'work',
} as const;

export type AppMode = typeof modes[keyof typeof modes];
