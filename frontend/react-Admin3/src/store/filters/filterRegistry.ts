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
 */
export interface FilterConfig {
  type: string;
  label: string;
  pluralLabel: string;
  urlParam: string;
  urlParamAliases?: string[];
  color: string;
  multiple: boolean;
  dataType: 'array' | 'string' | 'boolean' | 'number';
  urlFormat: 'single' | 'comma-separated' | 'indexed';
  getDisplayValue: (value: any, counts?: any) => string;
  icon?: string | null;
  order: number;
}

export class FilterRegistry {
  static #filters: Map<string, FilterConfig> = new Map();

  /**
   * Register a new filter type
   * @param config - Filter configuration
   */
  static register(config: Partial<FilterConfig> & { type: string; label: string; urlParam: string }): void {
    // Validate required fields
    if (!config.type) throw new Error('Filter config must have "type" field');
    if (!config.label) throw new Error('Filter config must have "label" field');
    if (!config.urlParam) throw new Error('Filter config must have "urlParam" field');

    // Set defaults
    const completeConfig: FilterConfig = {
      pluralLabel: config.label + 's',
      urlParamAliases: [],
      color: 'default',
      multiple: true,
      dataType: 'array',
      urlFormat: 'comma-separated',
      getDisplayValue: (value: any) => value,
      icon: null,
      order: 100, // Default order
      ...config,
    } as FilterConfig;

    this.#filters.set(config.type, completeConfig);
  }

  /**
   * Get filter configuration by type
   * @param type - Filter type (Redux state key)
   * @returns FilterConfig or undefined
   */
  static get(type: string): FilterConfig | undefined {
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

      if (metric && !(import.meta as any).env?.PROD) {
        PerformanceTracker.checkBudget('registry.lookup', metric.duration, REGISTRY_LOOKUP_BUDGET);
      }
    }

