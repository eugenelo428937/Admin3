// Card Components Module
// Aggregates all card variant styles and exports MuiCard overrides

import baseProductCard from './baseProductCard';
import tutorialCard from './tutorialCard';
import materialCard from './materialCard';
import bundleCard from './bundleCard';
import onlineClassroomCard from './onlineClassroomCard';
import markingCard from './markingCard';
import markingVoucherCard from './markingVoucherCard';

// Re-export individual card styles for selective use
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
 * MUI component override structure for createTheme.
 * Aggregates all card variant styles into proper MuiCard override format.
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
      {
        props: { variant: "product" },
        style: baseProductCard,
      },
      {
        props: { variant: "product", producttype: "tutorial" },
        style: tutorialCard,
      },
      {
        props: { variant: "product", producttype: "material" },
        style: materialCard,
      },
      {
        props: { variant: "product", producttype: "bundle" },
        style: bundleCard,
      },
      {
        props: { variant: "product", producttype: "online-classroom" },
        style: onlineClassroomCard,
      },
      {
        props: { variant: "product", producttype: "marking" },
        style: markingCard,
      },
      {
        props: { variant: "product", producttype: "marking-voucher" },
        style: markingVoucherCard,
      },
    ],
  },
};

export default cardOverrides;
