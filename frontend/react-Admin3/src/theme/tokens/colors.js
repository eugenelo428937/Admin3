/**
 * Color Tokens
 *
 * This file contains ALL raw color values for the application.
 * - MD3 system colors for Material Design 3 compliance
 * - BPP brand color scales (purple, sky, mint, green, orange, pink, cobalt, granite)
 * - Static colors (white, black, transparent)
 *
 * Usage:
 * - Import from semantic layer files, not directly in components
 * - Components should use semantic tokens (e.g., 'semantic.textPrimary')
 * - Raw access available via theme.palette.scales for theme layer edge cases
 *
 * @see data-model.md for type definitions
 */

// =============================================================================
// Material Design 3 System Colors (Light Theme)
// =============================================================================
export const md3 = {
  // Primary
  primary: '#755085', // #755085 // #755085 
  surfaceTint: '#755085', // #755085
  onPrimary: '#FFFFFF', // #FFFFFF
  primaryContainer: '#F7D8FF', // #F7D8FF
  onPrimaryContainer: '#5C396C', // #5C396C

  // Secondary
  secondary: '#69596D', // #69596D
  onSecondary: '#FFFFFF', // #FFFFFF
  secondaryContainer: '#F1DCF4', // #F1DCF4
  onSecondaryContainer: '#504255', // #504255

  // Tertiary
  tertiary: '#815251', // #815251
  onTertiary: '#FFFFFF', // #FFFFFF
  tertiaryContainer: '#FFDAD8', // #FFDAD8
  onTertiaryContainer: '#663B3A', // #663B3A

  // Error
  error: '#904A43', // #904A43
  onError: '#FFFFFF', // #FFFFFF
  errorContainer: '#FFDAD5', // #FFDAD5
  onErrorContainer: '#73342D', // #73342D

  // Background
  background: '#FFF7FB', // #FFF7FB
  onBackground: '#1E1A1F', // #1E1A1F

  // Surface
  surface: '#FDF8FF', // #FDF8FF
  onSurface: '#1C1B20', // #1C1B20
  surfaceVariant: '#E5E1EC', // #E5E1EC
  onSurfaceVariant: '#47464F', // #47464F
  surfaceDim: '#DDD8E0', // #DDD8E0
  surfaceBright: '#FDF8FF', // #FDF8FF
  surfaceContainerLowest: '#FFFFFF', // #FFFFFF
  surfaceContainerLow: '#F7F2FA', // #F7F2FA
  surfaceContainer: '#F1ECF4', // #F1ECF4
  surfaceContainerHigh: '#EBE6EE', // #EBE6EE
  surfaceContainerHighest: '#E6E1E9', // #E6E1E9

  // Outline
  outline: '#787680', // #787680
  outlineVariant: '#C9C5D0', // #C9C5D0

  // Inverse
  inverseSurface: '#312F36', // #312F36
  inverseOnSurface: '#F4EFF7', // #F4EFF7
  inversePrimary: '#E3B7F3', // #E3B7F3

  // Fixed colors
  primaryFixed: '#F7D8FF', // #F7D8FF
  onPrimaryFixed: '#2D0B3D', // #2D0B3D
  primaryFixedDim: '#E3B7F3', // #E3B7F3
  onPrimaryFixedVariant: '#5C396C', // #5C396C
  secondaryFixed: '#F1DCF4', // #F1DCF4
  onSecondaryFixed: '#231728', // #231728
  secondaryFixedDim: '#D4C0D7', // #D4C0D7
  onSecondaryFixedVariant: '#504255', // #504255
  tertiaryFixed: '#FFDAD8', // #FFDAD8
  onTertiaryFixed: '#331111', // #331111
  tertiaryFixedDim: '#F5B7B5', // #F5B7B5
  onTertiaryFixedVariant: '#663B3A', // #663B3A

  // Utility
  shadow: '#000000', // #000000
  scrim: '#000000', // #000000
};

