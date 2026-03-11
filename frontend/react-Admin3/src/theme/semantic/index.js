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
export { default as common, semantic, text, background, action, border, status, primary } from './common.js';

// Product card semantic tokens (nested by product type)
export { default as productCards, tutorial, material, bundle, onlineClassroom, marking, markingVoucher, getProductCardColors } from './productCards.js';

// Navigation semantic tokens (nested structure)
export { default as navigation } from './navigation.js';
export { text as navText, border as navBorder, background as navBackground, button as navButton, mobile as navMobile, megaMenu } from './navigation.js';

// Re-import for consolidated export
import { semantic as commonSemantic } from './common.js';
import productCardsDefault from './productCards.js';
import navigationDefault from './navigation.js';

// Consolidated export for theme composition
const semanticTokens = {
  common: commonSemantic,
  productCards: productCardsDefault,
  navigation: navigationDefault,
};

export default semanticTokens;
