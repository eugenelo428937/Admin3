/**
 * Filter Registry - Centralized configuration for all filter types (Story 1.15)
 *
 * Adding a new filter:
 * 1. Add single entry to FilterRegistry.register()
 * 2. Add corresponding Redux state field and actions to filtersSlice
 * 3. Done! FilterPanel, ActiveFilters, and FilterUrlManager automatically handle it.
 *
 * Performance monitoring: Tracks lookup operations against < 1ms budget
 *
 * @example
 * // Register a new filter type
 * FilterRegistry.register({
 *   type: 'tutorial_location',
 *   label: 'Tutorial Location',
 *   pluralLabel: 'Tutorial Locations',
 *   urlParam: 'tutorial_location',
 *   color: 'info',
 *   multiple: true,
 *   dataType: 'array',
 *   urlFormat: 'comma-separated',
 *   getDisplayValue: (value) => value,
 * });
 */

import PerformanceTracker from '../../utils/PerformanceTracker';
import { REGISTRY_LOOKUP_BUDGET } from '../../config/performanceBudgets';

/**
 * Filter configuration schema
 * @typedef {Object} FilterConfig
 * @property {string} type - Redux state key (e.g., 'subjects')
 * @property {string} label - Human-readable label (e.g., 'Subject')
 * @property {string} pluralLabel - Plural form (e.g., 'Subjects')
 * @property {string} urlParam - Primary URL parameter name (e.g., 'subject_code')
 * @property {string[]} [urlParamAliases] - Alternative URL parameter names (e.g., ['subject'])
 * @property {string} color - Material-UI chip color variant
 * @property {boolean} multiple - Supports multiple selections
 * @property {'array'|'string'|'boolean'|'number'} dataType - Data type of filter value
 * @property {'single'|'comma-separated'|'indexed'} urlFormat - URL parameter format
 * @property {function} getDisplayValue - Format value for display in UI
 * @property {string} [icon] - Material-UI icon name (optional)
 * @property {number} [order] - Display order in FilterPanel (optional)
 */

export class FilterRegistry {
  static #filters = new Map();

  /**
   * Register a new filter type
   * @param {FilterConfig} config - Filter configuration
   */
  static register(config) {
    // Validate required fields
    if (!config.type) throw new Error('Filter config must have "type" field');
    if (!config.label) throw new Error('Filter config must have "label" field');
    if (!config.urlParam) throw new Error('Filter config must have "urlParam" field');

    // Set defaults
    const completeConfig = {
      pluralLabel: config.label + 's',
      urlParamAliases: [],
      color: 'default',
      multiple: true,
      dataType: 'array',
      urlFormat: 'comma-separated',
      getDisplayValue: (value) => value,
      icon: null,
      order: 100, // Default order
      ...config,
    };

    this.#filters.set(config.type, completeConfig);
  }

  /**
   * Get filter configuration by type
   * @param {string} type - Filter type (Redux state key)
   * @returns {FilterConfig|undefined}
   */
  static get(type) {
    // Start performance tracking (Story 1.15)
    if (PerformanceTracker.isSupported()) {
      PerformanceTracker.startMeasure('registry.lookup', { type });
    }

    const result = this.#filters.get(type);

    // End performance tracking and check budget
    if (PerformanceTracker.isSupported()) {
      const metric = PerformanceTracker.endMeasure('registry.lookup', {
        found: result !== undefined
      });

      if (metric && process.env.NODE_ENV !== 'production') {
        PerformanceTracker.checkBudget('registry.lookup', metric.duration, REGISTRY_LOOKUP_BUDGET);
      }
    }

    return result;
  }

