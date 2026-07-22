/**
 * Hetu Brand Color System
 * Primary: Deep Teal (from brand identity)
 * Guna: Sattva=Gold, Rajas=Coral, Tamas=Indigo
 */

export const Colors = {
  // Brand primaries
  teal: {
    50:  '#e6f4f2',
    100: '#b3deda',
    200: '#80c8c1',
    300: '#4db3a9',
    400: '#269d91',
    500: '#0D8B7F', // Primary teal
    600: '#0a7a6e', // Brand exact
    700: '#08665c',
    800: '#065249',
    900: '#033d37',
  },

  // Dark backgrounds (near-black, dark teal tinted)
  bg: {
    primary:   '#0A0F0E', // Main screen background
    secondary: '#111816', // Card background
    tertiary:  '#192320', // Elevated surface
    border:    '#243330', // Subtle borders
  },

  // Text
  text: {
    primary:   '#F0FAF8', // Near white
    secondary: '#94B5B0', // Muted teal-grey
    tertiary:  '#5C8580', // Very muted
    inverse:   '#0A0F0E', // On light surfaces
  },

  // Guna colors
  sattva: {
    main:  '#E8B84B', // Gold/amber — clarity, purity
    light: '#FEF3C7',
    dark:  '#92610A',
    bg:    '#1C1505',
  },
  rajas: {
    main:  '#E85D8A', // Coral/rose — energy, passion
    light: '#FCE7F3',
    dark:  '#881337',
    bg:    '#1C0510',
  },
  tamas: {
    main:  '#7C6FF5', // Indigo/violet — grounding, depth
    light: '#EDE9FE',
    dark:  '#3730A3',
    bg:    '#0C0B1C',
  },

  // Sentiment colors
  sentiment: {
    positive: '#22D3A0',
    neutral:  '#94A3B8',
    negative: '#F87171',
    mixed:    '#FB923C',
  },

  // Urgency
  urgency: {
    low:      '#22D3A0',
    medium:   '#FBBF24',
    high:     '#FB923C',
    critical: '#F87171',
  },

  // UI Primitives
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',

  // Glassmorphism overlay
  glass: 'rgba(13, 35, 32, 0.7)',
  glassLight: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
};

export type GunaType = 'sattva' | 'rajas' | 'tamas';

export function getGunaColor(guna: GunaType | string | null | undefined): string {
  switch (guna?.toLowerCase()) {
    case 'sattva': return Colors.sattva.main;
    case 'rajas':  return Colors.rajas.main;
    case 'tamas':  return Colors.tamas.main;
    default:       return Colors.teal[500];
  }
}

export function getGunaBackground(guna: GunaType | string | null | undefined): string {
  switch (guna?.toLowerCase()) {
    case 'sattva': return Colors.sattva.bg;
    case 'rajas':  return Colors.rajas.bg;
    case 'tamas':  return Colors.tamas.bg;
    default:       return Colors.bg.tertiary;
  }
}
