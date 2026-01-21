// Search Component Style Objects
// Migrated from search_box.css and search_results.css

/**
 * Search box container styles
 * Migrated from .search-box-container in search_box.css
 */
export const searchBoxContainerStyles = {
  position: 'relative',
  width: '100%',
  maxWidth: '23rem',
  margin: '0 auto',
  zIndex: 999,
  overflow: 'visible',
  transform: 'translateZ(0)',
  willChange: 'transform',
};

/**
 * Search input wrapper styles
 * Migrated from .search-input-wrapper in search_box.css
 */
export const searchInputWrapperStyles = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  zIndex: 50,
};

/**
 * Search input field styles
 * Migrated from .search-input in search_box.css
 */
export const searchInputStyles = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '50px',
    border: '2px solid #e0e0e0',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    backgroundColor: 'white',
    '&:hover': {
      borderColor: '#007bff',
    },
    '&.Mui-focused': {
      borderColor: '#007bff',
      boxShadow: '0 4px 12px rgba(0, 123, 255, 0.15)',
    },
  },
};

/**
 * Search icon styles
 * Migrated from .search-icon in search_box.css
 */
export const searchIconStyles = {
  color: '#6c757d',
  pointerEvents: 'none',
};

/**
 * Search suggestions dropdown styles
 * Migrated from .search-suggestions in search_box.css
 */
export const searchSuggestionsStyles = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  zIndex: 10000,
  marginTop: '5px',
  border: '1px solid #e0e0e0',
  borderRadius: '15px',
  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
  backgroundColor: 'white',
  overflowY: 'auto',
  overflowX: 'visible',
  width: '100%',
  transform: 'translateZ(0)',
  willChange: 'transform, opacity',
  animation: 'slideDown 0.2s ease-out',
  '@keyframes slideDown': {
    from: {
      opacity: 0,
      transform: 'translateY(-10px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
  '& .MuiCardContent-root': {
    padding: '20px',
  },
};

/**
 * Filter badge styles
 * Migrated from .filter-badge in search_box.css
 */
export const filterBadgeStyles = {
  fontSize: '0.85rem',
  padding: '0.5rem 0.75rem',
  borderRadius: '20px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  position: 'relative',
  border: '1px solid transparent',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
};

/**
 * Filter badge selected state
 */
export const filterBadgeSelectedStyles = {
  ...filterBadgeStyles,
  backgroundColor: '#007bff !important',
  color: 'white !important',
};

/**
 * Filter badge unselected state
 */
export const filterBadgeUnselectedStyles = {
  ...filterBadgeStyles,
  backgroundColor: '#f8f9fa',
  color: '#495057',
  borderColor: '#dee2e6',
  '&:hover': {
    ...filterBadgeStyles['&:hover'],
    backgroundColor: '#e9ecef',
    borderColor: '#adb5bd',
  },
};

/**
 * Selected filters section styles
 * Migrated from .selected-filters in search_box.css
 */
export const selectedFiltersStyles = {
  backgroundColor: '#f8f9fa',
  padding: '15px',
  borderRadius: '10px',
  border: '1px solid #e9ecef',
  '& .MuiBadge-badge': {
    fontSize: '0.8rem',
    padding: '0.4rem 0.6rem',
  },
};

/**
 * Search results container styles
 * Migrated from .search-results-container in search_results.css
 */
export const searchResultsContainerStyles = {
  marginTop: 4,
  marginBottom: 4,
  zIndex: 1,
  overflow: 'visible',
  marginLeft: '0 !important',
  marginRight: '0 !important',
  animation: 'slideInFromTop 0.3s ease-out',
  '@keyframes slideInFromTop': {
    from: {
      opacity: 0,
      transform: 'translateY(-20px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
};

/**
 * Suggestion filters card styles
 * Migrated from .suggestion-filters-card in search_results.css
 */
export const suggestionFiltersCardStyles = {
  border: '1px solid #e0e6ed',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  backgroundColor: '#ffffff',
  transition: 'box-shadow 0.3s ease',
  '&:hover': {
    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
  },
};

/**
 * Top products card styles
 * Migrated from .top-products-card in search_results.css
 */
export const topProductsCardStyles = {
  border: '1px solid #e0e6ed',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  backgroundColor: '#ffffff',
  transition: 'box-shadow 0.3s ease',
  '&:hover': {
    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
  },
};

/**
 * Filter category title styles
 * Migrated from .filter-category-title in search_results.css
 */
export const filterCategoryTitleStyles = {
  color: '#495057',
  fontSize: '0.9rem',
  fontWeight: 600,
  marginBottom: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

/**
 * No results container styles
 * Migrated from .no-results-container in search_results.css
 */
export const noResultsContainerStyles = {
  padding: '3rem 1.5rem',
  backgroundColor: '#f8f9fa',
  borderRadius: '12px',
  border: '2px dashed #dee2e6',
};

/**
 * Search results mobile responsive styles
 */
export const searchResultsMobileStyles = {
  marginTop: 2,
  padding: '0 15px',
};

export default {
  searchBoxContainerStyles,
  searchInputWrapperStyles,
  searchInputStyles,
  searchIconStyles,
  searchSuggestionsStyles,
  filterBadgeStyles,
  filterBadgeSelectedStyles,
  filterBadgeUnselectedStyles,
  selectedFiltersStyles,
  searchResultsContainerStyles,
  suggestionFiltersCardStyles,
  topProductsCardStyles,
  filterCategoryTitleStyles,
  noResultsContainerStyles,
  searchResultsMobileStyles,
};
