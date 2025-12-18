// Semantic Spacing Tokens
// Maps component-specific spacing to liftkit values

import liftKitTheme from '../liftKitTheme';

/**
 * Semantic spacing tokens for consistent component spacing.
 * Use these instead of raw spacing values in components.
 *
 * Example usage:
 *   sx={{ padding: theme.liftkit.semantic.card.padding }}
 */
export const semanticSpacing = {
  // Card spacing
  card: {
    padding: liftKitTheme.spacing.md,
    paddingLarge: liftKitTheme.spacing.lg,
    headerPadding: '1rem',
    contentPadding: liftKitTheme.spacing.md,
    actionsPadding: liftKitTheme.spacing.md,
    gap: liftKitTheme.spacing.sm,
  },

  // Badge spacing
  badge: {
    padding: liftKitTheme.spacing.sm,
    gap: liftKitTheme.spacing.xs2,
  },

  // Button spacing
  button: {
    padding: liftKitTheme.spacing.sm,
    iconSize: liftKitTheme.spacing.xl15,
    gap: liftKitTheme.spacing.xs,
  },

  // Form spacing
  form: {
    fieldGap: liftKitTheme.spacing.sm,
    sectionGap: liftKitTheme.spacing.lg,
    labelGap: liftKitTheme.spacing.xs2,
  },

  // Layout spacing
  layout: {
    containerPadding: liftKitTheme.spacing.lg,
    sectionGap: liftKitTheme.spacing.xl,
    itemGap: liftKitTheme.spacing.md,
  },

  // Navigation spacing
  navigation: {
    itemPadding: liftKitTheme.spacing.sm,
    menuGap: liftKitTheme.spacing.md,
  },
};

export default semanticSpacing;
