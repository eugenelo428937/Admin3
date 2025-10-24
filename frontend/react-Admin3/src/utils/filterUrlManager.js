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
 * Story 1.11 - Migrated to use FilterRegistry (AC7)
 */

import { FilterRegistry } from '../store/filters/filterRegistry';

/**
 * DEPRECATED: URL_PARAM_KEYS - Use FilterRegistry instead
 * Kept for backward compatibility only
 * @deprecated Use FilterRegistry.get(filterType).urlParam instead
 */
export const URL_PARAM_KEYS = {
  SUBJECT: 'subject_code',
  SUBJECT_INDEXED: 'subject',
  CATEGORY: 'category_code',
  CATEGORY_INDEXED: 'category',
  GROUP: 'group',
  PRODUCT: 'product',
  MODE_OF_DELIVERY: 'mode_of_delivery',
  SEARCH_QUERY: 'search_query',
  SEARCH_ALIAS: 'q',
  SUBJECT_ALIAS: 'subject',
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

  // Dynamically add filters using FilterRegistry (Story 1.11 AC7)
  const registeredFilters = FilterRegistry.getAll();

  registeredFilters.forEach((config) => {
    const filterType = config.type;
    const values = filters[filterType];

    // Skip if no values
    if (!values) return;

    // Handle string filters (searchQuery)
    if (config.dataType === 'string') {
      if (typeof values === 'string' && values.trim()) {
        params.set(config.urlParam, values.trim());
      }
      return;
    }

    // Handle array filters
    if (config.dataType === 'array' && Array.isArray(values)) {
      if (config.urlFormat === 'indexed') {
        // Indexed format (e.g., subject_code, subject_1, subject_2)
        const indexedBase = config.urlParamAliases?.[0] || config.urlParam;
        addIndexedParams(values, config.urlParam, indexedBase);
      } else if (config.urlFormat === 'comma-separated') {
        // Comma-separated format (e.g., group=PRINTED,EBOOK)
        addCommaSeparatedParam(values, config.urlParam);
      }
    }
  });

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

  // Dynamically parse filters using FilterRegistry (Story 1.11 AC7)
  const registeredFilters = FilterRegistry.getAll();

  registeredFilters.forEach((config) => {
    const filterType = config.type;

    // Handle string filters (searchQuery)
    if (config.dataType === 'string') {
      // Check primary URL param and aliases
      let value = params.get(config.urlParam);
      if (!value && config.urlParamAliases) {
        for (const alias of config.urlParamAliases) {
          value = params.get(alias);
          if (value) break;
        }
      }
      if (value) {
        filters[filterType] = value;
      }
      return;
    }

    // Handle array filters
    if (config.dataType === 'array') {
      if (config.urlFormat === 'indexed') {
        // Indexed format (e.g., subject_code, subject_1, subject_2)
        const indexedBase = config.urlParamAliases?.[0] || config.urlParam;
        filters[filterType] = parseIndexedParams(config.urlParam, indexedBase);
      } else if (config.urlFormat === 'comma-separated') {
        // Comma-separated format (e.g., group=PRINTED,EBOOK)
        filters[filterType] = parseCommaSeparatedParam(config.urlParam);
      }
    }
  });

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

  // Dynamically check all registered filters (Story 1.11 AC7)
  const registeredFilters = FilterRegistry.getAll();

  for (const config of registeredFilters) {
    const filterType = config.type;
    const value = filters[filterType];

    // Check array filters
    if (config.dataType === 'array' && Array.isArray(value) && value.length > 0) {
      return true;
    }

    // Check string filters
    if (config.dataType === 'string' && typeof value === 'string' && value.trim() !== '') {
      return true;
    }

    // Check boolean filters
    if (config.dataType === 'boolean' && value === true) {
      return true;
    }

    // Check number filters
    if (config.dataType === 'number' && typeof value === 'number') {
      return true;
    }
  }

  return false;
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

  // Dynamically compare all registered filters (Story 1.11 AC7)
  const registeredFilters = FilterRegistry.getAll();

  for (const config of registeredFilters) {
    const filterType = config.type;
    const value1 = filters1[filterType];
    const value2 = filters2[filterType];

    // Compare array filters
    if (config.dataType === 'array') {
      if (!arraysEqual(value1, value2)) {
        return false;
      }
    }

    // Compare string/boolean/number filters
    if (config.dataType === 'string' || config.dataType === 'boolean' || config.dataType === 'number') {
      if (value1 !== value2) {
        return false;
      }
    }
  }

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
