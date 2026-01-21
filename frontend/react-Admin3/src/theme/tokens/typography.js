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
 *
 * @see liftKitTheme.js for original implementation
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
  // Display sizes (largest)
  display1: 'calc(1em * var(--wholestep) * var(--wholestep) * var(--wholestep))', // ~4.236em
  display2: 'calc(1em * var(--wholestep) * var(--wholestep))', // ~2.618em

  // Title sizes
  title1: 'calc(1em * var(--wholestep) * var(--halfstep))', // ~2.058em
  title2: 'calc(1em * var(--wholestep))', // 1.618em
  title3: 'calc(1em * var(--halfstep))', // 1.272em

  // Heading size
  heading: 'calc(1em * var(--quarterstep))', // 1.128em

  // Body sizes
  body1: '1em', // Base size
  body2: 'calc(1em / var(--quarterstep))', // ~0.886em

  // Subheading
  subheading: 'calc(1em / var(--quarterstep))', // ~0.886em

  // Caption sizes
  caption: 'calc(1em / var(--halfstep))', // ~0.786em
  caption2: 'calc(1em / var(--halfstep) / var(--quarterstep))', // ~0.697em

  // Label
  label: 'calc((1em / var(--quarterstep)) / var(--eighthstep))', // ~0.835em

  // Overline & fineprint
  overline: 'calc(1em / var(--halfstep))', // ~0.786em
  fineprint: 'calc(1em / var(--halfstep) / var(--quarterstep))', // ~0.697em

  // Custom sizes
  price: 'calc(1em * var(--wholestep) * var(--eighthstep))', // ~1.717em
  productTitle: 'calc(1em * var(--halfstep) * var(--quarterstep))', // ~1.435em
  navlink: 'calc(1em * var(--quarterstep))', // 1.128em
  topnavlink: 'calc(1em / var(--quarterstep))', // ~0.886em
  button: 'calc(1em * var(--eighthstep))', // 1.061em
  chip: 'calc(1em * var(--quarterstep))', // 1.128em
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
// Typography Variants (MUI-compatible)
// =============================================================================
export const variants = {
  // Brand variants
  BPP: {
    fontFamily: fontFamilies.brand,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.display1,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.tighter,
    fontOpticalSizing: 'auto',
    fontStyle: 'normal',
    fontVariationSettings: "'wght' 600",
  },
  Acted: {
    fontFamily: fontFamilies.brand,
    fontWeight: fontWeights.light,
    fontSize: fontSizes.display2,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.tighter,
    fontOpticalSizing: 'auto',
    fontStyle: 'normal',
    fontVariationSettings: "'wght' 200",
  },

  // Heading variants
  h1: {
    fontFamily: fontFamilies.brand,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.display1,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tighter,
    textWrap: 'balance',
  },
  h2: {
    fontFamily: fontFamilies.brand,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.display2,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.tighter,
  },
  h3: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.title1,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.tighter,
    textWrap: 'balance',
  },
  h4: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.title2,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.tight,
    textWrap: 'balance',
  },
  h5: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: 'calc(1em * var(--halfstep) * var(--eighthstep))',
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
    textWrap: 'balance',
  },
  h6: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.heading,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.slight,
    textWrap: 'balance',
  },

  // Body variants
  body1: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.body1,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacing.subtle,
    textWrap: 'pretty',
  },
  body2: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.body2,
    lineHeight: 'calc(var(--wholestep) / var(--quarterstep))',
    letterSpacing: letterSpacing.subtle,
    textWrap: 'balance',
  },

  // Subtitle variants
  subtitle1: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.subheading,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.fine,
  },
  subtitle2: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: 'calc(1em / var(--halfstep))',
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.fine,
  },

  // Caption variants
  caption: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.fine,
  },
  captionBold: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.fine,
  },
  captionSemiBold: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.fine,
  },
  caption2: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.caption2,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.fine,
  },

  // Utility variants
  button: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: fontSizes.button,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.minimal,
    textTransform: 'none',
  },
  overline: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.overline,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase',
  },
  fineprint: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.light,
    fontSize: fontSizes.fineprint,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.fine,
  },

  // Custom variants
  price: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.price,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tighter,
    textWrap: 'balance',
  },
  productTitle: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: fontSizes.productTitle,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.tight,
    textWrap: 'balance',
  },
  navlink: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: fontSizes.navlink,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.minimal,
    textTransform: 'none',
  },
  topnavlink: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.topnavlink,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
    textWrap: 'balance',
  },
  chip: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.chip,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.minimal,
    textTransform: 'none',
  },
};

// =============================================================================
// LiftKit-compatible typography variants
// For backward compatibility with liftKitTheme.typography usage
// =============================================================================
export const liftkitTypography = {
  // Display styles
  display1: {
    fontSize: fontSizes.display1,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tighter,
  },
  display1Bold: {
    fontSize: fontSizes.display1,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tighter,
  },
  display2: {
    fontSize: fontSizes.display2,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.tighter,
  },
  display2Bold: {
    fontSize: fontSizes.display2,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.tighter,
  },

  // Title styles
  title1: {
    fontSize: fontSizes.title1,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.tighter,
  },
  title1Bold: {
    fontSize: fontSizes.title1,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.tighter,
  },
  title2: {
    fontSize: fontSizes.title2,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.tight,
  },
  title2Bold: {
    fontSize: fontSizes.title2,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.tight,
  },
  title3: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  title3Bold: {
    fontSize: fontSizes.title3,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },

  // Heading styles
  heading: {
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.slight,
  },
  headingBold: {
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.slight,
  },

  // Subheading styles
  subheading: {
    fontSize: fontSizes.subheading,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.fine,
  },
  subheadingBold: {
    fontSize: fontSizes.subheading,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.fine,
  },

  // Body styles
  body: {
    fontSize: fontSizes.body1,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacing.subtle,
    cursor: 'default',
  },
  bodyBold: {
    fontSize: fontSizes.body1,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacing.subtle,
    padding: '0',
    position: 'relative',
  },

  // Callout styles
  callout: {
    fontSize: 'calc(1em / var(--eighthstep))',
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: '-0.009em',
  },
  calloutBold: {
    fontSize: 'calc(1em / var(--eighthstep))',
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: '-0.009em',
    textDecoration: 'none',
  },

  // Label styles
  label: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.minimal,
    position: 'static',
    top: '6.235em',
  },
  labelBold: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.minimal,
  },

  // Caption styles
  caption: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.fine,
  },
  captionBold: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.fine,
  },

  // Overline styles
  overline: {
    fontSize: fontSizes.overline,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase',
  },
  overlineBold: {
    fontSize: fontSizes.overline,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase',
  },
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
  variants,
  liftkitTypography,
  scaleMultipliers,
};

export default typography;
