// Container Style Objects
// Reusable styles for common container patterns

/**
 * Hero section container styles.
 * Usage: <Container sx={heroContainerStyles}>
 */
export const heroContainerStyles = {
  position: "relative",
  zIndex: 3,
  display: "flex",
  flexDirection: "column",
};

/**
 * Search results container styles.
 */
export const searchResultsContainerStyles = {
  mt: 2,
  mb: 3,
  justifyContent: "center",
  alignItems: "center",
};

/**
 * Centered content container.
 */
export const centeredContainerStyles = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

/**
 * Full-width overlay container.
 */
export const overlayContainerStyles = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
};

export default {
  heroContainerStyles,
  searchResultsContainerStyles,
  centeredContainerStyles,
  overlayContainerStyles,
};
