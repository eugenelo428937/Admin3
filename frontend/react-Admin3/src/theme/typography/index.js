// Typography Module
// MUI theme typography configuration using token layer
//
// This module composes MUI-ready typography from the tokens layer.
// The tokens layer provides primitive values; this module adds MUI-specific
// configurations like !important flags and responsive overrides.

import spacingTokens, { spacing } from '../tokens/spacing';
import { md3 } from '../tokens/colors';
import
  {
    fontFamilies,
    fontSizes,
    fontWeights,
    lineHeights,
    letterSpacing,
  } from '../tokens/typography';
import { navigation } from '../semantic/navigation';
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
  fontFamily: fontFamilies.inter,

  // Brand variants
  logo_bpp:{
    fontFamily: important(fontFamilies.dm_sans),
    fontWeight: important(fontWeights.bold),
    fontSize: important(fontSizes.heading[60]),    
    lineHeight: important('0.85'),
    letterSpacing: important(letterSpacing.scale[10]),
    color: md3.inverseOnSurface,
    fontOpticalSizing: important('auto'),
    fontStyle: important('normal'),
    alignContent: 'bottom',
    display:'flex'
  },
  logo_acted: {
    fontFamily: important(fontFamilies.inter),
    fontWeight: important(fontWeights.extralight),
    fontSize: important(fontSizes.caption.large),
    lineHeight: important('1'),
    color: md3.inverseOnSurface,
    fontOpticalSizing: important('auto'),
    fontStyle: important('normal'),    
    alignContent: 'top',
    display:'flex',
    marginBottom:spacing.xs[4]
  },
  logo_lyceum: {
    fontFamily: important(fontFamilies.dm_sans),
    fontWeight: important(fontWeights.light),
    fontSize: important(fontSizes.overline),
    lineHeight: important('1.1'),
    color: md3.inverseOnSurface,
    fontOpticalSizing: important('auto'),
    fontStyle: important('normal'),
    alignContent: 'center',    
  },
  logo_education_group:{
    fontFamily: important(fontFamilies.dm_sans),
    fontWeight: important(fontWeights.semibold),
    fontSize: important(fontSizes.fineprint),
    lineHeight: important('1.1'),
    color: md3.OnSurface,
    fontOpticalSizing: important('auto'),
    fontStyle: important('normal'),
    alignContent: 'center',
    backgroundColor: md3.surfaceDim,
    padding: spacing.xs[5],
  },
  title_BPP: {
    fontFamily: important(fontFamilies.dm_sans),
    fontWeight: important(fontWeights.bold),
    fontSize: important(fontSizes.display.large),
    lineHeight: important(lineHeights.shortest),
    letterSpacing: important(letterSpacing.scale[10]),
    fontOpticalSizing: important('auto'),
    fontStyle: important('normal'),
    fontVariationSettings: important("'wght' 700"),
    color: md3.inverseOnSurface,
  },
  title_Acted: {
    fontFamily: important(fontFamilies.inter),
    fontWeight: important(fontWeights.light),
    fontSize: important(fontSizes.heading[30]),
    lineHeight: important(lineHeights.shorter),
    letterSpacing: important(letterSpacing.scale[40]),
    fontOpticalSizing: important('auto'),
    fontStyle: important('normal'),
    fontVariationSettings: important("'wght' 200"),    
    color: md3.inverseOnSurface,    
  },
  title_onlineStore:{
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.heading[30]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[50]),
    textWrap: 'balance',        
    color: md3.inverseOnSurface,    
  },
  // Heading variants
  h1: {
    fontFamily: fontFamilies.dm_sans,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.heading[10]),
    lineHeight: important(lineHeights.tight),
    letterSpacing: important(letterSpacing.scale[40]),
    textWrap: 'balance',
  },
  h2: {
    fontFamily: fontFamilies.dm_sans,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.heading[20]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[40]),
  },
  h3: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.heading[30]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[40]),
    textWrap: 'balance',
  },
  h4: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.heading[60]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[40]),
    textWrap: 'balance',
  },
  h5: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.heading[80]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[80]),
    textWrap: 'balance',
  },
  h6: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.semibold,
    fontSize: important(fontSizes.heading[90]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.slight),
    textWrap: 'balance',
  },

  // Body variants
  body1: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.body[10]),
    lineHeight: important(lineHeights.relaxed),
    letterSpacing: important(letterSpacing.subtle),
    textWrap: 'pretty',
  },
  body2: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.body[20]),
    lineHeight: important('calc(var(--wholestep) / var(--quarterstep))'),
    letterSpacing: important(letterSpacing.subtle),
    textWrap: 'balance',
  },

  // Subtitle variants
  subh3: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.body[20]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[80]),
  },
  subh4: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.caption[10]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[80]),
  },

  // Caption variants
  caption: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.caption[10]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[80]),
  },
  captionBold: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.semibold,
    fontSize: important(fontSizes.caption[10]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[80]),
  },
  captionSemiBold: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.caption[10]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[80]),
  },
  caption2: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.caption[20]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[80]),
  },

  // Utility variants
  button: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.heading[60]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[40]),
    textTransform: 'none',
    position: "static",
    top: "6.235em",
  },
  buttonSmall: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.body[10]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[40]),
    textTransform: 'none',
    position: "static",
    top: "6.235em",
  },
  buttonMedium: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.heading[90]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[40]),
    textTransform: 'none',
    position: "static",
    top: "6.235em",
  },
  buttonLarge: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.heading[50]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[40]),
    textTransform: 'none',
    position: "static",
    top: "6.235em",
  },
  overline: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.caption[10]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.wide),
    textTransform: 'uppercase',
  },
  fineprint: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.light,
    fontSize: important(fontSizes.caption[20]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[80]),
  },
  // Custom variants
  price: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.regular,
    fontSize: important(fontSizes.heading[45]),
    lineHeight: important(lineHeights.tight),
    letterSpacing: important(letterSpacing.scale[40]),
    textWrap: 'balance',
  },
  productTitle: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.medium,
    fontSize: important(fontSizes.heading[40]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[40]),
    textWrap: 'balance',
  },
  
  chip: {
    fontFamily: fontFamilies.inter,
    fontWeight: fontWeights.semibold,
    fontSize: important(fontSizes.heading[60]),
    lineHeight: important(lineHeights.normal),
    letterSpacing: important(letterSpacing.scale[40]),
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