    return result;
  }

  /**
   * Get all registered filters
   * @returns Array of filter configurations
   */
  static getAll(): FilterConfig[] {
    return Array.from(this.#filters.values())
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Find filter by URL parameter name
   * @param paramName - URL parameter name
   * @returns FilterConfig or undefined
   */
  static getByUrlParam(paramName: string): FilterConfig | undefined {
    // Start performance tracking (Story 1.15)
    if (PerformanceTracker.isSupported()) {
      PerformanceTracker.startMeasure('registry.getByUrlParam', { paramName });
    }

    let result: FilterConfig | undefined = undefined;
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

      if (metric && !(import.meta as any).env?.PROD) {
        PerformanceTracker.checkBudget('registry.getByUrlParam', metric.duration, REGISTRY_LOOKUP_BUDGET);
      }
    }

    return result;
  }

  /**
   * Get filters that support multiple selections
   * @returns FilterConfig[]
   */
  static getMultipleSelectFilters(): FilterConfig[] {
    return this.getAll().filter(config => config.multiple);
  }

  /**
   * Get boolean filters
   * @returns FilterConfig[]
   */
  static getBooleanFilters(): FilterConfig[] {
    return this.getAll().filter(config => config.dataType === 'boolean');
  }

  /**
   * Get array filters
   * @returns FilterConfig[]
   */
  static getArrayFilters(): FilterConfig[] {
    return this.getAll().filter(config => config.dataType === 'array');
  }

  /**
   * Check if filter type is registered
   * @param type - Filter type
   * @returns boolean
   */
  static has(type: string): boolean {
    return this.#filters.has(type);
  }

  /**
   * Clear all registrations (mainly for testing)
   */
  static clear(): void {
    this.#filters.clear();
  }

  /**
   * Register filters from backend configuration response (FR-007).
   *
   * Clears existing registrations and re-registers from the backend
   * config object. Preserves Redux state key mappings by using
   * filter_key as the registry type.
   *
   * Always re-registers searchQuery (not returned by backend but
   * required for URL sync).
   *
   * @param backendConfigs - Response from /api/products/filter-configuration/
   *   Keys are config names, values are config objects with filter_key, label, etc.
   */
  static registerFromBackend(backendConfigs: Record<string, any>): void {
    this.#filters.clear();

    // URL param mapping for known filter keys.
    //
    // 'products' is intentionally NOT here. There is no PRODUCTS row in
    // filter_configurations; an entry here is dead weight that has tempted
    // refactors to re-add the hardcoded 'products' filter several times.
    // If a 'products' filter ever becomes a real product requirement, add
    // both the DB row AND this entry in the same PR.
    const URL_PARAM_MAP: Record<string, { urlParam: string; urlParamAliases: string[]; urlFormat: string; color: string }> = {
      programme_type: { urlParam: 'programme_type', urlParamAliases: [], urlFormat: 'comma-separated', color: 'secondary' },
      subjects: { urlParam: 'subject_code', urlParamAliases: ['subject'], urlFormat: 'indexed', color: 'primary' },
      categories: { urlParam: 'category_code', urlParamAliases: ['category'], urlFormat: 'indexed', color: 'info' },
      product_types: { urlParam: 'group', urlParamAliases: [], urlFormat: 'comma-separated', color: 'success' },
      modes_of_delivery: { urlParam: 'mode_of_delivery', urlParamAliases: [], urlFormat: 'comma-separated', color: 'warning' },
    };

    for (const [configName, config] of Object.entries(backendConfigs)) {
      const filterKey = config.filter_key;
      if (!filterKey) continue;

      const urlDefaults = URL_PARAM_MAP[filterKey] || {
        urlParam: filterKey,
        urlParamAliases: [],
        urlFormat: 'comma-separated',
        color: 'default',
      };

      // Section title comes from FilterConfiguration.display_label
      // (sent as `config.label`). `configName` is the snake_case
      // filter_key — only used as a last-resort fallback when the
      // admin hasn't filled in a display_label.
      const sectionTitle: string = config.label || configName;

      this.register({
        type: filterKey,
        label: sectionTitle,
        pluralLabel: sectionTitle,
        urlParam: urlDefaults.urlParam,
        urlParamAliases: urlDefaults.urlParamAliases,
        color: urlDefaults.color,
        multiple: config.allow_multiple !== false,
        dataType: 'array',
        urlFormat: urlDefaults.urlFormat as FilterConfig['urlFormat'],
        getDisplayValue: (value: any) => value,
        order: config.display_order || 100,
      });
    }

    // Always re-register searchQuery (not in backend config but required)
    if (!this.#filters.has('searchQuery')) {
      this.register({
        type: 'searchQuery',
        label: 'Search',
        pluralLabel: 'Search',
        urlParam: 'search_query',
        urlParamAliases: ['q', 'search'],
        color: 'info',
        multiple: false,
        dataType: 'string',
        urlFormat: 'single',
        getDisplayValue: (value: any) => value,
        order: 0,
      });
    }
  }
}

// ===================================================================
// NO STATIC REGISTRATIONS AT MODULE LOAD.
//
// Previously this file shipped a static fallback that registered six
// filters on import. That made the file the second source of truth
// alongside `filter_configurations`, and any drift between the two
// produced a quietly-broken FilterPanel — either an empty hardcoded
// section (the famous 'products' bug) or a missing filter.
//
// Production now boots the registry exclusively via
// `FilterRegistry.registerFromBackend(config)` in App.js's mount
// effect. The boot gate (`FilterBootGate`) blocks filter-dependent
// routes until that effect resolves, so no consumer ever sees an
// empty registry.
//
// Tests bootstrap the registry from a fixture once globally — see
// `src/test-utils/filterRegistryBootstrap.js` and the `beforeAll` in
// `src/setupTests.js`. Individual tests can call
// `FilterRegistry.clear()` in their own `beforeEach` for isolation.
//
// See docs/to-dos/filter-registry-architecture-debt.md for the full
// audit of where filter-shape used to be hardcoded.
// ===================================================================
