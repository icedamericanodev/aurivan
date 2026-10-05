/**
 * Aurivan design tokens for mobile — ported 1:1 from index.html's :root
 * and [data-theme="dark"] blocks (navy/blue identity, locked in
 * design-notes/MASTER_HANDOFF.md). Contrast notes are kept: use
 * `accentFill` (not `accent`) behind white text to pass WCAG AA.
 */
export interface Palette {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  text2: string;
  muted: string;
  accent: string; // outlines, links, progress
  accentFill: string; // filled buttons with white text (7.7:1)
  teal: string;
  tealText: string;
  onAccent: string;
  correct: string;
  correctBg: string;
  wrong: string;
  wrongBg: string;
  warning: string;
  warningBg: string;
  navy: string;
}

export const light: Palette = {
  bg: '#F0F4FF',
  surface: '#FFFFFF',
  surface2: '#E8EEFF',
  border: '#D0D9FF',
  text: '#0D0F1A',
  text2: '#2D3460',
  muted: '#5A6390',
  accent: '#3B82F6',
  accentFill: '#1D4ED8',
  teal: '#14B8A6',
  tealText: '#0F766E',
  onAccent: '#FFFFFF',
  correct: '#057350',
  correctBg: '#D0FDF4',
  wrong: '#A51E3E',
  wrongBg: '#FFE0E6',
  warning: '#9A5800',
  warningBg: '#FEF3C7',
  navy: '#0B1E3D',
};

export const dark: Palette = {
  bg: '#0E0F1A',
  surface: '#16192B',
  surface2: '#1E2138',
  border: '#2A2E4A',
  text: '#F0F2FF',
  text2: '#A0A8D4',
  muted: '#8C93B8',
  accent: '#3B82F6',
  accentFill: '#1D4ED8',
  teal: '#14B8A6',
  tealText: '#2DD4BF',
  onAccent: '#FFFFFF',
  correct: '#34D399',
  correctBg: '#052E1F',
  wrong: '#FF8FA3',
  wrongBg: '#3A0F1A',
  warning: '#FCD34D',
  warningBg: '#3A2A05',
  navy: '#0B1E3D',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  mono: 'JetBrainsMono_500Medium',
} as const;

export const size = { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28, hero: 44 } as const;
