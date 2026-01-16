/**
 * Common Semantic Tokens
 *
 * Flat semantic tokens for everyday styling needs.
 * These map purpose-driven names to raw color values from tokens/colors.js.
 *
 * Usage in components:
 * sx={{ color: 'semantic.textPrimary' }}
 * sx={{ bgcolor: 'semantic.bgPaper' }}
 *
 * @see data-model.md for full token structure
 */

import { md3, scales, staticColors } from '../tokens/colors';

// =============================================================================
// Text Colors
// =============================================================================
export const text = {
  primary: md3.onSurface, // #1C1B20 - Main text
  secondary: md3.onSurfaceVariant, // #47464F - Muted text
  disabled: md3.outline, // #787680 - Disabled text
  inverse: md3.inverseOnSurface, // #F4EFF7 - Text on dark backgrounds
  onPrimary: md3.onPrimary, // #FFFFFF - Text on primary color
  onSecondary: md3.onSecondary, // #FFFFFF - Text on secondary color
  onError: md3.onError, // #FFFFFF - Text on error color
  hint: scales.granite[50], // #848484 - Hint/placeholder text
};

// =============================================================================
// Background Colors
// =============================================================================
export const background = {
  default: md3.background, // #FFF7FB - Page background
  paper: md3.surface, // #FDF8FF - Card/paper background
  elevated: md3.surfaceContainerHigh, // #EBE6EE - Elevated surfaces
  subtle: md3.surfaceContainerLow, // #F7F2FA - Subtle background
  container: md3.surfaceContainer, // #F1ECF4 - Container background
  containerLowest: md3.surfaceContainerLowest, // #FFFFFF - Lowest elevation
  containerHighest: md3.surfaceContainerHighest, // #E6E1E9 - Highest elevation
  dim: md3.surfaceDim, // #DDD8E0 - Dimmed background
  bright: md3.surfaceBright, // #FDF8FF - Bright background
};

// =============================================================================
// Interactive/Action Colors
// =============================================================================
export const action = {
  hover: md3.surfaceContainerHigh, // Hover state background
  selected: md3.surfaceContainerHighest, // Selected state background
  disabled: md3.surfaceContainerLow, // Disabled state background
  disabledBackground: scales.granite[10], // Disabled background fill
  focus: md3.primary, // Focus indicator color
};

// =============================================================================
// Border Colors
// =============================================================================
export const border = {
  default: md3.outlineVariant, // #C9C5D0 - Standard borders
  strong: md3.outline, // #787680 - Emphasized borders
  subtle: scales.granite[20], // #d9d9d9 - Subtle borders
  focus: md3.primary, // #755085 - Focus ring color
};

// =============================================================================
// Status Colors
// =============================================================================
export const status = {
  error: md3.error, // #904A43 - Error state
  errorContainer: md3.errorContainer, // #FFDAD5 - Error background
  onError: md3.onError, // #FFFFFF - Text on error
  onErrorContainer: md3.onErrorContainer, // #73342D - Text on error container

  warning: scales.orange[50], // #e85100 - Warning state
  warningContainer: scales.orange[10], // #fff2eb - Warning background
  onWarning: staticColors.white, // #FFFFFF - Text on warning
  onWarningContainer: scales.orange[80], // #7d0000 - Text on warning container

  success: scales.green[60], // #007a46 - Success state
  successContainer: scales.green[10], // #dbfaed - Success background
  onSuccess: staticColors.white, // #FFFFFF - Text on success
  onSuccessContainer: scales.green[80], // #004514 - Text on success container

  info: scales.cobalt[60], // #2a65ce - Info state
  infoContainer: scales.cobalt[10], // #e9f1ff - Info background
  onInfo: staticColors.white, // #FFFFFF - Text on info
  onInfoContainer: scales.cobalt[80], // #003195 - Text on info container
};

// =============================================================================
// Primary/Brand Colors
// =============================================================================
export const primary = {
  main: md3.primary, // #755085 - Primary brand color
  light: md3.primaryContainer, // #F7D8FF - Light primary
  dark: md3.onPrimaryContainer, // #5C396C - Dark primary
  contrastText: md3.onPrimary, // #FFFFFF - Text on primary
};

// =============================================================================
// Flat Semantic Export (for sx prop string paths)
// Usage: sx={{ color: 'semantic.textPrimary' }}
// =============================================================================
export const semantic = {
  // Text
  textPrimary: text.primary,
  textSecondary: text.secondary,
  textDisabled: text.disabled,
  textInverse: text.inverse,
  textOnPrimary: text.onPrimary,
  textHint: text.hint,

  // Backgrounds
  bgDefault: background.default,
  bgPaper: background.paper,
  bgElevated: background.elevated,
  bgSubtle: background.subtle,
  bgContainer: background.container,
  bgDim: background.dim,

  // Actions
  actionHover: action.hover,
  actionSelected: action.selected,
  actionDisabled: action.disabled,
  actionFocus: action.focus,

  // Borders
  borderDefault: border.default,
  borderStrong: border.strong,
  borderSubtle: border.subtle,
  borderFocus: border.focus,

  // Status
  statusError: status.error,
  statusErrorBg: status.errorContainer,
  statusWarning: status.warning,
  statusWarningBg: status.warningContainer,
  statusSuccess: status.success,
  statusSuccessBg: status.successContainer,
  statusInfo: status.info,
  statusInfoBg: status.infoContainer,

  // Primary
  primaryMain: primary.main,
  primaryLight: primary.light,
  primaryDark: primary.dark,
  primaryContrast: primary.contrastText,
};

// =============================================================================
// Default Export
// =============================================================================
const common = {
  text,
  background,
  action,
  border,
  status,
  primary,
  semantic,
};

export default common;
