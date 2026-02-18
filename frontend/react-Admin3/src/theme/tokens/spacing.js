/**
 * Spacing Tokens
 *
 * Spacing system using golden ratio (1.618) scaling.
 * Uses CSS custom properties for dynamic calculations.
 *
 * Scale factor: 1.618 (golden ratio)
 */
const baseUnit = 8;
export const scaleFactor = 1.618;

  // Calculate 8 * (1.618 ^ (factor - 1)) for exponential growth
  // or use a Fibonacci sequence approach.
  // spacing[1] :1px
  // spacing[2] :3.236px
  // spacing[3] :7.853772px
  // spacing[4] :16.943204128px
  // spacing[5] :34.26763034888px
  // spacing[6] :66.5340310853854px
  // spacing[7] :125.594072678846px
  // spacing[8] :232.241382393569px
export const formulatedSpacing = (factor) =>
{
  if (factor === 0) return '0px';

  const size = baseUnit * Math.pow(scaleFactor, factor - 1);

  return `${Math.round(size)}px`;
};

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
  xs: {
    1: 'calc(1rem / var(--scaleFactor) / var(--halfstep))',
    2: 'calc(1rem / pow(var(--scaleFactor), 2))',
    3: 'calc(1rem / pow(var(--scaleFactor), 3))',
    4: 'calc(1rem / pow(var(--scaleFactor), 4))',
    5: 'calc(1rem / pow(var(--scaleFactor), 5))',
  },
  sm: 'calc(1rem / var(--scaleFactor))', 
  md: '1rem', // Base unit (16px at default)  
  lg: 'calc(1rem * var(--scaleFactor))', // ~1.62rem
  xl: {
    1: 'calc(1rem * pow(var(--scaleFactor), 2))', // ~2.62rem
    2: 'calc(1rem * pow(var(--scaleFactor), 2) * var(--halfstep))', // ~3.33rem
    3: 'calc(1rem * pow(var(--scaleFactor), 3))', // ~4.24rem
    4: 'calc(1rem * pow(var(--scaleFactor), 4))', // ~6.85rem
  }
};

// =============================================================================
// Gap Values (common spacing patterns)
// =============================================================================
export const gaps = {
  none: '0',
  compact: spacing.xs[1],
  normal: spacing.sm,
  relaxed: spacing.md,
  loose: spacing.lg,
  spacious: spacing.xl[1],
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
// Default Export
// =============================================================================
const spacingTokens = {
  scaleFactor,
  formulatedSpacing,
  multipliers,
  spacing,
  gaps,
  padding,  
};

export default spacingTokens;
