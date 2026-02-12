/**
 * Navigation Semantic Tokens
 *
 * Nested semantic tokens for navigation component theming.
 *
 * Usage in components:
 * sx={{ color: 'navigation.text.primary' }}
 * sx={{ bgcolor: 'navigation.background.default' }}
 *
 * @see data-model.md for NavigationSemantics structure
 */

import { md3, scales, staticColors } from '../tokens/colors';

// =============================================================================
// Navigation Text Colors
// =============================================================================
export const text = {
  primary: md3.inverseOnSurface,
  secondary: md3.surfaceDim,
  active: scales.orange[110], 
  hover: scales.orange[110], 
};

// =============================================================================
// Navigation Border Colors
// =============================================================================
export const border = {
  subtle: md3.outlineVariant, // #C9C5D0 - Subtle dividers
  divider: scales.granite[20], // #d9d9d9 - Section dividers
  active: md3.primary, // #755085 - Active indicator
  focus: md3.primary, // #755085 - Focus ring
};

// =============================================================================
// Navigation Background Colors
// =============================================================================
export const background = {
  default: scales.granite[85], 
  active: scales.granite[90], 
  hover: scales.granite[95], 
  elevated: md3.surfaceContainerHigh, 
  dropdown: staticColors.white,
  overlay: 'rgba(0, 0, 0, 0.5)',
  topNavBar: scales.granite[90],
};

// =============================================================================
// Navigation Button Colors
// =============================================================================
export const button = {
  color: md3.primary, // #755085 - Button text
  hoverColor: md3.onPrimaryContainer, // #5C396C - Button hover text
  background: 'transparent', // Default transparent
  hoverBackground: md3.primaryContainer, // #F7D8FF - Button hover bg
  activeBackground: scales.purple[20], // #dfd4f7 - Button active bg
  icon: md3.surface,
};

// =============================================================================
// Mobile Navigation Colors
// =============================================================================
export const mobile = {
  icon: md3.onSurface, // #1C1B20 - Mobile menu icon
  iconActive: md3.primary, // #755085 - Active menu icon
  border: md3.outlineVariant, // #C9C5D0 - Mobile nav border
  title: md3.onSurface, // #1C1B20 - Mobile nav title
  background: staticColors.white, // #FFFFFF - Mobile nav background
  drawerBackground: md3.surface, // #FDF8FF - Drawer background
};

// =============================================================================
// Hamburger Menu Colors
// =============================================================================
export const hamburger = {
  hover: {
    background: scales.granite[70], // #525252 - Hamburger hover bg
  },
};

// =============================================================================
// Mega Menu Colors
// =============================================================================
export const megaMenu = {
  background: staticColors.white, // #FFFFFF - Mega menu background
  sectionTitle: md3.surfaceDim, // #1C1B20 - Section header
  itemText: md3.onSurfaceVariant, // #47464F - Menu item text
  itemHover: md3.surfaceContainerLow, // #F7F2FA - Item hover bg
  border: md3.outlineVariant, // #C9C5D0 - Section borders
  shadow: 'rgba(0, 0, 0, 0.1)', // Drop shadow
};

// =============================================================================
// Combined Navigation Export
// =============================================================================
export const navigation = {
  text,
  border,
  background,
  button,
  mobile,
  hamburger,
  megaMenu,
};

// =============================================================================
// Default Export
// =============================================================================
export default navigation;
