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

      this.register({
        type: filterKey,
        label: config.label || configName,
        pluralLabel: configName,
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
// Register all existing filter types (STATIC FALLBACK).
//
// These run on module load and act as a fallback while the
// /api/products/filter-configuration/ response is in flight. On boot
// App.js calls FilterRegistry.registerFromBackend() which clears these
// and re-registers from the DB filter_configurations table.
//
// IMPORTANT: any entry here that has NO corresponding row in
// filter_configurations renders a permanently-empty section in the
// FilterPanel (because the registry says "render me" but the DB
// returns no options). 'products' used to live here for that exact
// reason — there is no PRODUCTS filter_configurations row and there
// never was. Do NOT re-add it. See
// docs/filter-registry-architecture-debt.md for the full hardcoded-
// layer audit and why this file is one of six places that has to
// stay in sync.
// ===================================================================

// Programme Type — DB: filter_configurations(filter_key='programme_type')
FilterRegistry.register({
  type: 'programme_type',
  label: 'Programme',
  pluralLabel: 'Programmes',
  urlParam: 'programme_type',
  color: 'secondary',
  multiple: true,
  dataType: 'array',
  urlFormat: 'comma-separated',
  getDisplayValue: (value: any) => value,
  order: 1,
});

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
  getDisplayValue: (value: any) => value,
  order: 2,
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
  getDisplayValue: (value: any) => value,
  order: 3,
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
  getDisplayValue: (value: any) => value,
  order: 4,
});

// NOTE: 'products' filter was historically registered here but is removed.
// The DB has no PRODUCTS filter_configurations row, so this entry only ever
// rendered an empty section. If you find yourself wanting to re-add it,
// add the DB row first AND read docs/filter-registry-architecture-debt.md.

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
  getDisplayValue: (value: any) => value,
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
  getDisplayValue: (value: any) => value,
  order: 0, // First in order but not rendered in FilterPanel
});
