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
  primary: "'Inter', 'Poppins', sans-serif",
  brand: "'Inter', sans-serif",
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
  // Heading sizes
  heading: {
    10: 'calc(1em * pow(var(--wholestep), 3))', // ~4.236em  // 67.776px
    20: 'calc(1em * pow(var(--wholestep), 2))', // ~2.618em  // 41.888px
    30: 'calc(1em * var(--wholestep) * var(--halfstep))', // ~2.058em  // 32.928px
    35: 'calc(1em * var(--wholestep) * var(--quarterstep))', // ~1.825em // 29.2px 
    355: 'calc(1em * var(--wholestep) * var(--eighthstep))', // ~1.717em // 
    40: 'calc(1em * var(--wholestep))', // 1.618em  // 25.888px
    45: 'calc(1em * var(--halfstep) * var(--quarterstep))', // ~1.435em // 22.96px  
    50: 'calc(1em * var(--halfstep))', // 1.272em  // 20.352px
    60: 'calc(1em * var(--quarterstep))', // 1.128em  // 18.048px  
  },
  body: {
    10: '1em', // Base size // 16px
    20: 'calc(1em / var(--quarterstep))', // ~0.886em // 14.176px
  },
  caption: {
    10: 'calc(1em / var(--halfstep))', // ~0.786em // 12.576px
    20: 'calc(1em / var(--halfstep) / var(--quarterstep))', // ~0.697em // 11.152px
  },
  
  // Label
  label: 'calc((1em / var(--quarterstep)) / var(--eighthstep))', // ~0.835em // 13.36px  

};

// =============================================================================
// Line Heights (using scale values)
// =============================================================================
export const lineHeights = {
  tight: 'var(--quarterstep)', // 1.128
  normal: 'var(--halfstep)', // 1.272
  relaxed: 'var(--wholestep)', // 1.618
};

// =============================================================================
// Letter Spacing
// =============================================================================
export const letterSpacing = {
  tighter: '-0.022em',
  tight: '-0.02em',
  normal: '-0.017em',
  slight: '-0.014em',
  subtle: '-0.011em',
  fine: '-0.007em',
  minimal: '-0.004em',
  wide: '0.0618em', // For uppercase/overline
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
