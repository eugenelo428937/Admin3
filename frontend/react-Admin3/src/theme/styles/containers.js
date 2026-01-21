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
  minHeight: "58vh",
  overflow: "hidden",
};

/**
 * Hero content styles.
 * Migrated from .hero-content in custom-bootstrap.css
 */
export const heroContentStyles = {
  minHeight: "calc(100vh * var(--wholestep-dec))",
  position: "relative",
  zIndex: 2,
};

/**
 * Body container styles (main content wrapper).
 * Migrated from .body-container in custom-bootstrap.css
 */
export const bodyContainerStyles = {
  paddingTop: 0,
  margin: 0,
  padding: 0,
  position: "relative",
  minHeight: "calc(100vh - 80px)",
  "@media (max-width: 768px)": {
    minHeight: "calc(100vh - 100px)",
  },
};

/**
 * Search results grid wrapper styles.
 */
export const searchResultsGridStyles = {
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

/**
 * Product list container styles.
 * Migrated from product_list.css
 */
export const productListContainerStyles = {
  maxWidth: "100%",
  paddingLeft: "0.5rem",
  paddingRight: "0.5rem",
  overflowX: "hidden",
};

/**
 * Products container grid styles.
 * Migrated from .products-container in product_list.css
 */
export const productsContainerStyles = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  width: "100%",
  maxWidth: "100%",
};

/**
 * Filter panel container styles.
 * Migrated from .filter-panel-container in product_list.css
 */
export const filterPanelContainerStyles = {
  flexShrink: 0,
  position: "sticky",
  height: "fit-content",
  maxHeight: "90vh",
  width: "16rem",
  maxWidth: "16rem",
};

/**
 * Main content area styles.
 * Migrated from .main-content-area in product_list.css
 */
export const mainContentAreaStyles = {
  minWidth: 0,
  flex: 1,
  maxWidth: "calc(100% - 300px)",
  overflowX: "hidden",
};

/**
 * Products meta section styles.
 * Migrated from .products-meta in product_list.css
 */
export const productsMetaStyles = {
  borderBottom: "1px solid #e0e0e0",
  marginBottom: "var(--lg)",
};

/**
 * Product header styles.
 * Migrated from .product-header in product_list.css
 */
export const productHeaderStyles = {
  borderBottom: "1px solid #e0e0e0",
};

/**
 * Filter dropdown styles.
 * Migrated from .filter-dropdown in product_list.css
 */
export const filterDropdownStyles = {
  borderRadius: "2rem",
};

/**
 * Responsive product container styles for mobile.
 */
export const productsContainerMobileStyles = {
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  "@media (max-width: 768px)": {
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  },
  "@media (max-width: 480px)": {
    gridTemplateColumns: "1fr",
    gap: "1rem",
  },
};

export default {
  heroContainerStyles,
  heroContentStyles,
  bodyContainerStyles,
  searchResultsGridStyles,
  centeredContainerStyles,
  overlayContainerStyles,
  productListContainerStyles,
  productsContainerStyles,
  filterPanelContainerStyles,
  mainContentAreaStyles,
  productsMetaStyles,
  productHeaderStyles,
  filterDropdownStyles,
  productsContainerMobileStyles,
};
