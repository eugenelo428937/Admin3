// Typography Module
// MUI theme typography configuration using token layer
//
// This module composes MUI-ready typography from the tokens layer.
// The tokens layer provides primitive values; this module adds MUI-specific
// configurations like !important flags and responsive overrides.

import { spacing } from '../tokens/spacing';
import { md3 } from '../tokens/colors';
import
  {
    fontFamilies,
    fontSizes,
    fontWeights,
    lineHeights,
    letterSpacing,
  } from '../tokens/typography';

// =============================================================================
// Helper: Add !important to CSS values for MUI specificity
// =============================================================================
const important = (value) => `${value} !important`;

/**
 * Typography configuration for MUI theme.
 * All variant definitions are self-contained using token primitives.
 * Adds MUI-specific !important flags and layout overrides.
 */
export const typographyConfig = {
  fontFamily: fontFamilies.primary,

  // Brand variants
  BPP: {
    fontFamily: important(fontFamilies.brand),
    fontWeight: important(fontWeights.bold),
    fontSize: important(fontSizes.display.medium),
    lineHeight: important(lineHeights.shortest),
    letterSpacing: important(letterSpacing[10]),
    fontOpticalSizing: important('auto'),
    fontStyle: important('normal'),
    fontVariationSettings: important("'wght' 700"),
    color: md3.inverseOnSurface,
  },
  Acted: {
    fontFamily: important(fontFamilies.primary),
    fontWeight: important(fontWeights.light),
    fontSize: important(fontSizes.heading[30]),
    lineHeight: important(lineHeights.shorter),
    letterSpacing: important(letterSpacing[40]),
    fontOpticalSizing: important('auto'),
    fontStyle: important('normal'),
    fontVariationSettings: important("'wght' 200"),    
    color: md3.inverseOnSurface,    
  },
  onlineStoreTitle:{
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.heading[30]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing[50]),
    textWrap: 'balance',        
    color: md3.inverseOnSurface,    
  },
  // Heading variants
  h1: {
    fontFamily: fontFamilies.brand,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.heading[10]),
    lineHeight: important(lineHeights.tight),
    letterSpacing: important(letterSpacing.tighter),
    textWrap: 'balance',
  },
  h2: {
    fontFamily: fontFamilies.brand,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.heading[20]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.tighter),
  },
  h3: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.heading[30]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.tighter),
    textWrap: 'balance',
  },
  h4: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.heading[60]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.tight),
    textWrap: 'balance',
  },
  h5: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.heading[80]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.normal),
    textWrap: 'balance',
  },
  h6: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.semibold,
    fontSize: important(fontSizes.heading[90]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.slight),
    textWrap: 'balance',
  },

  // Body variants
  body1: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.body[10]),
    lineHeight: important(lineHeights.relaxed),
    letterSpacing: important(letterSpacing.subtle),
    textWrap: 'pretty',
  },
  body2: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.body[20]),
    lineHeight: important('calc(var(--wholestep) / var(--quarterstep))'),
    letterSpacing: important(letterSpacing.subtle),
    textWrap: 'balance',
  },

  // Subtitle variants
  subh3: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.body[20]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.fine),
  },
  subh4: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.caption[10]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.fine),
  },

  // Caption variants
  caption: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.caption[10]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.fine),
  },
  captionBold: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.semibold,
    fontSize: important(fontSizes.caption[10]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.fine),
  },
  captionSemiBold: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.caption[10]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.fine),
  },
  caption2: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.caption[20]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.fine),
  },

  // Utility variants
  button: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.heading[60]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.minimal),
    textTransform: 'none',
    position: "static",
    top: "6.235em",
  },
  buttonSmall: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.body[10]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.minimal),
    textTransform: 'none',
    position: "static",
    top: "6.235em",
  },
  buttonMedium: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.heading[80]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.minimal),
    textTransform: 'none',
    position: "static",
    top: "6.235em",
  },
  buttonLarge: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.heading[50]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.minimal),
    textTransform: 'none',
    position: "static",
    top: "6.235em",
  },
  overline: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.caption[10]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.wide),
    textTransform: 'uppercase',
  },
  fineprint: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.light,
    fontSize: important(fontSizes.caption[20]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.fine),
  },
  // Custom variants
  price: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.heading[45]),
    lineHeight: important(lineHeights.tight),
    letterSpacing: important(letterSpacing.tighter),
    textWrap: 'balance',
  },
  productTitle: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.heading[40]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.tight),
    textWrap: 'balance',
  },
  navlink: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.heading[80]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.minimal),
    textTransform: 'none',
    position: "static",
    top: "6.235em",
  },
  topnavlink: {
    fontFamily: fontFamilies.primary,
    fontWeight: 300, // Lighter than token default for this context
    fontSize: important(fontSizes.body.small),
    lineHeight: important(lineHeights.wide),
    letterSpacing: important(letterSpacing.normal),
    textWrap: "balance",
  },
  chip: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.semibold,
    fontSize: important(fontSizes.heading[60]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.minimal),
    textTransform: 'none',
    position: "static",
    top: "6.235em",
  },  
};

/**
 * Responsive typography overrides.
 * Applied via breakpoints in the main theme.
 *
 * Note: These are responsive-specific calculations that differ from base sizes.
 * They use the same golden ratio multipliers but with different compositions.
 */
export const responsiveTypography = {
  BPP: {
    sm: {
      fontSize: important('calc(1em * var(--wholestep) * var(--wholestep) * var(--halfstep))'),
      textAlign: "start",
      lineHeight: important('calc(1em * var(--wholestep-dec) * var(--eighthstep))'),
    },
  },
  Acted: {
    sm: {
      fontSize: important(fontSizes.h3), // Scales down from h2
      textAlign: "start",
      lineHeight: important('calc(1em * var(--wholestep-dec) * var(--quarterstep) * var(--eighthstep) * var(--eighthstep))'),
      marginBottom: spacing.xs3,
    },
  },
  h3: {
    sm: {
      fontSize: important(fontSizes.price), // Scales down from h3
    },
  },
  price: {
    sm: {
      fontSize: important(fontSizes.price),
    },
  },
  navlink: {
    lg: {
      fontSize: important(fontSizes.navlink),
      fontWeight: 400,
    },
    sm: {
      fontSize: important(fontSizes.body2),
      fontWeight: 400,
    },
  },
};

export default typographyConfig;
