/**
 * FilterUrlManager
 *
 * Centralized utility for converting filter objects to/from URL parameters.
 * Eliminates duplicated URL logic across urlSyncMiddleware and ProductList.
 *
 * Performance: < 1ms per conversion (target)
 * Coverage: ≥95% test coverage
 *
 * Story 1.10 - Centralized URL Parameter Utility
 */

/**
 * URL parameter name constants
 * Maps filter types to their corresponding URL parameter names
 */
export const URL_PARAM_KEYS = {
  SUBJECT: 'subject_code',
  SUBJECT_INDEXED: 'subject',  // For subject_1, subject_2, etc.
  CATEGORY: 'category_code',
  CATEGORY_INDEXED: 'category',  // For category_1, category_2, etc.
  GROUP: 'group',  // Legacy name for product_types
  PRODUCT: 'product',
  MODE_OF_DELIVERY: 'mode_of_delivery',
  SEARCH_QUERY: 'search_query',

  // Aliases for backward compatibility
  SEARCH_ALIAS: 'q',  // Alternative for search_query
  SUBJECT_ALIAS: 'subject',  // Alternative for subject_code
};

/**
 * Default empty filter structure
 */
const DEFAULT_FILTERS = {
  subjects: [],
  categories: [],
  product_types: [],
  products: [],
  modes_of_delivery: [],
  searchQuery: ''
};

/**
 * Convert filter object to URL parameters
 * @param {Object} filters - Filter object from Redux state
 * @returns {URLSearchParams} URL search parameters
 */
export const toUrlParams = (filters) => {
  const params = new URLSearchParams();

  // Handle null/undefined filters
  if (!filters) {
    return params;
  }

  // Helper to add indexed parameters (subject_code, subject_1, subject_2)
  const addIndexedParams = (values, baseParam, indexedBase) => {
    if (!values || !Array.isArray(values)) return;

    // Filter out empty strings and null/undefined values
    const validValues = values.filter(v => v && v.toString().trim() !== '');

    if (validValues.length === 0) return;

    // First value uses base parameter name
    params.set(baseParam, validValues[0]);

    // Additional values use indexed names
    for (let i = 1; i < validValues.length; i++) {
      params.set(`${indexedBase}_${i}`, validValues[i]);
    }
  };

  // Helper to add comma-separated parameters
  const addCommaSeparatedParam = (values, paramName) => {
    if (!values || !Array.isArray(values)) return;

    // Filter out empty strings and null/undefined values
    const validValues = values.filter(v => v && v.toString().trim() !== '');

    if (validValues.length === 0) return;

    params.set(paramName, validValues.join(','));
  };

  // Add subjects (indexed format)
  addIndexedParams(filters.subjects, URL_PARAM_KEYS.SUBJECT, URL_PARAM_KEYS.SUBJECT_INDEXED);

  // Add categories (indexed format)
  addIndexedParams(filters.categories, URL_PARAM_KEYS.CATEGORY, URL_PARAM_KEYS.CATEGORY_INDEXED);

  // Add product types (comma-separated, legacy name 'group')
  addCommaSeparatedParam(filters.product_types, URL_PARAM_KEYS.GROUP);

  // Add products (comma-separated)
  addCommaSeparatedParam(filters.products, URL_PARAM_KEYS.PRODUCT);

  // Add modes of delivery (comma-separated)
  addCommaSeparatedParam(filters.modes_of_delivery, URL_PARAM_KEYS.MODE_OF_DELIVERY);

  // Add search query (only if not empty, trim whitespace)
  if (filters.searchQuery && filters.searchQuery.trim()) {
    params.set(URL_PARAM_KEYS.SEARCH_QUERY, filters.searchQuery.trim());
  }

  return params;
};

/**
 * Parse URL parameters to filter object
 * @param {URLSearchParams|string} searchParams - URL search parameters or query string
 * @returns {Object} Filter object matching Redux state shape
 */
