// Theme Entry Point
// Composes all theme modules into final MUI theme

import { createTheme } from "@mui/material/styles";
import "../styles/liftkit-css/globals.css";

// Import modules
import {colorTheme, palettesTheme} from './colors';
import liftKitTheme from './liftKitTheme';
import { typographyConfig, responsiveTypography } from './typography';
import componentOverrides from './components';
import { createGradientStyle, gradientColorSchemes } from './utils';
import { semanticColors } from './colors/semantic';
import { semanticSpacing } from './spacing/semantic';

// Base theme with breakpoints
const baseTheme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
});

// Apply responsive typography overrides
const applyResponsiveTypography = (typography) =>
{
  const result = { ...typography };

  // Apply breakpoint-specific overrides
  Object.entries(responsiveTypography).forEach(([variant, breakpoints]) =>
  {
    if (result[variant])
    {
      Object.entries(breakpoints).forEach(([breakpoint, styles]) =>
      {
        result[variant] = {
          ...result[variant],
          [baseTheme.breakpoints.down(breakpoint)]: styles,
        };
      });
    }
  });

  // Add navlink color from colorTheme
  if (result.navlink)
  {
    result.navlink.color = colorTheme.palette.offwhite["001"];
  }

  return result;
};

/**
 * Main application theme.
 *
 * Structure:
 * - typography: All text styles (h1-h6, body, custom variants)
 * - palette: Colors (primary, secondary, bpp, md3, liftkit, semantic)
 * - components: MUI component overrides
 * - liftkit: Spacing and typography tokens
 * - gradients: Gradient utilities
 */
const theme = createTheme({
  ...baseTheme,

  // Typography with responsive overrides
  typography: applyResponsiveTypography(typographyConfig),

  // Enhanced palette with all color systems
  palette: {
    primary: { main: palettesTheme.primary, },
    secondary: { main: palettesTheme.secondary, },
    tertiary: { main: palettesTheme.tertiary, },
    error: { main: palettesTheme.error, },
    warning: colorTheme.palette.warning, 
    info: colorTheme.palette.info,
    success: colorTheme.palette.success,
    background: { main: palettesTheme.background, },
    surface: { main: palettesTheme.surface, },
    text: colorTheme.palette.text,
    // BPP Color Scales
    offwhite: colorTheme.palette.offwhite,
    granite: colorTheme.palette.granite,
    purple: colorTheme.palette.purple,
    sky: colorTheme.palette.sky,
    mint: colorTheme.palette.mint,
    orange: colorTheme.palette.orange,
    pink: colorTheme.palette.pink,
    yellow: colorTheme.palette.yellow,
    cobalt: colorTheme.palette.cobalt,
    green: colorTheme.palette.green,
    red: colorTheme.palette.red,
    // Design System Colors
    bpp: colorTheme.palette.bpp,
    md3: colorTheme.palette.md3,
    liftkit: colorTheme.palette.liftkit,
    // Semantic colors for easy access
    semantic: semanticColors,
  },

  // Component overrides from modules
  components: componentOverrides,

  // Liftkit spacing and typography system
  liftkit: {
    spacing: liftKitTheme.spacing,
    typography: liftKitTheme.typography,
    semantic: semanticSpacing,
  },

  // Custom gradient utilities
  gradients: {
    createGradientStyle,
    colorSchemes: gradientColorSchemes,
  },
});

// Re-export everything for backward compatibility
export default theme;
export { liftKitTheme, colorTheme };
export { typographyConfig as typographyTheme };
export { semanticColors, semanticSpacing };
export { createGradientStyle, gradientColorSchemes };
