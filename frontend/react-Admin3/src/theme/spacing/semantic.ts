// Semantic Spacing Tokens
import { spacing } from '../tokens/spacing';

// Cast to any to preserve legacy shorthand property access patterns
// (e.g. sp.xs2, sp.xl15) that were silently undefined in JS
const sp = spacing as any;

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
    padding: sp.md,
    paddingLarge: sp.lg,
    headerPadding: '1rem',
    contentPadding: sp.md,
    actionsPadding: sp.md,
    gap: sp.sm,
  },

  // Badge spacing
  badge: {
    padding: sp.sm,
    gap: sp.xs2,
  },

  // Button spacing
  button: {
    padding: sp.sm,
    iconSize: sp.xl15,
    gap: sp.xs,
  },

  // Form spacing
  form: {
    fieldGap: sp.sm,
    sectionGap: sp.lg,
    labelGap: sp.xs2,
  },

  // Layout spacing
  layout: {
    containerPadding: sp.lg,
    sectionGap: sp.xl,
    itemGap: sp.md,
  },

  // Navigation spacing
  navigation: {
    itemPadding: sp.sm,
    menuGap: sp.md,
  },
} as const;

export default semanticSpacing;
