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
 * Imports primitives from tokens/typography.js and adds MUI-specific modifications.
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
    ...variants.h1,
    fontSize: important(fontSizes.display1),
    lineHeight: important(lineHeights.tight),
    letterSpacing: important(letterSpacing.tighter),
  },
  h2: {
    ...variants.h2,
    fontSize: important(fontSizes.display2),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.tighter),
  },
  h3: {
    ...variants.h3,
    fontSize: important(fontSizes.title1),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.tighter),
  },
  h4: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.heading[60]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.tight),
  },
  h5: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.heading[80]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.normal),
  },
  h6: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.semibold,
    fontSize: important(fontSizes.heading[90]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.slight),
  },

  // Body variants
  body1: {
    ...variants.body1,
    fontSize: important(fontSizes.body1),
    lineHeight: important(lineHeights.relaxed),
    letterSpacing: important(letterSpacing.subtle),
  },
  body2: {
    ...variants.body2,
    fontSize: important(fontSizes.body2),
    lineHeight: important('calc(var(--wholestep) / var(--quarterstep))'),
    letterSpacing: important(letterSpacing.subtle),
  },

  // Subtitle variants
  subtitle1: {
    ...variants.subtitle1,
    fontSize: important(fontSizes.subheading),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.fine),
  },
  subtitle2: {
    ...variants.subtitle2,
    fontSize: important('calc(1em / var(--halfstep))'),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.fine),
  },

  // Caption variants
  caption: {
    ...variants.caption,
    fontSize: important(fontSizes.caption),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.fine),
  },
  captionBold: {
    ...variants.captionBold,
    fontSize: important(fontSizes.caption),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.fine),
  },
  captionSemiBold: {
    ...variants.captionSemiBold,
    fontSize: important(fontSizes.caption),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.fine),
  },
  caption2: {
    ...variants.caption2,
    fontSize: important(fontSizes.caption2),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.fine),
  },

  // Utility variants
  button: {
    ...variants.button,
    fontSize: important(fontSizes.buttonMedium),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.minimal),
    position: "static",
    top: "6.235em",
  },
  buttonSmall: {
    ...variants.button,
    fontSize: important(fontSizes.buttonSmall),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.minimal),
    position: "static",
    top: "6.235em",
  },
  buttonMedium: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.heading[80]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.minimal),
    position: "static",
    top: "6.235em",
  },
  buttonLarge: {
    ...variants.button,
    fontSize: important(fontSizes.buttonLarge),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.minimal),
    position: "static",
    top: "6.235em",
  },
  overline: {
    ...variants.overline,
    fontSize: important(fontSizes.overline),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.wide),
  },
  fineprint: {
    ...variants.fineprint,
    fontSize: important(fontSizes.fineprint),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.fine),
  },
  // Custom variants
  price: {
    ...variants.price,
    fontSize: important(fontSizes.price),
    lineHeight: important(lineHeights.tight),
    letterSpacing: important(letterSpacing.tighter),
  },
  productTitle: {
    ...variants.productTitle,
    fontSize: important(fontSizes.productTitle),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.tight),
  },
  navlink: {
    fontFamily: fontFamilies.primary,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.heading[80]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.minimal),
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
    ...variants.chip,
    fontSize: important(fontSizes.chip),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.minimal),
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
      fontSize: important(fontSizes.title1), // Scales down from display2
      textAlign: "start",
      lineHeight: important('calc(1em * var(--wholestep-dec) * var(--quarterstep) * var(--eighthstep) * var(--eighthstep))'),
      marginBottom: spacing.xs3,
    },
  },
  h3: {
    sm: {
      fontSize: important(fontSizes.price), // Scales down from title1
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
    md: {
      fontSize: important(fontSizes.body1),
      fontWeight: 400,
    },
  },
};

export default typographyConfig;