export const fromUrlParams = (searchParams) => {
  // Initialize with default empty filter structure
  const filters = { ...DEFAULT_FILTERS };

  // Handle null/undefined input
  if (!searchParams) {
    return filters;
  }

  // Convert string to URLSearchParams if needed
  let params;
  if (typeof searchParams === 'string') {
    params = new URLSearchParams(searchParams);
  } else if (searchParams instanceof URLSearchParams) {
    params = searchParams;
  } else {
    return filters;
  }

  // Helper to parse indexed parameters (subject_code, subject_1, subject_2, etc.)
  const parseIndexedParams = (baseParam, indexedBase) => {
    const values = [];

    // Get base parameter (e.g., subject_code)
    const baseValue = params.get(baseParam);
    if (baseValue && baseValue.trim()) {
      values.push(baseValue);
    }

    // Get indexed parameters (e.g., subject_1, subject_2)
    // Stop at first gap in sequence
    let index = 1;
    let indexedValue;
    while ((indexedValue = params.get(`${indexedBase}_${index}`)) !== null) {
      if (indexedValue && indexedValue.trim()) {
        values.push(indexedValue);
      }
      index++;
    }

    return values;
  };

  // Helper to parse comma-separated parameters (group=PRINTED,EBOOK)
  const parseCommaSeparatedParam = (param) => {
    const value = params.get(param);
    if (!value) return [];

    return value
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);
  };

  // Parse subjects (indexed format: subject_code, subject_1, subject_2)
  filters.subjects = parseIndexedParams(URL_PARAM_KEYS.SUBJECT, URL_PARAM_KEYS.SUBJECT_INDEXED);

  // Parse categories (indexed format: category_code, category_1, category_2)
  filters.categories = parseIndexedParams(URL_PARAM_KEYS.CATEGORY, URL_PARAM_KEYS.CATEGORY_INDEXED);

  // Parse product types (comma-separated, legacy name 'group')
  filters.product_types = parseCommaSeparatedParam(URL_PARAM_KEYS.GROUP);

  // Parse products (comma-separated)
  filters.products = parseCommaSeparatedParam(URL_PARAM_KEYS.PRODUCT);

  // Parse modes of delivery (comma-separated)
  filters.modes_of_delivery = parseCommaSeparatedParam(URL_PARAM_KEYS.MODE_OF_DELIVERY);

  // Parse search query (check both search_query and q alias)
  const searchQuery = params.get(URL_PARAM_KEYS.SEARCH_QUERY) || params.get(URL_PARAM_KEYS.SEARCH_ALIAS);
  if (searchQuery) {
    filters.searchQuery = searchQuery;
  }

  return filters;
};

/**
 * Build complete URL with query parameters
 * @param {Object} filters - Filter object from Redux state
 * @param {string} basePath - Base path (default: '/products')
 * @returns {string} Complete URL with query parameters
 */
export const buildUrl = (filters, basePath = '/products') => {
  const params = toUrlParams(filters);
  const queryString = params.toString();

  if (queryString) {
    return `${basePath}?${queryString}`;
  }

  return basePath;
};

/**
 * Check if any filters are active
 * @param {Object} filters - Filter object from Redux state
 * @returns {boolean} True if any filters are active
 */
export const hasActiveFilters = (filters) => {
  if (!filters) {
    return false;
  }

  // Check array filters
  const hasArrayFilters =
    (filters.subjects && filters.subjects.length > 0) ||
    (filters.categories && filters.categories.length > 0) ||
    (filters.product_types && filters.product_types.length > 0) ||
    (filters.products && filters.products.length > 0) ||
    (filters.modes_of_delivery && filters.modes_of_delivery.length > 0);

  // Check string filters
  const hasStringFilters =
    !!(filters.searchQuery && filters.searchQuery.trim() !== '');

  return hasArrayFilters || hasStringFilters;
};

/**
 * Compare two filter objects for equality
 * @param {Object} filters1 - First filter object
 * @param {Object} filters2 - Second filter object
 * @returns {boolean} True if filters are equal
 */
export const areFiltersEqual = (filters1, filters2) => {
  // Handle null cases
  if (filters1 === null && filters2 === null) {
    return true;
  }

  if (filters1 === null || filters2 === null) {
    return false;
  }

  // Helper to compare arrays
  const arraysEqual = (arr1, arr2) => {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
      return false;
    }
    if (arr1.length !== arr2.length) {
      return false;
    }
    return arr1.every((val, index) => val === arr2[index]);
  };

  // Compare array filters
  if (!arraysEqual(filters1.subjects, filters2.subjects)) return false;
  if (!arraysEqual(filters1.categories, filters2.categories)) return false;
  if (!arraysEqual(filters1.product_types, filters2.product_types)) return false;
  if (!arraysEqual(filters1.products, filters2.products)) return false;
  if (!arraysEqual(filters1.modes_of_delivery, filters2.modes_of_delivery)) return false;

  // Compare string filters
  if (filters1.searchQuery !== filters2.searchQuery) return false;

  return true;
};

export default {
  URL_PARAM_KEYS,
  toUrlParams,
  fromUrlParams,
  buildUrl,
  hasActiveFilters,
  areFiltersEqual
};
