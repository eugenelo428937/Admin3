// Semantic Spacing Tokens
import tokens from '../tokens'

/**
 * Semantic spacing tokens for consistent component spacing.
 * Use these instead of raw spacing values in components.
 *
 * Example usage:
 *   sx={{ padding: theme.semantic.card.padding }}
 */

export const semanticSpacing = {
  // Card spacing
  card: {
    padding: tokens.spacing.md,
    paddingLarge: tokens.spacing.lg,
    headerPadding: '1rem',
    contentPadding: tokens.spacing.md,
    actionsPadding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },

  // Badge spacing
  badge: {
    padding: tokens.spacing.sm,
    gap: tokens.spacing.xs2,
  },

  // Button spacing
  button: {
    padding: tokens.spacing.sm,
    iconSize: tokens.spacing.xl15,
    gap: tokens.spacing.xs,
  },

  // Form spacing
  form: {
    fieldGap: tokens.spacing.sm,
    sectionGap: tokens.spacing.lg,
    labelGap: tokens.spacing.xs2,
  },

  // Layout spacing
  layout: {
    containerPadding: tokens.spacing.lg,
    sectionGap: tokens.spacing.xl,
    itemGap: tokens.spacing.md,
  },

  // Navigation spacing
  navigation: {
    itemPadding: tokens.spacing.sm,
    menuGap: tokens.spacing.md,
  },
};

export default semanticSpacing;
