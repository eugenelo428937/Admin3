// Card Components Module
// Aggregates all card variant styles and exports MuiCard overrides

import colorTheme from '../../colorTheme';
import baseProductCardStyles from './baseProductCard';
import tutorialCardStyles from './tutorialCard';
import materialCardStyles from './materialCard';
import bundleCardStyles from './bundleCard';
import onlineClassroomCardStyles from './onlineClassroomCard';
import markingCardStyles from './markingCard';
import markingVoucherCardStyles from './markingVoucherCard';

/**
 * MuiCard component overrides with all product card variants.
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
  MuiCard: {
    styleOverrides: {
      root: {
        backgroundColor: "var(--md-sys-color-surface-container-lowest_lkv)",
      },
    },
    variants: [
      // Base product card variant
      {
        props: { variant: "product" },
        style: baseProductCardStyles,
      },
      // Tutorial Product Card Variant
      {
        props: { variant: "product", producttype: "tutorial" },
        style: tutorialCardStyles,
      },
      // Material Product Card Variant
      {
        props: { variant: "product", producttype: "material" },
        style: materialCardStyles,
      },
      // Bundle Product Card Variant
      {
        props: { variant: "product", producttype: "bundle" },
        style: bundleCardStyles,
      },
      // Online Classroom Product Card Variant
      {
        props: { variant: "product", producttype: "online-classroom" },
        style: onlineClassroomCardStyles,
      },
      // Marking Product Card Variant
      {
        props: { variant: "product", producttype: "marking" },
        style: markingCardStyles,
      },
      // Marking Voucher Product Card Variant
      {
        props: { variant: "product", producttype: "marking-voucher" },
        style: markingVoucherCardStyles,
      },
    ],
  },
};

// Export individual card styles for direct use if needed
export {
  baseProductCardStyles,
  tutorialCardStyles,
  materialCardStyles,
  bundleCardStyles,
  onlineClassroomCardStyles,
  markingCardStyles,
  markingVoucherCardStyles,
};

export default cardOverrides;
