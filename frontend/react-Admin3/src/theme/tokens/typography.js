/**
 * Typography Tokens
 *
 * Typography system based on golden ratio (1.618) scaling.
 * Uses CSS custom properties for dynamic calculations.
 *
 * Scale relationships:
 * - wholestep: 1.618 (golden ratio)
 * - halfstep: 1.272 (sqrt of wholestep)
 * - quarterstep: 1.128 (sqrt of halfstep)
 * - eighthstep: 1.061 (sqrt of quarterstep)
 */

// =============================================================================
// Font Families
// =============================================================================
export const fontFamilies = {
  primary: "'Inter',sans-serif",
  brand: "'DM Sans', sans-serif",
  secondary : "'DM Sans', sans-serif",
};

// =============================================================================
// Font Weights
// =============================================================================
export const fontWeights = {
  light: 200,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

// =============================================================================
// Scale Multipliers (Golden Ratio based)
// These reference CSS custom properties for consistency with index.css
// =============================================================================
export const scaleMultipliers = {
  wholestep: 'var(--wholestep)',
  halfstep: 'var(--halfstep)',
  quarterstep: 'var(--quarterstep)',
  eighthstep: 'var(--eighthstep)',
  // Decimal versions (value - 1)
  wholestepDec: 'var(--wholestep-dec)',
  halfstepDec: 'var(--halfstep-dec)',
  quarterstepDec: 'var(--quarterstep-dec)',
  eighthstepDec: 'var(--eighthstep-dec)',
};

// =============================================================================
// Font Sizes (using scale calculations)
// =============================================================================
export const fontSizes = {
  display: {
    large: 'calc(1rem * pow(var(--wholestep), 4))',  //109.66px
    medium: 'calc(1rem * pow(var(--wholestep), 3) * var(--halfstep))',    //86.21px
  },
  heading: {
    10: 'calc(1rem * pow(var(--wholestep), 3))', // ~4.236em  // 67.776px
    20: 'calc(1rem * pow(var(--wholestep), 2))', // ~2.618em  // 41.888px
    30: 'calc(1rem * var(--wholestep) * var(--halfstep))', // ~2.058em  // 32.928px
    40: 'calc(1rem * var(--wholestep) * var(--quarterstep))', // ~1.825em // 29.2px 
    50: 'calc(1rem * var(--wholestep) * var(--eighthstep))', // ~1.717em // 27.47
    60: 'calc(1rem * var(--wholestep))', // 1.618em  // 25.888px
    70: 'calc(1rem * var(--halfstep) * var(--quarterstep))', // ~1.435em // 22.96px  
    80: 'calc(1rem * var(--halfstep))', // 1.272em  // 20.352px
    90: 'calc(1rem * var(--quarterstep))', // 1.128em  // 18.048px  
  },
  body: {
    large: 'calc(1rem * var(--quarterstep))', // 1.128em  // 18.048px  
    medium: '1rem', // Base size // 16px
    small: 'calc(1rem / var(--quarterstep))', // ~0.886em // 14.176px
  },
  // Label
  label: 'calc((1rem / var(--quarterstep)) / var(--eighthstep))', // ~0.835em // 13.36px  
  caption: {
    large: 'calc(1rem / var(--halfstep))', // ~0.786em // 12.576px
    medium: 'calc(1rem / var(--halfstep) / var(--quarterstep))', // ~0.697em // 11.152px
    small: 'calc(1rem / var(--halfstep) / var(--halfstep))', // 0.62em // 9.8px 
  },
  overline: 'calc(1rem / var(--halfstep) / var(--halfstep)/ var(--quarterstep))', // 0.55em // 8.7px  
};

// =============================================================================
// Line Heights (using scale values)
// =============================================================================
export const lineHeights = {
  shortest: 'calc( 1 / var(--halfstep))',
  shorter: 1,
  short: 'calc( var(--halfstep)', //1.272  
  normal: 'calc(var(--halfstep) * var(--quarterstep))',  //1.435
  tall: 'calc(var(--whole))',  //1.618  
};

// =============================================================================
// Letter Spacing
// =============================================================================
export const letterSpacing = {
  10: '-0.0618em',
  20: '-0.022em',
  30: '-0.02em',
  40: '-0.017em',
  50: '-0.014em',
  60: '-0.007em',
  70: '0.004em',
  80: '0.012em',
  90: '0.016em',
  100: '0.02em',
  120: '0.024em',
  130: '0.03em',
  140: '0.038em',
  150: '0.045em',
  160: '0.0618em',
};

// =============================================================================
// Default Export
// =============================================================================
const typography = {
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacing,
  scaleMultipliers,
};

export default typography;

