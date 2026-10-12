// src/theme/theme.ts
//
// Single source of truth for the FeelVie look, extracted from HomeScreen /
// ProfileScreen / MainTabNavigator so every screen reads from the same palette.
//
// The look is: white paper, near-black ink, one gold accent, hairline borders,
// Poppins for UI text and an italic serif for display titles.

export const colors = {
  /* Surfaces */
  bg: '#FFFFFF',
  surface: '#F9F9F9',
  surfaceAlt: '#F2F2F2',
  overlay: 'rgba(0,0,0,0.5)',

  /* Ink */
  ink: '#111111',
  inkSoft: '#444444',
  inkMuted: '#666666',
  muted: '#AAAAAA',
  onDark: '#FFFFFF',

  /* Lines */
  border: '#E8E8E8',
  borderSoft: '#F0F0F0',

  /* Accent */
  gold: '#f8ac1b',
  goldSoft: '#FFF6E3',
  goldBorder: '#F6DCA6',

  /* Status — kept semantic, toned to sit beside the neutrals */
  success: '#16A34A',
  successSoft: '#EFF7F0',
  danger: '#EF4444',
  dangerSoft: '#FDECEC',
  warning: '#f8ac1b',
  warningSoft: '#FFF6E3',
  info: '#111111',
  infoSoft: '#F2F2F2',
} as const;

export const fonts = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semibold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
  /** Display face used by the FeelVie logo and section titles */
  display: 'serif',
} as const;

/** Italic serif heading, matching HomeScreen's `sectionTitle` / logo. */
export const displayTitle = {
  fontFamily: fonts.display,
  fontStyle: 'italic' as const,
  fontWeight: '800' as const,
  color: colors.ink,
};

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/** The soft card shadow used on Home's carousel and credit badge. */
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

/** Height of the floating tab bar — screens under MainTabs pad by this. */
export const TAB_BAR_SPACE = 90;

export const theme = { colors, fonts, displayTitle, radius, spacing, shadow };

export default theme;
