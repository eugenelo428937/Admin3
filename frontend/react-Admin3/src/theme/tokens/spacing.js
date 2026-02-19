/**
 * Spacing Tokens
 *
 * Spacing system using golden ratio (1.618) scaling.
 * Uses CSS custom properties for dynamic calculations.
 *
 * Scale factor: 1.618 (golden ratio)
 */
const baseUnit = 4;
export const scaleFactor = 1.618;

  // Calculate 8 * (1.618 ^ (factor - 1)) for exponential growth
  // or use a Fibonacci sequence approach.
  // spacing[1]  : 4px
  // spacing[2]  : 6.472px
  // spacing[3]  : 10.471696px
  // spacing[4]  : 16.943204128px
  // spacing[5]  : 27.414104279104px
  // spacing[6]  : 44.3560207235903px
  // spacing[7]  : 71.7680415307691px
  // spacing[8]  : 116.120691196784px
 
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
    5: 'calc(1rem / pow(var(--scaleFactor), 5))', // 1.44px 0.09rem
    4: 'calc(1rem / pow(var(--scaleFactor), 4))', // 2.33px 0.15rem
    3: 'calc(1rem / pow(var(--scaleFactor), 3))', // 3.78px 0.24rem
    2: 'calc(1rem / pow(var(--scaleFactor), 2))', // 6.11px 0.38rem
    1: 'calc(1rem / var(--scaleFactor) / var(--quarterstep))', // 8.77px 0.55rem   
  },
  sm: 'calc(1rem / var(--scaleFactor))', // 9.89px 0.62rem
  md: '1rem', // 16px 1rem
  lg: 'calc(1rem * var(--scaleFactor))', // 25.89px 1.62rem

  xl: {
    1: 'calc(1rem * var(--scaleFactor) * var(--halfstep))', // 32.93px 2.06rem
    2: 'calc(1rem * pow(var(--scaleFactor), 2))', // 41.89px 2.62rem
    3: 'calc(1rem * pow(var(--scaleFactor), 2) * var(--halfstep))', // 53.28px 3.33rem
    4: 'calc(1rem * pow(var(--scaleFactor), 3))', // 67.77px 4.24rem
    5: 'calc(1rem * pow(var(--scaleFactor), 4))', // 109.66px 6.85rem    
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