// =============================================================================
// BPP Brand Color Scales
// Numeric keys (10-100) for cleaner access: scales.purple[20]
// =============================================================================
export const scales = {
  purple: {
    10: '#f1eefc', // #f1eefc
    20: '#dfd4f7', // #dfd4f7
    30: '#beb1ee', // #beb1ee
    40: '#a592e5', // #a592e5
    50: '#8f72dc', // #8f72dc
    60: '#7950d1', // #7950d1
    70: '#6332b9', // #6332b9
    80: '#4e0e9d', // #4e0e9d
    90: '#310075', // #310075
    100: '#140043', // #140043
    110: '#8953fd', // #8953fd // Accent
  },

  sky: {
    10: '#e5f9ff', // #e5f9ff
    20: '#8ae6ff', // #8ae6ff
    30: '#2bcbf8', // #2bcbf8
    40: '#00abd9', // #00abd9
    50: '#008ebb', // #008ebb
    60: '#006f99', // #006f99
    70: '#005782', // #005782
    80: '#003d67', // #003d67
    90: '#00264e', // #00264e
    100: '#00141a', // #00141a
    110: '#23cefd', // #23cefd // Accent
  },

  mint: {
    10: '#dcfefb', // #dcfefb
    20: '#7eece3', // #7eece3
    30: '#00cfbf', // #00cfbf
    40: '#00b2a4', // #00b2a4
    50: '#009487', // #009487
    60: '#00776b', // #00776b
    70: '#005d52', // #005d52
    80: '#00423d', // #00423d
    90: '#022c25', // #022c25
    100: '#001500', // #001500
    110: '#1ff9e8', // #1ff9e8 // Accent
  },

  green: {
    10: '#dbfaed', // #dbfaed
    20: '#b4e4cf', // #b4e4cf
    30: '#7dcaa8', // #7dcaa8
    40: '#4eb186', // #4eb186
    50: '#2f9569', // #2f9569
    60: '#007a46', // #007a46
    70: '#005f2d', // #005f2d
    80: '#004514', // #004514
    90: '#002e12', // #002e12
    100: '#001600', // #001600
    110: '#00e582', // #00e582 // Accent
  },

  orange: {
    10: '#fff2eb', // #fff2eb
    20: '#ffcfb8', // #ffcfb8
    30: '#ffa27a', // #ffa27a
    40: '#ff7536', // #ff7536
    50: '#e85100', // #e85100
    60: '#c83000', // #c83000
    70: '#a90000', // #a90000
    80: '#7d0000', // #7d0000
    90: '#550000', // #550000
    100: '#2d0000', // #2d0000
    110: '#ff6717', // #ff6717 // Accent
  },

  pink: {
    10: '#fff0f7', // #fff0f7
    20: '#ffccdd', // #ffccdd
    30: '#ff9bbd', // #ff9bbd
    40: '#ff69a2', // #ff69a2
    50: '#f33089', // #f33089
    60: '#cf006c', // #cf006c
    70: '#a4004b', // #a4004b
    80: '#7b002d', // #7b002d
    90: '#540014', // #540014
    100: '#2d0002', // #2d0002
    110: '#fa388e', // #fa388e // Accent
  },

  cobalt: {
    10: '#e9f1ff', // #e9f1ff
    20: '#c7daff', // #c7daff
    30: '#94bcff', // #94bcff
    35: '#669dfd', // #669dfd
    40: '#669dfd', // #669dfd
    45: '#568ded', // #568ded
    50: '#4481ec', // #4481ec
    55: '#3774dd', // #3774dd
    60: '#2a65ce', // #2a65ce
    70: '#0e4cb1', // #0e4cb1
    80: '#003195', // #003195
    90: '#00147b', // #00147b
    100: '#09004a', // #09004a
    110: '#518ffb', // #518ffb // Accent
  },

  granite: {
    0: '#ffffff', // #ffffff
    10: '#f1f1f1', // #f1f1f1
    20: '#d9d9d9', // #d9d9d9
    30: '#bababa', // #bababa
    40: '#9e9e9e', // #9e9e9e
    50: '#848484', // #848484
    60: '#6a6a6a', // #6a6a6a
    70: '#525252', // #525252
    75: '#474746', // #474746
    80: '#3b3b3a', // #3b3b3a
    85: '#31302F', // #31302F
    90: '#272524', // #272524
    100: '#111110', // #111110
  },

  // Offwhite scale (light grays for subtle backgrounds)
  offwhite: {
    0: '#fdfdfd', // #fdfdfd
    1: '#f4f4f4', // #f4f4f4
    2: '#ececec', // #ececec
    3: '#e3e3e3', // #e3e3e3
    5: '#dadada', // #dadada
    6: '#d2d2d2', // #d2d2d2
    7: '#c9c9c9', // #c9c9c9
    8: '#c1c1c1', // #c1c1c1
    9: '#b8b8b8', // #b8b8b8
  },

  // Yellow scale (warnings, highlights)
  yellow: {
    10: '#fff8db', // #fff8db
    20: '#f3d972', // #f3d972
    30: '#d9b600', // #d9b600
    40: '#be9a00', // #be9a00
    50: '#a27f00', // #a27f00
    60: '#856300', // #856300
    70: '#6f4901', // #6f4901
    80: '#563300', // #563300
    90: '#3f1d00', // #3f1d00
    100: '#280500', // #280500
    110: '#ffdb46', // #ffdb46
  },

  // Red scale (errors, alerts)
  red: {
    10: '#ffedf3', // #ffedf3
    20: '#ffccd0', // #ffccd0
    30: '#fba2aa', // #fba2aa
    40: '#f37887', // #f37887
    50: '#e84a67', // #e84a67
    60: '#d30047', // #d30047
    70: '#a70026', // #a70026
    80: '#7d0006', // #7d0006
    90: '#550000', // #550000
    100: '#2d0000', // #2d0000
    110: '#df1156', // #df1156
  },
};

// =============================================================================
// Static Colors (Never change)
// =============================================================================
export const staticColors = {
  white: '#FFFFFF', // #FFFFFF
  black: '#000000', // #000000
  transparent: 'transparent',
};

// =============================================================================
// Consolidated Colors Export
// =============================================================================
const colors = {
  md3,
  scales,
  static: staticColors,
};

export default colors;
