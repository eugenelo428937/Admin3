/**
 * Spacing Tokens
 *
 * Spacing system using golden ratio (1.618) scaling.
 * Uses CSS custom properties for dynamic calculations.
 *
 * Scale factor: 1.618 (golden ratio)
 */

// =============================================================================
// Scale Factor
// =============================================================================
export const scaleFactor = 1.618;

// =============================================================================
// Scale Multipliers
// These are the same as typography but kept here for spacing-specific use
// =============================================================================
export const multipliers = {
  wholestep: 1.618,
  halfstep: 1.272,
  quarterstep: 1.128,
  eighthstep: 1.061,
  // Decimal versions (value - 1)
  wholestepDec: 0.618,
  halfstepDec: 0.272,
  quarterstepDec: 0.128,
  eighthstepDec: 0.061,
};

// =============================================================================
// Spacing Scale (using CSS custom properties)
// =============================================================================
export const spacing = {
  // Negative scale (smaller than base)
  xs3: 'calc(1rem / var(--scaleFactor) / var(--scaleFactor) / var(--scaleFactor) / var(--halfstep))', // ~0.15rem
  xs2: 'calc(1rem / var(--scaleFactor) / var(--scaleFactor))', // ~0.38rem
  xs: 'calc(1rem / var(--scaleFactor) / var(--halfstep))', // ~0.49rem
  sm: 'calc(1rem / var(--scaleFactor))', // ~0.62rem

  // Base
  md: '1rem', // Base unit (16px at default)

  // Positive scale (larger than base)
  lg: 'calc(1rem * var(--scaleFactor))', // ~1.62rem
  xl: 'calc(1rem * var(--scaleFactor) * var(--scaleFactor))', // ~2.62rem
  xl15: 'calc(1rem * var(--scaleFactor) * var(--scaleFactor) * var(--halfstep))', // ~3.33rem
  xl2: 'calc(1rem * var(--scaleFactor) * var(--scaleFactor) * var(--scaleFactor))', // ~4.24rem
  xl3: 'calc(1rem * var(--scaleFactor) * var(--scaleFactor) * var(--scaleFactor) * var(--scaleFactor))', // ~6.85rem
};

// =============================================================================
// Numeric Spacing (for MUI spacing function compatibility)
// Values in rem, calculated from golden ratio
// =============================================================================
export const numericSpacing = {
  0: '0',
  0.5: '0.15rem', // xs3
  1: '0.38rem', // xs2
  1.5: '0.49rem', // xs
  2: '0.62rem', // sm
  3: '1rem', // md (base)
  4: '1.62rem', // lg
  5: '2.62rem', // xl
  6: '3.33rem', // xl15
  7: '4.24rem', // xl2
  8: '6.85rem', // xl3
};

// =============================================================================
// Gap Values (common spacing patterns)
// =============================================================================
export const gaps = {
  none: '0',
  tight: spacing.xs2,
  compact: spacing.xs,
  normal: spacing.sm,
  relaxed: spacing.md,
  loose: spacing.lg,
  spacious: spacing.xl,
};

// =============================================================================
// Padding Presets
// =============================================================================
export const padding = {
  none: '0',
  xs: spacing.xs2,
  sm: spacing.xs,
  md: spacing.sm,
  lg: spacing.md,
  xl: spacing.lg,
};

// =============================================================================
// Border Radius
// =============================================================================
export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

// =============================================================================
// LiftKit-compatible spacing structure
// For backward compatibility with liftKitTheme.spacing usage
// =============================================================================
export const liftkitSpacing = {
  // Base spacing values
  ...spacing,

  // Scale factor
  scaleFactor: '1.618',

  // Incremental multipliers
  wholestep: '1.618',
  halfstep: '1.272',
  quarterstep: '1.128',
  eighthstep: '1.061',

  // Decimal increments
  'wholestep-dec': '0.618',
  'halfstep-dec': '0.272',
  'quarterstep-dec': '0.128',
  'eighthstep-dec': '0.061',
};

// =============================================================================
// Default Export
// =============================================================================
const spacingTokens = {
  scaleFactor,
  multipliers,
  spacing,
  liftkitSpacing,
  numericSpacing,
  gaps,
  padding,
  borderRadius,
};

export default spacingTokens;