  /**
   * Get all registered filters
   * @returns {FilterConfig[]} Array of filter configurations
   */
  static getAll() {
    return Array.from(this.#filters.values())
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Find filter by URL parameter name
   * @param {string} paramName - URL parameter name
   * @returns {FilterConfig|undefined}
   */
  static getByUrlParam(paramName) {
    // Start performance tracking (Story 1.15)
    if (PerformanceTracker.isSupported()) {
      PerformanceTracker.startMeasure('registry.getByUrlParam', { paramName });
    }

    let result = undefined;
    for (const config of this.#filters.values()) {
      if (config.urlParam === paramName || config.urlParamAliases?.includes(paramName)) {
        result = config;
        break;
      }
    }

    // End performance tracking and check budget
    if (PerformanceTracker.isSupported()) {
      const metric = PerformanceTracker.endMeasure('registry.getByUrlParam', {
        found: result !== undefined
      });

      if (metric && process.env.NODE_ENV !== 'production') {
        PerformanceTracker.checkBudget('registry.getByUrlParam', metric.duration, REGISTRY_LOOKUP_BUDGET);
      }
    }

    return result;
  }

  /**
   * Get filters that support multiple selections
   * @returns {FilterConfig[]}
   */
  static getMultipleSelectFilters() {
    return this.getAll().filter(config => config.multiple);
  }

  /**
   * Get boolean filters
   * @returns {FilterConfig[]}
   */
  static getBooleanFilters() {
    return this.getAll().filter(config => config.dataType === 'boolean');
  }

  /**
   * Get array filters
   * @returns {FilterConfig[]}
   */
  static getArrayFilters() {
    return this.getAll().filter(config => config.dataType === 'array');
  }

  /**
   * Check if filter type is registered
   * @param {string} type - Filter type
   * @returns {boolean}
   */
  static has(type) {
    return this.#filters.has(type);
  }

  /**
   * Clear all registrations (mainly for testing)
   */
  static clear() {
    this.#filters.clear();
  }
}

// ===================================================================
// Register all existing filter types
// ===================================================================

// Subjects
FilterRegistry.register({
  type: 'subjects',
  label: 'Subject',
  pluralLabel: 'Subjects',
  urlParam: 'subject_code',
  urlParamAliases: ['subject'],
  color: 'primary',
  multiple: true,
  dataType: 'array',
  urlFormat: 'indexed', // subject_code, subject_1, subject_2, ...
  getDisplayValue: (value) => value,
  order: 1,
});

// Categories
FilterRegistry.register({
  type: 'categories',
  label: 'Category',
  pluralLabel: 'Categories',
  urlParam: 'category_code',
  urlParamAliases: ['category'],
  color: 'info',
  multiple: true,
  dataType: 'array',
  urlFormat: 'indexed', // category_code, category_1, category_2, ...
  getDisplayValue: (value) => value,
  order: 2,
});

// Product Types
FilterRegistry.register({
  type: 'product_types',
  label: 'Product Type',
  pluralLabel: 'Product Types',
  urlParam: 'group',
  color: 'success',
  multiple: true,
  dataType: 'array',
  urlFormat: 'comma-separated',
  getDisplayValue: (value) => value,
  order: 3,
});

// Products
FilterRegistry.register({
  type: 'products',
  label: 'Product',
  pluralLabel: 'Products',
  urlParam: 'product',
  color: 'default',
  multiple: true,
  dataType: 'array',
  urlFormat: 'comma-separated',
  getDisplayValue: (value, counts) => {
    // Debug logging
    console.log('[FilterRegistry] products getDisplayValue:', {
      value,
      counts,
      productData: counts?.[value]
    });

    // Try to get product name from filterCounts
    if (counts && counts[value]) {
      const productData = counts[value];
      // Handle the backend structure: { count: number, name: string, display_name?: string }
      if (typeof productData === 'object' && productData !== null) {
        const displayName = productData.display_name || productData.name || productData.label || value;
        console.log('[FilterRegistry] Returning display name:', displayName);
        return displayName;
      }
    }
    // Fallback to the product ID if no counts data available
    console.log('[FilterRegistry] No product data found, returning value:', value);
    return value;
  },
  order: 4,
});

// Modes of Delivery
FilterRegistry.register({
  type: 'modes_of_delivery',
  label: 'Mode of Delivery',
  pluralLabel: 'Modes of Delivery',
  urlParam: 'mode_of_delivery',
  color: 'warning',
  multiple: true,
  dataType: 'array',
  urlFormat: 'comma-separated',
  getDisplayValue: (value) => value,
  order: 5,
});

// Search Query (special case - not rendered as filter section)
FilterRegistry.register({
  type: 'searchQuery',
  label: 'Search',
  pluralLabel: 'Search',
  urlParam: 'search_query',
  urlParamAliases: ['q', 'search'],
  color: 'info',
  multiple: false,
  dataType: 'string',
  urlFormat: 'single',
  getDisplayValue: (value) => value,
  order: 0, // First in order but not rendered in FilterPanel
});
