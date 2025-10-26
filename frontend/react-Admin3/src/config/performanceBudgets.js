/**
 * Performance Budgets Configuration (Story 1.15)
 *
 * Defines performance budgets (timing thresholds) for different operation types.
 * Based on 60 FPS target (16.67ms per frame) and user experience guidelines.
 *
 * All values in milliseconds.
 */

/**
 * Redux action budget: 16ms (60 FPS threshold)
 * Ensures Redux state updates don't block rendering.
 * @type {number}
 */
export const REDUX_ACTION_BUDGET = 16;

/**
 * URL synchronization budget: 5ms
 * URL updates should be nearly instant to avoid interfering with user interactions.
 * @type {number}
 */
export const URL_SYNC_BUDGET = 5;

/**
 * API call budget: 1000ms (1 second)
 * Standard timeout threshold for network requests.
 * @type {number}
 */
export const API_CALL_BUDGET = 1000;

/**
 * Validation budget: 10ms
 * Client-side validation should provide instant feedback.
 * @type {number}
 */
export const VALIDATION_BUDGET = 10;

/**
 * Registry lookup budget: 1ms
 * In-memory lookups should be nearly instant.
 * @type {number}
 */
export const REGISTRY_LOOKUP_BUDGET = 1;

/**
 * Consolidated budgets object
 * Maps operation categories to their budgets.
 * @type {Object.<string, number>}
 */
export const PERFORMANCE_BUDGETS = Object.freeze({
  redux: REDUX_ACTION_BUDGET,
  urlSync: URL_SYNC_BUDGET,
  api: API_CALL_BUDGET,
  validation: VALIDATION_BUDGET,
  registry: REGISTRY_LOOKUP_BUDGET
});

/**
 * Get budget for a specific operation by name
 * @param {string} operation - Operation name (e.g., 'redux.setSubjects', 'urlSync', 'api.products')
 * @returns {number|undefined} Budget in milliseconds, or undefined if no budget defined
 * @throws {Error} If operation is not a non-empty string
 *
 * @example
 * getBudgetForOperation('redux.setSubjects') // returns 16
 * getBudgetForOperation('urlSync') // returns 5
 * getBudgetForOperation('api.products') // returns 1000
 * getBudgetForOperation('validation.subjects') // returns 10
 * getBudgetForOperation('registry.lookup') // returns 1
 */
export function getBudgetForOperation(operation) {
  if (typeof operation !== 'string' || operation.trim() === '') {
    throw new Error('operation must be a non-empty string');
  }

  // Extract category from operation name (e.g., 'redux.setSubjects' -> 'redux')
  // Handle both lowercase and camelCase (urlSync -> urlsync)
  const category = operation.split('.')[0].toLowerCase();

  // Map common variations to standardized keys
  const categoryMap = {
    'urlsync': 'urlSync',
    'redux': 'redux',
    'api': 'api',
    'validation': 'validation',
    'registry': 'registry'
  };

  const mappedCategory = categoryMap[category] || category;
  return PERFORMANCE_BUDGETS[mappedCategory];
}

/**
 * Check if operation duration is within its budget
 * @param {string} operation - Operation name
 * @param {number} duration - Actual duration in milliseconds
 * @returns {boolean} True if within budget, false if exceeded (or if no budget defined, returns true)
 * @throws {Error} If duration is invalid
 *
 * @example
 * isOperationWithinBudget('redux.setSubjects', 12) // returns true (12ms < 16ms)
 * isOperationWithinBudget('redux.setSubjects', 18) // returns false (18ms > 16ms)
 * isOperationWithinBudget('urlSync', 5) // returns true (5ms <= 5ms)
 */
export function isOperationWithinBudget(operation, duration) {
  if (typeof duration !== 'number' || isNaN(duration)) {
    throw new Error('duration must be a number');
  }

  if (duration < 0) {
    throw new Error('duration cannot be negative');
  }

  const budget = getBudgetForOperation(operation);

  // If no budget defined for this operation, assume it's within budget
  if (budget === undefined) {
    return true;
  }

  return duration <= budget;
}

/**
 * Performance monitoring configuration
 * Controls how performance tracking behaves.
 * @type {Object}
 */
export const PERFORMANCE_MONITORING_CONFIG = Object.freeze({
  /**
   * Enable/disable performance monitoring
   * Automatically disabled in production builds.
   * Enabled in development and test environments.
   * @type {boolean}
   */
  enabled: process.env.NODE_ENV !== 'production',

  /**
   * Monitoring level (off, minimal, standard, verbose)
   * - off: No monitoring
   * - minimal: Only budget violations
   * - standard: All filter operations (default)
   * - verbose: All operations including internals
   * @type {string}
   */
  level: 'standard',

  /**
   * Enable console logging of performance metrics
   * @type {boolean}
   */
  consoleLogging: process.env.NODE_ENV !== 'production',

  /**
   * Enable Redux DevTools integration for performance data
   * @type {boolean}
   */
  reduxDevTools: process.env.NODE_ENV !== 'production',

  /**
   * Operation name patterns to include (empty array = all)
   * @type {string[]}
   * @example ['redux.*', 'urlSync', 'api.*']
   */
  includeOperations: []
});

export default PERFORMANCE_BUDGETS;
