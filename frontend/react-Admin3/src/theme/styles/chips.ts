// Chip Style Objects
// Migrated from custom-bootstrap.css chip styles

/**
 * Subject chip styles.
 * Usage: <Chip sx={subjectChipStyles} />
 */
export const subjectChipStyles = {
  backgroundColor: "var(--light__primarycontainer_lkv)",
} as const;

/**
 * Session chip styles.
 * Usage: <Chip sx={sessionChipStyles} />
 */
export const sessionChipStyles = {
  backgroundColor: "var(--light__secondarycontainer_lkv)",
} as const;

/**
 * Product chip styles.
 * Usage: <Chip sx={productChipStyles} />
 */
export const productChipStyles = {
  backgroundColor: "#fff3cd",
} as const;

export default {
  subjectChipStyles,
  sessionChipStyles,
  productChipStyles,
} as const;
