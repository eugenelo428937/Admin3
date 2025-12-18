// Typography Module
// All typography variants extracted from theme.js

import liftKitTheme from '../liftKitTheme';
import typographyTheme from '../typographyTheme';

// Re-export typographyTheme for backward compatibility
export { typographyTheme };

/**
 * Typography configuration for MUI theme.
 * Includes standard MUI variants and custom variants (BPP, Acted, navlink, etc.)
 */
export const typographyConfig = {
  BPP: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    fontSize: "calc(1em * var(--wholestep) * var(--wholestep) * var(--wholestep)) !important",
    lineHeight: "var(--halfstep-dec) !important",
    letterSpacing: "-0.022em",
    fontOpticalSizing: "auto",
    fontStyle: "normal",
    fontVariationSettings: "'wght' 600",
  },
  Acted: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 200,
    fontSize: "calc(1em * var(--wholestep) * var(--wholestep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.022em !important",
    fontOpticalSizing: "auto",
    fontStyle: "normal",
    fontVariationSettings: "'wght' 200",
    marginTop: "calc( var(--2xs) / var(--halfstep) / var(--halfstep) / var(--eighthstep))",
  },
  h1: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em * var(--wholestep) * var(--wholestep) * var(--wholestep)) !important",
    lineHeight: "var(--quarterstep) !important",
    letterSpacing: "-0.022em !important",
    textWrap: "balance",
  },
  h2: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em * var(--wholestep) * var(--wholestep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.022em !important",
  },
  h3: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em * var(--wholestep) * var(--halfstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.022em !important",
    textWrap: "balance",
  },
  price: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em * var(--wholestep) * var(--eighthstep)) !important",
    lineHeight: "var(--quarterstep) !important",
    letterSpacing: "-0.022em !important",
    textWrap: "balance",
  },
  h4: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em * var(--wholestep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.02em !important",
    textWrap: "balance",
  },
  productTitle: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 500,
    fontSize: "calc(1em * var(--halfstep) * var(--quarterstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.02em !important",
    textWrap: "balance",
  },
  h5: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 500,
    fontSize: "calc(1em * var(--halfstep) * var(--eighthstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.017em !important",
    textWrap: "balance",
  },
  navlink: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 500,
    fontSize: "calc( 1em * var(--quarterstep) )!important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.004em !important",
    textTransform: "none",
    position: "static",
    top: "6.235em",
  },
  topnavlink: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 300,
    fontSize: "calc(1em * var(--quarterstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.017em !important",
    textWrap: "balance",
  },
  h6: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 600,
    fontSize: "calc(1em * var(--quarterstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.014em !important",
    textWrap: "balance",
  },
  subtitle1: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em / var(--quarterstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.007em !important",
  },
  subtitle2: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em / var(--halfstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.007em !important",
  },
  body1: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "1em !important",
    lineHeight: "var(--wholestep) !important",
    letterSpacing: "-0.011em !important",
    textWrap: "pretty",
  },
  body2: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em / var(--quarterstep)) !important",
    lineHeight: "calc(var(--wholestep) / var(--quarterstep)) !important",
    letterSpacing: "-0.011em !important",
    textWrap: "balance",
  },
  button: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 500,
    fontSize: "calc( 1em * var(--eighthstep) )!important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.004em !important",
    textTransform: "none",
    position: "static",
    top: "6.235em",
  },
  chip: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 600,
    fontSize: "calc( 1em * var(--quarterstep) )!important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.004em !important",
    textTransform: "none",
    position: "static",
    top: "6.235em",
  },
  caption: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em / var(--halfstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.007em !important",
  },
  captionBold: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 600,
    fontSize: "calc(1em / var(--halfstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.007em !important",
  },
  captionSemiBold: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 500,
    fontSize: "calc(1em / var(--halfstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.007em !important",
  },
  caption2: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em / var(--halfstep) / var(--quarterstep) ) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.007em !important",
  },
  overline: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em / var(--halfstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "0.0618em !important",
    textTransform: "uppercase",
  },
  fineprint: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 200,
    fontSize: "calc(1em /  var(--halfstep)/  var(--quarterstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.007em !important",
  },
};

/**
 * Responsive typography overrides.
 * Applied via breakpoints in the main theme.
 */
export const responsiveTypography = {
  BPP: {
    sm: {
      fontSize: "calc(1em * var(--wholestep) * var(--wholestep) * var(--halfstep)) !important",
      textAlign: "start",
      lineHeight: "calc(1em * var(--wholestep-dec) * var(--eighthstep)) !important",
    },
  },
  Acted: {
    sm: {
      fontSize: "calc(1em * var(--wholestep) * var(--halfstep)) !important",
      textAlign: "start",
      lineHeight: "calc(1em * var(--wholestep-dec) * var(--quarterstep) * var(--eighthstep) * var(--eighthstep)) !important",
      marginBottom: liftKitTheme.spacing.xs3,
    },
  },
  h3: {
    sm: {
      fontSize: "calc(1em * var(--wholestep) * var(--eighthstep)) !important",
    },
  },
  price: {
    sm: {
      fontSize: "calc(1em * var(--wholestep) * var(--eighthstep)) !important",
    },
  },
  navlink: {
    lg: {
      fontSize: "calc(1em * var(--quarterstep)) !important",
      fontWeight: 400,
    },
    md: {
      fontSize: "1em !important",
      fontWeight: 400,
    },
  },
  topnavlink: {
    lg: {
      fontSize: "calc(1em) !important",
      fontWeight: 400,
    },
  },
};

export default typographyConfig;
