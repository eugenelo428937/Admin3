/**
 * Performance Monitoring Middleware (Story 1.15)
 *
 * Redux middleware that tracks performance metrics for filter actions.
 * Monitors Redux action timing, checks against budgets, and logs warnings for violations.
 *
 * Development-only - tree-shaken in production builds.
 */

import PerformanceTracker from '../../utils/PerformanceTracker';
import {
  PERFORMANCE_BUDGETS,
  PERFORMANCE_MONITORING_CONFIG
} from '../../config/performanceBudgets';

/**
 * Performance monitoring middleware
 * Standard Redux middleware that tracks filter action performance.
 */
const performanceMonitoringMiddleware = (store) => (next) => (action) => {
  // Only track if monitoring is enabled and Performance API is supported
  if (!PERFORMANCE_MONITORING_CONFIG.enabled || !PerformanceTracker.isSupported()) {
    return next(action);
  }

  // Only track filter actions
  if (!action.type || !action.type.startsWith('filters/')) {
    return next(action);
  }

  const actionType = action.type;
  const operationName = `redux.${actionType.split('/')[1]}`; // e.g., 'redux.setSubjects'

  try {
    // Build metadata
    const metadata = {
      actionType,
      filterCount: Array.isArray(action.payload) ? action.payload.length : 1
    };

    // Start measurement
    PerformanceTracker.startMeasure(operationName, metadata);

    // Execute action
    const result = next(action);

    // End measurement
    const metric = PerformanceTracker.endMeasure(operationName);

    if (metric) {
      // Check against budget
      const budget = PERFORMANCE_BUDGETS.redux;
      const withinBudget = PerformanceTracker.checkBudget(
        operationName,
        metric.duration,
        budget
      );

      // Log to console if enabled
      if (PERFORMANCE_MONITORING_CONFIG.consoleLogging) {
        if (withinBudget) {
          console.log(
            `[Performance] ${operationName} completed in ${metric.duration.toFixed(1)}ms (budget: ${budget}ms) ✓`
          );
        }
        // Warning already logged by checkBudget if exceeded
      }
    }

    return result;
  } catch (error) {
    // Gracefully handle any performance tracking errors
    console.warn(`[Performance] Failed to track ${operationName}:`, error);
    return next(action);
  }
};

// Export the middleware for use in store configuration
export default performanceMonitoringMiddleware;
