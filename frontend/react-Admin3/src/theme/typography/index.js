// Typography Module
// MUI theme typography configuration using token layer
//
// This module composes MUI-ready typography from the tokens layer.
// The tokens layer provides primitive values; this module adds MUI-specific
// configurations like !important flags and responsive overrides.

import { spacing } from '../tokens/spacing';
import {
  fontFamilies,
  fontSizes,
  lineHeights,
  letterSpacing,
  variants,
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
    ...variants.BPP,
    fontSize: important(fontSizes.display1),
    lineHeight: important('var(--halfstep-dec)'),
  },
  Acted: {
    ...variants.Acted,
    fontSize: important(fontSizes.display2),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.tighter),
    marginTop: "calc( var(--2xs) / var(--halfstep) / var(--halfstep) / var(--eighthstep))",
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
    ...variants.h4,
    fontSize: important(fontSizes.title2),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.tight),
  },
  h5: {
    ...variants.h5,
    fontSize: important('calc(1em * var(--halfstep) * var(--eighthstep))'),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.normal),
  },
  h6: {
    ...variants.h6,
    fontSize: important(fontSizes.heading),
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
    ...variants.button,
    fontSize: important(fontSizes.buttonMedium),
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
    ...variants.navlink,
    fontSize: important(fontSizes.navlink),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.minimal),
    position: "static",
    top: "6.235em",
  },
  topnavlink: {
    fontFamily: fontFamilies.primary,
    fontWeight: 300, // Lighter than token default for this context
    fontSize: important(fontSizes.topnavlink),
    lineHeight: important(lineHeights.normal),
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
