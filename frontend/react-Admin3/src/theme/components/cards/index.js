// Card Components Module
// Aggregates all card variant styles and exports MuiCard overrides

import baseProductCard from './baseProductCard';
import tutorialCard from './tutorialCard';
import materialCard from './materialCard';
import bundleCard from './bundleCard';
import onlineClassroomCard from './onlineClassroomCard';
import markingCard from './markingCard';
import markingVoucherCard from './markingVoucherCard';

// Export individual card styles for direct use if needed
export {
  baseProductCard,
  tutorialCard,
  materialCard,
  bundleCard,
  onlineClassroomCard,
  markingCard,
  markingVoucherCard
};

/**
 * Combined card overrides object for Material-UI theme.
 * Aggregates all card variant styles into a single export.
 *
 * Usage in components:
 *   <Card variant="product" producttype="tutorial">
 *   <Card variant="product" producttype="material">
 *   <Card variant="product" producttype="bundle">
 *   <Card variant="product" producttype="online-classroom">
 *   <Card variant="product" producttype="marking">
 *   <Card variant="product" producttype="marking-voucher">
 */
export const cardOverrides = {
  baseProductCard,
  tutorialCard,
  materialCard,
  bundleCard,
  onlineClassroomCard,
  markingCard,
  markingVoucherCard
};

export default cardOverrides;
