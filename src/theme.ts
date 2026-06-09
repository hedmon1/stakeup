// ─── StakeUp theme ──────────────────────────────────────────────────────────
// Matches the marketing site (stakeupapp.com): a retro 8-bit / neo-brutalist
// look — deep indigo backgrounds, neon accents, a hard black outline, and
// blocky offset shadows. The key NAMES below are unchanged from the original
// iOS-style theme so every screen/component reskins automatically.
export const colors = {
  // Backgrounds — deep indigo, layered (site --bg / --bg2 / --bg3)
  bg:        '#0b0a1f',
  card:      '#13112e',
  elevated:  '#1b1840',
  input:     '#13112e',

  // Hard outline used for neo-brutalist borders + blocky shadows (site --ink)
  ink:       '#05040f',

  // Text (site --text / --mut / --faint)
  primary:   '#f3f0ff',
  secondary: '#b3aee0',
  tertiary:  '#7c77ad',

  // Accents — neon arcade palette (site --cyan / --lime / --yellow / --red / --purple / --magenta)
  blue:      '#26e0ff',   // primary action color (was iOS blue) → neon cyan
  green:     '#c6ff3a',   // lime
  orange:    '#ffd23e',   // yellow
  red:       '#ff4d4d',
  purple:    '#a855ff',
  magenta:   '#ff3d8b',

  // Tiers — easy/medium/hard mapped to the neon set
  easy:      '#c6ff3a',   // lime
  medium:    '#ffd23e',   // yellow
  hard:      '#ff4d4d',   // red

  // Borders / hairlines (site --line #332e63)
  border:    'rgba(102,94,170,0.35)',
  separator: 'rgba(102,94,170,0.22)',
} as const;

export const radius = {
  // Neo-brutalist = chunky but not pill-soft. Slightly tightened from iOS.
  card:   12,
  button: 12,
  chip:   10,
  avatar: 10,
  small:  8,
  xs:     6,
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
} as const;

// Retro fonts (loaded in App.tsx via expo-font). `pixel` = headings/brand,
// `term` = labels/body accents. Components that set no fontFamily keep the
// readable system font, so inputs and dense text stay legible.
export const fonts = {
  pixel: 'PressStart2P',
  term:  'VT323',
} as const;

export const font = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   22,
  xxl:  28,
  hero: 34,
} as const;

// Blocky offset shadow (site --sh / --sh-lg). RN can't do hard 0-blur drop
// shadows cross-platform cleanly, so this approximates the look with a tight,
// opaque-ish ink shadow. Spread via these helpers where a card wants the look.
export const shadow = {
  blocky: {
    shadowColor: colors.ink,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  blockyLg: {
    shadowColor: colors.ink,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
  },
} as const;

// Color for text/icons that sit ON a bright neon fill (buttons). The site uses
// the hard ink black here — never white, which is unreadable on lime/cyan.
export const onAccent = colors.ink;

// Reusable neo-brutalist button skin: hard black outline + blocky shadow.
// Spread into a button style, then set its own backgroundColor/padding/radius.
export const brutalBtn = {
  borderWidth: 3,
  borderColor: colors.ink,
  ...shadow.blocky,
} as const;

// Reusable neo-brutalist surface (cards/panels): subtle ink outline + lift.
export const brutalCard = {
  borderWidth: 2,
  borderColor: colors.ink,
  ...shadow.blocky,
} as const;

// Tier helpers
export type GoalTier = 'easy' | 'medium' | 'hard';

export const tierColor = (t: GoalTier) =>
  t === 'easy' ? colors.easy : t === 'medium' ? colors.medium : colors.hard;

export const tierPoints = (t: GoalTier) =>
  t === 'easy' ? 1 : t === 'medium' ? 3 : 5;

export const tierBonus = (t: GoalTier) =>
  t === 'easy' ? 2 : t === 'medium' ? 5 : 10;
