// Theme Entry Point
// Composes all theme modules into final MUI theme

import { createTheme } from "@mui/material/styles";
import "../styles/liftkit-css/globals.css";

// Import modules
import colorTheme from './colorTheme';
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
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});

// Apply responsive typography overrides
const applyResponsiveTypography = (typography) => {
  const result = { ...typography };

  // Apply breakpoint-specific overrides
  Object.entries(responsiveTypography).forEach(([variant, breakpoints]) => {
    if (result[variant]) {
      Object.entries(breakpoints).forEach(([breakpoint, styles]) => {
        result[variant] = {
          ...result[variant],
          [baseTheme.breakpoints.down(breakpoint)]: styles,
        };
      });
    }
  });

  // Add navlink color from colorTheme
  if (result.navlink) {
    result.navlink.color = colorTheme.offwhite["001"];
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
    primary: colorTheme.primary,
    secondary: colorTheme.secondary,
    tertiary: colorTheme.tertiary,
    error: colorTheme.error,
    warning: colorTheme.warning,
    info: colorTheme.info,
    success: colorTheme.success,
    background: colorTheme.background,
    surface: colorTheme.surface,
    text: colorTheme.text,
    offwhite: colorTheme.offwhite,
    bpp: colorTheme.bpp,
    md3: colorTheme.md3,
    liftkit: colorTheme.liftkit,
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
