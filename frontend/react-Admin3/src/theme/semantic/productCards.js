/**
 * Product Card Semantic Tokens
 *
 * Nested semantic tokens for product card theming.
 * Each product type has a consistent token structure.
 *
 * Usage in components:
 * sx={{ bgcolor: 'productCards.tutorial.header' }}
 * sx={(theme) => ({ bgcolor: theme.palette.productCards[type].header })}
 *
 * @see data-model.md for ProductCardColors structure
 */

import { scales, staticColors } from '../tokens/colors';

// =============================================================================
// Product Card Token Structure
// Each product type follows this pattern:
// - header: Card header background
// - actions: Action area background
// - badge: Badge background
// - title: Title text color
// - subtitle: Subtitle text color
// - button: Button background
// - buttonHover: Button hover state
// - icon: Icon color
// =============================================================================

// =============================================================================
// Tutorial (Purple theme)
// =============================================================================
export const tutorial = {
  header: scales.purple[20], // #dfd4f7 - Light purple header
  actions: scales.purple[10], // #f1eefc - Very light purple actions
  badge: scales.purple[30], // #beb1ee - Badge background
  title: scales.purple[90], // #310075 - Dark purple title
  subtitle: scales.purple[70], // #6332b9 - Medium purple subtitle
  button: scales.purple[60], // #7950d1 - Button background
  buttonHover: scales.purple[70], // #6332b9 - Button hover
  icon: scales.purple[50], // #8f72dc - Icon color
  accent: scales.purple[110], // #8953fd - Accent color
};

// =============================================================================
// Material (Sky blue theme)
// =============================================================================
export const material = {
  header: scales.sky[20], // #8ae6ff - Light blue header
  actions: scales.sky[10], // #e5f9ff - Very light blue actions
  badge: scales.sky[30], // #2bcbf8 - Badge background
  title: scales.sky[90], // #00264e - Dark blue title
  subtitle: scales.sky[70], // #005782 - Medium blue subtitle
  button: scales.sky[60], // #006f99 - Button background
  buttonHover: scales.sky[70], // #005782 - Button hover
  icon: scales.sky[50], // #008ebb - Icon color
  accent: scales.sky[110], // #23cefd - Accent color
};

// =============================================================================
// Bundle (Green theme)
// =============================================================================
export const bundle = {
  header: scales.green[20], // #b4e4cf - Light green header
  actions: scales.green[10], // #dbfaed - Very light green actions
  badge: scales.green[30], // #7dcaa8 - Badge background
  title: scales.green[90], // #002e12 - Dark green title
  subtitle: scales.green[70], // #005f2d - Medium green subtitle
  button: scales.green[60], // #007a46 - Button background
  buttonHover: scales.green[70], // #005f2d - Button hover
  icon: scales.green[50], // #2f9569 - Icon color
  accent: scales.green[110], // #00e582 - Accent color
};

// =============================================================================
// Online Classroom (Cobalt theme)
// =============================================================================
export const onlineClassroom = {
  header: scales.cobalt[20], // #c7daff - Light cobalt header
  actions: scales.cobalt[10], // #e9f1ff - Very light cobalt actions
  badge: scales.cobalt[30], // #94bcff - Badge background
  title: scales.cobalt[90], // #00147b - Dark cobalt title
  subtitle: scales.cobalt[70], // #0e4cb1 - Medium cobalt subtitle
  button: scales.cobalt[60], // #2a65ce - Button background
  buttonHover: scales.cobalt[70], // #0e4cb1 - Button hover
  icon: scales.cobalt[50], // #4481ec - Icon color
  accent: scales.cobalt[110], // #518ffb - Accent color
};

// =============================================================================
// Marking (Pink theme)
// =============================================================================
export const marking = {
  header: scales.pink[20], // #ffccdd - Light pink header
  actions: scales.pink[10], // #fff0f7 - Very light pink actions
  badge: scales.pink[30], // #ff9bbd - Badge background
  title: scales.pink[90], // #540014 - Dark pink title
  subtitle: scales.pink[70], // #a4004b - Medium pink subtitle
  button: scales.pink[60], // #cf006c - Button background
  buttonHover: scales.pink[70], // #a4004b - Button hover
  icon: scales.pink[50], // #f33089 - Icon color
  accent: scales.pink[110], // #fa388e - Accent color
};

// =============================================================================
// Marking Voucher (Orange theme)
// =============================================================================
export const markingVoucher = {
  header: scales.orange[20], // #ffcfb8 - Light orange header
  actions: scales.orange[10], // #fff2eb - Very light orange actions
  badge: scales.orange[30], // #ffa27a - Badge background
  title: scales.orange[90], // #550000 - Dark orange title
  subtitle: scales.orange[70], // #a90000 - Medium orange subtitle
  button: scales.orange[60], // #c83000 - Button background
  buttonHover: scales.orange[70], // #a90000 - Button hover
  icon: scales.orange[50], // #e85100 - Icon color
  accent: scales.orange[110], // #ff6717 - Accent color
};

// =============================================================================
// Combined Export (for theme.palette.productCards)
// =============================================================================
export const productCards = {
  tutorial,
  material,
  bundle,
  onlineClassroom,
  marking,
  markingVoucher,
};

// =============================================================================
// Helper: Get colors by product type (for dynamic access)
// =============================================================================
export const getProductCardColors = (productType) => {
  return productCards[productType] || tutorial; // Default to tutorial
};

// =============================================================================
// Default Export
// =============================================================================
export default productCards;
