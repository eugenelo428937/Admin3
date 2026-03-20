// Theme Entry Point
// Composes all theme modules into final MUI theme

import { createTheme } from "@mui/material/styles";

// Import from consolidated token layer (single source of truth)
import { md3, scales, staticColors } from './tokens/colors';

import { typographyConfig, responsiveTypography } from './typography/index';
import componentOverrides from './components/index';
import { createGradientStyle, gradientColorSchemes } from './utils/index';
import { spacing, semanticSpacing, gaps, formulatedSpacing } from './spacing/index';
import { shadows } from './styles/shadows';

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
      xl: 1440,
      xxl: 1920,
    } as any,
  },
});

// Apply responsive typography overrides
const applyResponsiveTypography = (typography: Record<string, any>): Record<string, any> => {
  const result = { ...typography };

  // Apply breakpoint-specific overrides
  Object.entries(responsiveTypography).forEach(([variant, breakpoints]) => {
    if (result[variant]) {
      Object.entries(breakpoints as Record<string, any>).forEach(([breakpoint, styles]) => {
        result[variant] = {
          ...result[variant],
          [baseTheme.breakpoints.down(breakpoint as any)]: styles,
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
  typography: applyResponsiveTypography(typographyConfig) as any,

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

    gap: gaps,

    // Navigation semantic tokens
    // Usage: sx={{ color: 'navigation.text.primary' }}
    navigation: navigation,

    action: {
      hoverOpacity: 0.08,      // default is 0.04
      activeOpacity: 0.1,   // default is 0.08
      focused : {
        opacity : 0.1,
        ringOpacity : 0.6,
      },
      disabled : {
        text : {
          colour : "#1D1B20",
          opacity: 0.38,
        },
        container : {
          opacity: 0.1,
        }
      }
    },
  } as any,

  // Calculate 8 * (1.618 ^ (factor - 1)) for exponential growth
    // or use a Fibonacci sequence approach.
    // spacing[1] :1px
    // spacing[2] :3.236px
    // spacing[3] :7.853772px
    // spacing[4] :16.943204128px
    // spacing[5] :34.26763034888px
    // spacing[6] :66.5340310853854px
    // spacing[7] :125.594072678846px
    // spacing[8] :232.241382393569px
  spacing: formulatedSpacing as any,

  // Custom spacing tokens (for direct access via theme.spacingTokens.xl, etc.)
  // Usage: theme.spacingTokens.lg, theme.spacingTokens.xl
  spacingTokens: spacing,

  shadows : shadows.shades as any,

  // Component overrides from modules
  components: componentOverrides as any,

  gaps: gaps,

  // Custom gradient utilities
  gradients: {
    createGradientStyle,
    colorSchemes: gradientColorSchemes,
  },
} as any);

// Exports
export default theme;
export { typographyConfig as typographyTheme };
export { semanticSpacing, spacing };
export { createGradientStyle, gradientColorSchemes };
export { scales, semantic, productCards, navigation };
