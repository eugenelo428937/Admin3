/**
 * Semantic Layer Index
 *
 * Central export point for all semantic tokens.
 * Semantic tokens map purpose-driven names to raw token values.
 *
 * Usage:
 * import { semantic, productCards, navigation } from '../theme/semantic';
 *
 * In sx prop:
 * sx={{ color: 'semantic.textPrimary' }}
 * sx={{ bgcolor: 'productCards.tutorial.header' }}
 * sx={{ color: 'navigation.text.primary' }}
 */

// Common semantic tokens (flat structure)
export { default as common, semantic, text, background, action, border, status, primary } from './common';

// Product card semantic tokens (nested by product type)
export { default as productCards, tutorial, material, bundle, onlineClassroom, marking, markingVoucher, getProductCardColors } from './productCards';

// Navigation semantic tokens (nested structure)
export { default as navigation } from './navigation';
export { text as navText, border as navBorder, background as navBackground, button as navButton, mobile as navMobile, megaMenu } from './navigation';

// Re-import for consolidated export
import { semantic as commonSemantic } from './common';
import productCardsDefault from './productCards';
import navigationDefault from './navigation';

// Type re-exports
export type { TextColors, BackgroundColors, ActionColors, BorderColors, StatusColors, PrimaryColors, A11yColors, SemanticColors, CommonTokens } from './common';
export type { ProductCardColors, ProductCardType, ProductCardsTokens } from './productCards';
export type { NavTextColors, NavBorderColors, NavBackgroundColors, NavButtonColors, NavMobileColors, NavHamburgerColors, NavMegaMenuColors, NavigationTokens } from './navigation';

// Consolidated export for theme composition
const semanticTokens = {
  common: commonSemantic,
  productCards: productCardsDefault,
  navigation: navigationDefault,
} as const;

export type SemanticTokens = typeof semanticTokens;

export default semanticTokens;
