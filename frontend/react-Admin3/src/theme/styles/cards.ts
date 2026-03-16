// Card Style Objects
// Reusable styles for card-related patterns

/**
 * No results card styles.
 */
export const noResultsCardStyles = {
  textAlign: "center",
  py: 5,
} as const;

/**
 * Search icon styles for empty state.
 */
export const emptyStateIconStyles = {
  fontSize: 48,
  color: "text.secondary",
  mb: 3,
} as const;

export default {
  noResultsCardStyles,
  emptyStateIconStyles,
} as const;
