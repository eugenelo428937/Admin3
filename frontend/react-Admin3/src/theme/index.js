// Theme Entry Point
// Composes all theme modules into final MUI theme

import { createTheme } from "@mui/material/styles";

// Import from consolidated token layer (single source of truth)
import { md3, scales, staticColors } from './tokens/colors';

import { typographyConfig, responsiveTypography } from './typography';
import componentOverrides from './components';
import { createGradientStyle, gradientColorSchemes } from './utils';
import { spacing, semanticSpacing } from './spacing';

// Import semantic layer
import { semantic } from './semantic/common';
import productCards from './semantic/productCards';
import navigation from './semantic/navigation';

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

  // Add navlink color (light text for dark nav bar)
  if (result.navlink) {
    result.navlink.color = md3.inverseOnSurface;
  }

  return result;
};

/**
 * Main application theme.
 *
 * Structure:
 * - typography: All text styles (h1-h6, body, custom variants)
 * - palette: Colors (primary, secondary, semantic, productCards, navigation, scales)
 * - components: MUI component overrides
 * - gradients: Gradient utilities
 */
const theme = createTheme({
  ...baseTheme,

  // Typography with responsive overrides
  typography: applyResponsiveTypography(typographyConfig),

  // Palette with MD3 system colors and semantic tokens
  palette: {
    // MD3 system colors (direct access for components)
    // Usage: theme.palette.md3.surfaceVariant
    md3: md3,

    // MUI standard roles from MD3
    primary: { main: md3.primary },
    secondary: { main: md3.secondary },
    tertiary: { main: md3.tertiary },
    error: { main: md3.error },
    warning: { main: scales.orange[50] },
    info: { main: scales.cobalt[60] },
    success: { main: scales.green[60] },
    background: { default: md3.background, paper: staticColors.white },
    surface: { main: md3.surface },
    text: {
      primary: md3.onSurface,
      secondary: md3.onSurfaceVariant,
    },

    // Raw scales access for theme layer only
    // Components should NOT access this directly - use semantic tokens
    scales: scales,

    // Flat semantic tokens for common styling
    // Usage: sx={{ color: 'semantic.textPrimary', bgcolor: 'semantic.bgPaper' }}
    semantic: {
      ...semantic,
    },

    // Product card semantic tokens
    // Usage: sx={{ bgcolor: 'productCards.tutorial.header' }}
    productCards: productCards,

    // Navigation semantic tokens
    // Usage: sx={{ color: 'navigation.text.primary' }}
    navigation: navigation,
  },
  
  spacing: spacing.xs,

  // Custom spacing tokens (for direct access via theme.spacingTokens.xl, etc.)
  // Usage: theme.spacingTokens.lg, theme.spacingTokens.xl
  spacingTokens: spacing,

  // Component overrides from modules
  components: componentOverrides,

  // Custom gradient utilities
  gradients: {
    createGradientStyle,
    colorSchemes: gradientColorSchemes,
  },
});

// Exports
export default theme;
export { typographyConfig as typographyTheme };
export { semanticSpacing, spacing };
export { createGradientStyle, gradientColorSchemes };
export { scales, semantic, productCards, navigation };
