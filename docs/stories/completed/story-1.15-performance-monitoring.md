# Story 1.15: Add Performance Monitoring for Filter Operations

**Epic**: Product Filtering State Management Refactoring
**Phase**: 3 - Architecture Improvements (Priority 2)
**Story ID**: 1.15
**Estimated Effort**: 1 day
**Dependencies**: Stories 1.1-1.14 (core refactoring must be complete)

---

## User Story

As a **developer**,
I want **to monitor performance of filter operations and identify bottlenecks**,
So that **I can ensure the filtering system performs well under various load conditions and optimize problem areas**.

---

## Story Context

### Problem Being Solved

After completing the major filtering refactoring (Stories 1.1-1.14), we need **observability into the system's performance characteristics**:

**Current Gaps**:
1. **No visibility** into filter operation timing
2. **No metrics** for Redux state update performance
3. **No tracking** of API call latency for filtered product requests
4. **No measurement** of render performance when filters change
5. **No data** to validate that optimizations (debouncing, memoization) are effective

**Performance Concerns from Refactoring**:
- Redux middleware chain now includes urlSyncMiddleware (Story 1.1)
- Multiple filter changes can trigger rapid Redux updates
- API calls with 250ms debounce need validation
- FilterRegistry pattern adds abstraction overhead (Story 1.11)
- FilterValidator adds validation overhead (Story 1.12)

**Solution**: Implement comprehensive performance monitoring using:
- Redux Toolkit listener middleware for state timing
- Custom performance marks/measures via Performance API
- Redux DevTools extension integration
- Console metrics in development mode
- Configurable performance budgets with warnings

### Existing System Integration

**Integrates with**:
- **Redux Store** - Add performance monitoring middleware
- **urlSyncMiddleware** (Story 1.1) - Monitor synchronization timing
- **FilterRegistry** (Story 1.11) - Track registration and lookup performance
- **FilterValidator** (Story 1.12) - Monitor validation overhead
- **useProductsSearch Hook** - Measure API call timing
- **FilterPanel/ActiveFilters** - Monitor render performance

**Technology**:
- Browser Performance API (performance.mark, performance.measure)
- Redux Toolkit createListenerMiddleware
- Redux DevTools Extension
- React Profiler API (optional for render performance)

**Follows Pattern**:
- **Observer Pattern** - Monitor without modifying core logic
- **Non-Intrusive Instrumentation** - Performance tracking doesn't affect business logic
- **Development-Only Overhead** - Minimal/zero overhead in production builds

**Touch Points**:
- `store/store.js` - Add performance monitoring middleware
- `store/middleware/performanceMonitoring.js` - NEW FILE
- `utils/PerformanceTracker.js` - NEW FILE (utility class)
- `hooks/useProductsSearch.js` - Add API timing instrumentation
- `config/performanceBudgets.js` - NEW FILE (thresholds)

---

## Acceptance Criteria

### Functional Requirements

**AC1**: Create PerformanceTracker utility class
- File: `frontend/react-Admin3/src/utils/PerformanceTracker.js`
- Methods:
  - `startMeasure(name, metadata)` - Begin performance measurement
  - `endMeasure(name, metadata)` - End measurement and log results
  - `recordMetric(name, value, metadata)` - Record single metric
  - `getMetrics(filterName)` - Retrieve metrics for analysis
  - `clearMetrics()` - Reset all metrics
  - `checkBudget(name, duration, budget)` - Validate against performance budget
- Implementation using Performance API with fallback for unsupported browsers

**AC2**: Implement Redux performance monitoring middleware
- File: `frontend/react-Admin3/src/store/middleware/performanceMonitoring.js`
- Monitor all filter-related actions
- Measure:
  - Action dispatch timing
  - Reducer execution time
  - Middleware processing time
  - State size changes
- Log performance warnings when actions exceed thresholds

**AC3**: Add API call timing instrumentation
- File: `frontend/react-Admin3/src/hooks/useProductsSearch.js`
- Measure:
  - API request initiation to response time
  - RTK Query cache hit vs. network request timing
  - Debounce delay effectiveness
- Log slow API calls (> 1000ms)

**AC4**: Monitor URL synchronization performance
- File: `frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.js`
- Measure:
  - Filter state → URL parameter conversion time
  - History.replaceState() execution time
  - Loop prevention check overhead
- Ensure URL sync stays under 5ms budget

**AC5**: Track filter validation performance
- File: `frontend/react-Admin3/src/utils/FilterValidator.js`
- Measure validation execution time for each validation rule
- Track aggregate validation overhead
- Budget: < 10ms for full validation pass

**AC6**: Monitor FilterRegistry operations
- File: `frontend/react-Admin3/src/utils/FilterRegistry.js`
- Measure:
  - Filter registration time (startup)
  - Filter lookup performance
  - Configuration retrieval time
- Ensure registry operations stay under 1ms

**AC7**: Create performance budget configuration
- File: `frontend/react-Admin3/src/config/performanceBudgets.js`
- Define thresholds for:
  - Redux action processing: 16ms (60 FPS frame budget)
  - URL synchronization: 5ms
  - API calls: 1000ms
  - Filter validation: 10ms
  - Registry lookups: 1ms
- Allow per-environment overrides

**AC8**: Integrate with Redux DevTools
- Include performance metrics in Redux DevTools state
- Add custom trace events for filter operations
- Enable time-travel debugging with performance context

**AC9**: Development-mode console reporting
- Log performance summaries to console in development mode
- Include aggregated metrics (min/max/avg/p95)
- Highlight operations exceeding performance budgets
- Format output for readability

**AC10**: Optional React Profiler integration
- Add Profiler component around FilterPanel and ActiveFilters
- Measure render performance when filters change
- Track unnecessary re-renders
- Optional: recommend memoization opportunities

### Integration Requirements

**AC11**: Minimal production overhead
- Performance monitoring code tree-shaken in production builds
- Use `process.env.NODE_ENV === 'development'` guards
- Zero runtime overhead in production
- No increase in production bundle size

**AC12**: Configurable monitoring levels
- `PERF_MONITORING_LEVEL` environment variable:
  - `off` - No monitoring
  - `basic` - Critical metrics only (default in production)
  - `detailed` - All metrics (default in development)
  - `verbose` - Include debug logging
- Allow runtime configuration via localStorage override

**AC13**: Non-breaking integration
- Performance monitoring doesn't change existing behavior
- All metrics collection is side-effect free
- Graceful degradation if Performance API unavailable
- No impact on existing tests

### Quality Requirements

**AC14**: Clear performance metrics visibility
- Developers can see filter operation timing in console
- DevTools shows performance data alongside state changes
- Metrics aggregated and displayed at end of session
- Easy to identify performance regressions

**AC15**: Actionable performance warnings
- Warning messages include:
  - Which operation exceeded budget
  - Measured duration vs. budget threshold
  - Suggestions for optimization
  - Link to relevant documentation
- Example: "Filter validation took 15ms (budget: 10ms). Consider optimizing validation rules."

**AC16**: Documentation and examples
- Document how to use PerformanceTracker
- Provide examples of adding custom performance measurements
- Explain performance budget configuration
- Include troubleshooting guide for common performance issues

---

## Technical Implementation Guide

### File Structure

**New Files**:
```
frontend/react-Admin3/src/
├── utils/
│   └── PerformanceTracker.js              # Performance measurement utility
├── store/middleware/
│   └── performanceMonitoring.js           # Redux performance monitoring
├── config/
│   └── performanceBudgets.js              # Performance threshold configuration
```

**Modified Files**:
```
frontend/react-Admin3/src/
├── store/
│   └── store.js                           # Add performance middleware
├── store/middleware/
│   └── urlSyncMiddleware.js               # Add timing instrumentation
├── hooks/
│   └── useProductsSearch.js               # Add API timing
├── utils/
│   ├── FilterValidator.js                 # Add validation timing
│   └── FilterRegistry.js                  # Add registry timing
```

### Implementation Steps

#### Step 1: Create PerformanceTracker Utility Class

**File**: `frontend/react-Admin3/src/utils/PerformanceTracker.js`

```javascript
/**
 * PerformanceTracker - Utility for measuring and tracking application performance
 *
 * Uses the Performance API to measure timing of operations and track metrics.
 * Automatically disabled in production builds unless explicitly enabled.
 */

class PerformanceTracker {
  constructor() {
    this.metrics = new Map();
    this.budgets = {};
    this.enabled = process.env.NODE_ENV === 'development';
    this.level = this._getMonitoringLevel();
  }

  /**
   * Get monitoring level from environment or localStorage
   * @private
   */
  _getMonitoringLevel() {
    if (typeof window === 'undefined') return 'off';

    // Check localStorage override first
    const override = localStorage.getItem('PERF_MONITORING_LEVEL');
    if (override) return override;

    // Check environment variable
    return process.env.REACT_APP_PERF_MONITORING_LEVEL ||
           (process.env.NODE_ENV === 'development' ? 'detailed' : 'off');
  }

  /**
   * Check if monitoring is enabled for the current level
   * @private
   */
  _isLevelEnabled(requiredLevel) {
    const levels = { off: 0, basic: 1, detailed: 2, verbose: 3 };
    const current = levels[this.level] || 0;
    const required = levels[requiredLevel] || 0;
    return current >= required;
  }

  /**
   * Check if Performance API is available
   * @private
   */
  _isSupported() {
    return typeof window !== 'undefined' &&
           window.performance &&
           window.performance.mark &&
           window.performance.measure;
  }

  /**
   * Start measuring an operation
   * @param {string} name - Name of the operation
   * @param {object} metadata - Additional metadata
   */
  startMeasure(name, metadata = {}) {
    if (!this.enabled || !this._isSupported()) return;

    const markName = `${name}-start`;
    performance.mark(markName);

    if (this._isLevelEnabled('verbose')) {
      console.log(`[PerformanceTracker] Started: ${name}`, metadata);
    }

    // Store start metadata
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const measurements = this.metrics.get(name);
    measurements.push({
      startTime: performance.now(),
      metadata,
      status: 'started',
    });
  }

  /**
   * End measuring an operation and log results
   * @param {string} name - Name of the operation
   * @param {object} metadata - Additional metadata
   * @returns {number|null} - Duration in milliseconds
   */
  endMeasure(name, metadata = {}) {
    if (!this.enabled || !this._isSupported()) return null;

    const endTime = performance.now();
    const markStart = `${name}-start`;
    const markEnd = `${name}-end`;
    const measureName = `${name}-duration`;

    performance.mark(markEnd);

    try {
      performance.measure(measureName, markStart, markEnd);
      const measure = performance.getEntriesByName(measureName)[0];
      const duration = measure.duration;

      // Update metrics
      const measurements = this.metrics.get(name) || [];
      const lastMeasurement = measurements[measurements.length - 1];

      if (lastMeasurement && lastMeasurement.status === 'started') {
        lastMeasurement.endTime = endTime;
        lastMeasurement.duration = duration;
        lastMeasurement.status = 'completed';
        lastMeasurement.endMetadata = metadata;
      }

      // Check against budget
      const budget = this.budgets[name];
      if (budget && duration > budget) {
        console.warn(
          `[PerformanceTracker] ⚠️ Budget exceeded for "${name}"\n` +
          `  Measured: ${duration.toFixed(2)}ms\n` +
          `  Budget: ${budget}ms\n` +
          `  Overage: ${(duration - budget).toFixed(2)}ms`,
          metadata
        );
      }

      if (this._isLevelEnabled('detailed')) {
        console.log(
          `[PerformanceTracker] Completed: ${name} (${duration.toFixed(2)}ms)`,
          metadata
        );
      }

      // Clean up marks
      performance.clearMarks(markStart);
      performance.clearMarks(markEnd);
      performance.clearMeasures(measureName);

      return duration;
    } catch (error) {
      console.error(`[PerformanceTracker] Error measuring "${name}":`, error);
      return null;
    }
  }

  /**
   * Record a single metric value
   * @param {string} name - Name of the metric
   * @param {number} value - Metric value
   * @param {object} metadata - Additional metadata
   */
  recordMetric(name, value, metadata = {}) {
    if (!this.enabled) return;

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name).push({
      value,
      timestamp: performance.now(),
      metadata,
      status: 'recorded',
    });

    if (this._isLevelEnabled('verbose')) {
      console.log(`[PerformanceTracker] Metric: ${name} = ${value}`, metadata);
    }
  }

  /**
   * Get metrics for a specific operation or all metrics
   * @param {string|null} filterName - Optional filter by operation name
   * @returns {object} - Metrics data
   */
  getMetrics(filterName = null) {
    if (filterName) {
      const measurements = this.metrics.get(filterName) || [];
      return this._calculateStats(measurements);
    }

    // Return all metrics with stats
    const allMetrics = {};
    for (const [name, measurements] of this.metrics.entries()) {
      allMetrics[name] = this._calculateStats(measurements);
    }
    return allMetrics;
  }

  /**
   * Calculate statistics for a set of measurements
   * @private
   */
  _calculateStats(measurements) {
    const durations = measurements
      .filter(m => m.status === 'completed' && m.duration !== undefined)
      .map(m => m.duration);

    if (durations.length === 0) {
      return {
        count: measurements.length,
        durations: [],
        stats: null,
      };
    }

    durations.sort((a, b) => a - b);

    const sum = durations.reduce((acc, val) => acc + val, 0);
    const avg = sum / durations.length;
    const min = durations[0];
    const max = durations[durations.length - 1];
    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    return {
      count: measurements.length,
      durations,
      stats: { min, max, avg, p50, p95, p99 },
    };
  }

  /**
   * Set performance budget for an operation
   * @param {string} name - Operation name
   * @param {number} budgetMs - Budget in milliseconds
   */
  setBudget(name, budgetMs) {
    this.budgets[name] = budgetMs;
  }

  /**
   * Set multiple performance budgets
   * @param {object} budgets - Object with name: budgetMs pairs
   */
  setBudgets(budgets) {
    Object.assign(this.budgets, budgets);
  }

  /**
   * Check if an operation stayed within budget
   * @param {string} name - Operation name
   * @param {number} duration - Measured duration
   * @param {number} budget - Budget threshold
   * @returns {boolean} - True if within budget
   */
  checkBudget(name, duration, budget) {
    if (duration > budget) {
      console.warn(
        `[PerformanceTracker] ⚠️ Budget exceeded for "${name}"\n` +
        `  Measured: ${duration.toFixed(2)}ms\n` +
        `  Budget: ${budget}ms\n` +
        `  Overage: ${(duration - budget).toFixed(2)}ms`
      );
      return false;
    }
    return true;
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.clear();

    if (this._isLevelEnabled('verbose')) {
      console.log('[PerformanceTracker] Metrics cleared');
    }
  }

  /**
   * Print summary of all metrics to console
   */
  printSummary() {
    if (!this.enabled || !this._isLevelEnabled('basic')) return;

    console.group('[PerformanceTracker] Summary');

    for (const [name, measurements] of this.metrics.entries()) {
      const stats = this._calculateStats(measurements);

      if (stats.stats) {
        const budget = this.budgets[name];
        const budgetStatus = budget
          ? stats.stats.avg <= budget ? '✅' : '⚠️'
          : '';

        console.log(
          `${budgetStatus} ${name}:\n` +
          `  Count: ${stats.count}\n` +
          `  Avg: ${stats.stats.avg.toFixed(2)}ms\n` +
          `  Min: ${stats.stats.min.toFixed(2)}ms\n` +
          `  Max: ${stats.stats.max.toFixed(2)}ms\n` +
          `  P95: ${stats.stats.p95.toFixed(2)}ms\n` +
          (budget ? `  Budget: ${budget}ms\n` : '')
        );
      } else {
        console.log(`${name}: ${stats.count} measurements (no durations)`);
      }
    }

    console.groupEnd();
  }

  /**
   * Enable/disable performance tracking
   * @param {boolean} enabled - Whether to enable tracking
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Set monitoring level
   * @param {string} level - One of: off, basic, detailed, verbose
   */
  setLevel(level) {
    this.level = level;
    localStorage.setItem('PERF_MONITORING_LEVEL', level);
  }
}

// Export singleton instance
export const performanceTracker = new PerformanceTracker();

// Export class for testing
export { PerformanceTracker };

export default performanceTracker;
```

#### Step 2: Create Performance Budget Configuration

**File**: `frontend/react-Admin3/src/config/performanceBudgets.js`

```javascript
/**
 * Performance Budgets Configuration
 *
 * Defines maximum acceptable durations for various operations.
 * Values are in milliseconds.
 *
 * Budget Guidelines:
 * - Redux actions: 16ms (60 FPS frame budget)
 * - Synchronization: 5ms (imperceptible to users)
 * - API calls: 1000ms (acceptable for network operations)
 * - Validation: 10ms (synchronous validation budget)
 * - Lookups: 1ms (near-instant for in-memory operations)
 */

export const PERFORMANCE_BUDGETS = {
  // Redux Action Processing
  'redux:action:dispatch': 16, // Any single Redux action
  'redux:action:setSubjects': 16,
  'redux:action:setCategories': 16,
  'redux:action:setProductTypes': 16,
  'redux:action:setProducts': 16,
  'redux:action:setModesOfDelivery': 16,
  'redux:action:setTutorialFormat': 16,
  'redux:action:clearAllFilters': 16,
  'redux:action:setMultipleFilters': 50, // Slightly higher for bulk updates

  // URL Synchronization (Story 1.1)
  'urlSync:stateToUrl': 5,
  'urlSync:buildParams': 3,
  'urlSync:historyUpdate': 2,
  'urlSync:loopCheck': 1,

  // FilterRegistry Operations (Story 1.11)
  'registry:getConfig': 1,
  'registry:getDisplayValue': 1,
  'registry:toUrlParams': 5,
  'registry:fromUrlParams': 10,

  // Filter Validation (Story 1.12)
  'validation:validateAll': 10,
  'validation:validateTutorialFormat': 2,
  'validation:validateProducts': 3,
  'validation:validateSubjects': 3,

  // API Calls
  'api:fetchProducts': 1000,
  'api:fetchSubjects': 1000,
  'api:fetchCategories': 1000,

  // Component Rendering (optional React Profiler integration)
  'render:FilterPanel': 16,
  'render:ActiveFilters': 16,
  'render:ProductList': 50,

  // Utility Functions
  'util:FilterUrlManager:toUrlParams': 5,
  'util:FilterUrlManager:fromUrlParams': 10,
  'util:FilterUrlManager:buildUrl': 3,
};

/**
 * Environment-specific budget overrides
 */
export const BUDGET_OVERRIDES = {
  production: {
    // Slightly more lenient in production to account for slower devices
    'redux:action:dispatch': 20,
    'redux:action:setMultipleFilters': 60,
  },
  development: {
    // Stricter budgets in development to catch issues early
    'redux:action:dispatch': 16,
  },
  test: {
    // Very lenient in test environment
    'redux:action:dispatch': 100,
    'api:fetchProducts': 5000,
  },
};

/**
 * Get performance budgets for current environment
 * @returns {object} - Performance budgets
 */
export function getPerformanceBudgets() {
  const env = process.env.NODE_ENV || 'development';
  const overrides = BUDGET_OVERRIDES[env] || {};

  return {
    ...PERFORMANCE_BUDGETS,
    ...overrides,
  };
}

/**
 * Warning thresholds as percentage of budget
 * Used to warn before budget is exceeded
 */
export const WARNING_THRESHOLD_PERCENT = 80;

/**
 * Get warning threshold for an operation
 * @param {string} operationName - Name of operation
 * @returns {number} - Warning threshold in milliseconds
 */
export function getWarningThreshold(operationName) {
  const budgets = getPerformanceBudgets();
  const budget = budgets[operationName];

  if (!budget) return null;

  return budget * (WARNING_THRESHOLD_PERCENT / 100);
}

export default getPerformanceBudgets;
```

#### Step 3: Create Redux Performance Monitoring Middleware

**File**: `frontend/react-Admin3/src/store/middleware/performanceMonitoring.js`

```javascript
/**
 * Redux Performance Monitoring Middleware
 *
 * Monitors performance of Redux actions and state updates.
 * Tracks timing for filter-related actions and logs warnings when budgets are exceeded.
 *
 * Only active in development mode unless explicitly enabled.
 */

import { createListenerMiddleware } from '@reduxjs/toolkit';
import performanceTracker from '../../utils/PerformanceTracker';
import { getPerformanceBudgets } from '../../config/performanceBudgets';

export const performanceMonitoringMiddleware = createListenerMiddleware();

// Initialize budgets
const budgets = getPerformanceBudgets();
performanceTracker.setBudgets(budgets);

// Track Redux state size
let previousStateSize = 0;

/**
 * Calculate approximate size of Redux state in bytes
 */
function calculateStateSize(state) {
  try {
    return JSON.stringify(state).length;
  } catch (error) {
    return 0;
  }
}

/**
 * Monitor all filter-related actions
 */
performanceMonitoringMiddleware.startListening({
  predicate: (action) => {
    // Monitor all actions in development, only filter actions otherwise
    if (process.env.NODE_ENV === 'development') {
      return action.type.startsWith('filters/');
    }
    return false;
  },
  effect: async (action, listenerApi) => {
    const actionType = action.type;
    const measureName = `redux:action:${actionType.replace('filters/', '')}`;

    // Start measuring
    performanceTracker.startMeasure(measureName, {
      actionType,
      payload: action.payload,
    });

    // Get state before and after for comparison
    const stateBefore = listenerApi.getState();
    const sizeBefore = calculateStateSize(stateBefore.filters);

    // Wait for next tick to measure state update
    await new Promise(resolve => setTimeout(resolve, 0));

    const stateAfter = listenerApi.getState();
    const sizeAfter = calculateStateSize(stateAfter.filters);
    const sizeDelta = sizeAfter - sizeBefore;

    // End measuring
    const duration = performanceTracker.endMeasure(measureName, {
      actionType,
      stateSizeBefore: sizeBefore,
      stateSizeAfter: sizeAfter,
      stateSizeDelta: sizeDelta,
    });

    // Record state size metric
    performanceTracker.recordMetric('redux:stateSize', sizeAfter, {
      action: actionType,
    });

    // Check specific budget for this action
    const specificBudget = budgets[measureName];
    const genericBudget = budgets['redux:action:dispatch'];
    const budget = specificBudget || genericBudget;

    if (duration && budget) {
      performanceTracker.checkBudget(measureName, duration, budget);
    }

    // Warn about large state size increases
    if (sizeDelta > 10000) { // > 10KB increase
      console.warn(
        `[Performance] Large state size increase from "${actionType}"\n` +
        `  Before: ${(sizeBefore / 1024).toFixed(2)}KB\n` +
        `  After: ${(sizeAfter / 1024).toFixed(2)}KB\n` +
        `  Delta: +${(sizeDelta / 1024).toFixed(2)}KB`
      );
    }
  },
});

/**
 * Monitor state changes and detect unnecessary updates
 */
performanceMonitoringMiddleware.startListening({
  predicate: () => process.env.NODE_ENV === 'development',
  effect: (action, listenerApi) => {
    const currentState = listenerApi.getState();
    const currentSize = calculateStateSize(currentState.filters);

    // Detect if state actually changed
    if (currentSize === previousStateSize && action.type.startsWith('filters/')) {
      console.warn(
        `[Performance] Action "${action.type}" dispatched but state unchanged.\n` +
        `  Consider optimizing reducer to prevent unnecessary updates.`
      );
    }

    previousStateSize = currentSize;
  },
});

/**
 * Print performance summary when Redux DevTools time-travel is used
 */
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Hook into Redux DevTools if available
  window.__REDUX_DEVTOOLS_EXTENSION__?.subscribe?.((message) => {
    if (message.type === 'DISPATCH' && message.payload?.type === 'JUMP_TO_STATE') {
      performanceTracker.printSummary();
    }
  });

  // Print summary on page unload
  window.addEventListener('beforeunload', () => {
    performanceTracker.printSummary();
  });
}

export default performanceMonitoringMiddleware;
```

#### Step 4: Integrate Performance Monitoring into Redux Store

**File**: `frontend/react-Admin3/src/store/store.js`

**BEFORE** (Story 1.13 state - after cookie middleware removed):
```javascript
import { configureStore } from '@reduxjs/toolkit';
import filtersReducer from './slices/filtersSlice';
import { api } from './api';
import { urlSyncMiddleware } from './middleware/urlSyncMiddleware';

export const store = configureStore({
  reducer: {
    filters: filtersReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(api.middleware)
      .concat(urlSyncMiddleware.middleware),
});
```

**AFTER** (Story 1.15 - performance monitoring added):
```javascript
import { configureStore } from '@reduxjs/toolkit';
import filtersReducer from './slices/filtersSlice';
import { api } from './api';
import { urlSyncMiddleware } from './middleware/urlSyncMiddleware';
import performanceMonitoringMiddleware from './middleware/performanceMonitoring';

export const store = configureStore({
  reducer: {
    filters: filtersReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(api.middleware)
      .concat(urlSyncMiddleware.middleware)
      .concat(
        // Only add performance monitoring in development
        process.env.NODE_ENV === 'development'
          ? performanceMonitoringMiddleware.middleware
          : []
      ),
});

// Expose performance tracker to window for debugging (development only)
if (process.env.NODE_ENV === 'development') {
  window.__PERFORMANCE_TRACKER__ = require('../utils/PerformanceTracker').default;
}
```

**Changes**:
- ✅ Import `performanceMonitoringMiddleware`
- ✅ Add to middleware chain (development only)
- ✅ Expose performance tracker to window for manual debugging
- ✅ Conditional middleware to ensure zero production overhead

#### Step 5: Add Timing to urlSyncMiddleware

**File**: `frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.js`

**Add timing instrumentation** (changes shown with comments):
```javascript
import { createListenerMiddleware } from '@reduxjs/toolkit';
import { selectFilters } from '../slices/filtersSlice';
import performanceTracker from '../../utils/PerformanceTracker'; // ADD

export const urlSyncMiddleware = createListenerMiddleware();

let isUpdatingFromUrl = false;
let lastUrlParams = null;

urlSyncMiddleware.startListening({
  predicate: (action) => action.type.startsWith('filters/'),
  effect: (action, listenerApi) => {
    if (isUpdatingFromUrl) return;

    // START TIMING
    performanceTracker.startMeasure('urlSync:stateToUrl', { // ADD
      action: action.type, // ADD
    }); // ADD

    const state = listenerApi.getState();
    const filters = selectFilters(state);

    performanceTracker.startMeasure('urlSync:buildParams'); // ADD
    const params = new URLSearchParams();

    // Build URL params from filters
    if (filters.subject_code?.length > 0) {
      filters.subject_code.forEach(code => params.append('subject_code', code));
    }
    if (filters.category_code?.length > 0) {
      filters.category_code.forEach(code => params.append('category_code', code));
    }
    // ... other filter params

    performanceTracker.endMeasure('urlSync:buildParams'); // ADD

    const currentSearch = params.toString();

    performanceTracker.startMeasure('urlSync:loopCheck'); // ADD
    // Loop prevention
    if (currentSearch === lastUrlParams) {
      performanceTracker.endMeasure('urlSync:loopCheck'); // ADD
      performanceTracker.endMeasure('urlSync:stateToUrl'); // ADD
      return;
    }
    performanceTracker.endMeasure('urlSync:loopCheck'); // ADD

    lastUrlParams = currentSearch;

    const newUrl = currentSearch ? `/products?${currentSearch}` : '/products';

    performanceTracker.startMeasure('urlSync:historyUpdate'); // ADD
    window.history.replaceState({}, '', newUrl);
    performanceTracker.endMeasure('urlSync:historyUpdate'); // ADD

    // END TIMING
    performanceTracker.endMeasure('urlSync:stateToUrl', { // ADD
      urlParamsCount: Array.from(params.keys()).length, // ADD
    }); // ADD
  },
});
```

**Changes**:
- ✅ Add timing for overall URL sync operation
- ✅ Add timing for URL param building
- ✅ Add timing for loop prevention check
- ✅ Add timing for history update
- ✅ Include metadata (action type, param count)

#### Step 6: Add Timing to useProductsSearch Hook

**File**: `frontend/react-Admin3/src/hooks/useProductsSearch.js`

**Add API timing instrumentation** (changes shown with comments):
```javascript
import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetProductsQuery } from '../store/api';
import { selectFilters } from '../store/slices/filtersSlice';
import performanceTracker from '../utils/PerformanceTracker'; // ADD

const useProductsSearch = () => {
  const dispatch = useDispatch();
  const filters = useSelector(selectFilters);

  // Build query params
  const queryParams = buildQueryParams(filters);

  // START API TIMING
  const startTime = performance.now(); // ADD
  performanceTracker.startMeasure('api:fetchProducts', { // ADD
    filterCount: Object.keys(filters).length, // ADD
    queryParams, // ADD
  }); // ADD

  // RTK Query hook
  const { data, error, isLoading, isFetching } = useGetProductsQuery(queryParams, {
    skip: !queryParams, // Skip if no valid query params
  });

  // END API TIMING
  useEffect(() => { // ADD
    if (!isLoading && !isFetching) { // ADD
      const endTime = performance.now(); // ADD
      const duration = endTime - startTime; // ADD

      performanceTracker.endMeasure('api:fetchProducts', { // ADD
        resultCount: data?.results?.length || 0, // ADD
        fromCache: !isFetching, // ADD
        duration, // ADD
      }); // ADD

      // Log slow API calls
      if (duration > 1000) { // ADD
        console.warn( // ADD
          `[Performance] Slow API call for fetchProducts: ${duration.toFixed(0)}ms\n`, // ADD
          { queryParams, resultCount: data?.results?.length } // ADD
        ); // ADD
      } // ADD
    } // ADD
  }, [isLoading, isFetching, data, startTime, queryParams]); // ADD

  return {
    products: data?.results || [],
    totalCount: data?.count || 0,
    isLoading,
    error,
  };
};

function buildQueryParams(filters) {
  // ... existing implementation
}

export default useProductsSearch;
```

**Changes**:
- ✅ Start timing when query is initiated
- ✅ End timing when data is loaded
- ✅ Distinguish between cache hits and network requests
- ✅ Log slow API calls (> 1000ms)
- ✅ Include metadata (filter count, result count)

#### Step 7: Add Timing to FilterValidator

**File**: `frontend/react-Admin3/src/utils/FilterValidator.js`

**Add validation timing** (changes shown):
```javascript
import performanceTracker from './PerformanceTracker'; // ADD

class FilterValidator {
  static validate(filters) {
    performanceTracker.startMeasure('validation:validateAll', { // ADD
      filterCount: Object.keys(filters).length, // ADD
    }); // ADD

    const errors = [];

    // Run all validation rules
    errors.push(...this.validateTutorialFormat(filters));
    errors.push(...this.validateProducts(filters));
    errors.push(...this.validateSubjects(filters));

    performanceTracker.endMeasure('validation:validateAll', { // ADD
      errorCount: errors.length, // ADD
    }); // ADD

    return errors;
  }

  static validateTutorialFormat(filters) {
    performanceTracker.startMeasure('validation:validateTutorialFormat'); // ADD

    const errors = [];

    if (filters.tutorial_format && !filters.tutorial) {
      errors.push({
        field: 'tutorial_format',
        message: 'Tutorial format filter requires selecting "Tutorial Products"',
        severity: 'error',
        suggestion: 'Please check the "Tutorial Products" filter',
      });
    }

    performanceTracker.endMeasure('validation:validateTutorialFormat'); // ADD
    return errors;
  }

  // Similar timing for other validation methods...
}

export default FilterValidator;
```

#### Step 8: Add Timing to FilterRegistry

**File**: `frontend/react-Admin3/src/utils/FilterRegistry.js`

**Add registry operation timing**:
```javascript
import performanceTracker from './PerformanceTracker'; // ADD

class FilterRegistry {
  // ... existing code

  static getConfig(filterType) {
    performanceTracker.startMeasure('registry:getConfig'); // ADD
    const config = this.registry.get(filterType); // ADD
    performanceTracker.endMeasure('registry:getConfig'); // ADD
    return config; // ADD
  }

  static getDisplayValue(filterType, value) {
    performanceTracker.startMeasure('registry:getDisplayValue'); // ADD

    const config = this.getConfig(filterType);
    if (!config) return value;

    const displayValue = config.getDisplayValue
      ? config.getDisplayValue(value)
      : value;

    performanceTracker.endMeasure('registry:getDisplayValue'); // ADD
    return displayValue;
  }

  static toUrlParams(filters) {
    performanceTracker.startMeasure('registry:toUrlParams', { // ADD
      filterCount: Object.keys(filters).length, // ADD
    }); // ADD

    // ... existing implementation

    performanceTracker.endMeasure('registry:toUrlParams'); // ADD
    return params;
  }

  static fromUrlParams(params) {
    performanceTracker.startMeasure('registry:fromUrlParams', { // ADD
      paramCount: Array.from(params.keys()).length, // ADD
    }); // ADD

    // ... existing implementation

    performanceTracker.endMeasure('registry:fromUrlParams'); // ADD
    return filters;
  }
}

export default FilterRegistry;
```

#### Step 9: Optional React Profiler Integration

**File**: `frontend/react-Admin3/src/components/Ordering/FilterPanel.js` (optional)

**Wrap with React Profiler**:
```javascript
import { Profiler } from 'react'; // ADD
import performanceTracker from '../../utils/PerformanceTracker'; // ADD

const FilterPanel = () => {
  // ... existing component code

  // Profiler callback
  const onRenderCallback = (
    id, // "FilterPanel"
    phase, // "mount" or "update"
    actualDuration, // Time spent rendering
    baseDuration, // Estimated time without memoization
    startTime,
    commitTime,
  ) => {
    performanceTracker.recordMetric(`render:${id}`, actualDuration, {
      phase,
      baseDuration,
      wastedTime: baseDuration - actualDuration,
    });

    // Warn about slow renders
    if (actualDuration > 16) {
      console.warn(
        `[Performance] Slow render for ${id}: ${actualDuration.toFixed(2)}ms\n` +
        `  Phase: ${phase}\n` +
        `  Wasted time: ${(baseDuration - actualDuration).toFixed(2)}ms`
      );
    }
  };

  return (
    <Profiler id="FilterPanel" onRender={onRenderCallback}>
      {/* ... existing JSX */}
    </Profiler>
  );
};

export default FilterPanel;
```

**Note**: React Profiler has overhead, so this is optional and should be used selectively during development.

### Testing Strategy

**Manual Testing Checklist**:

1. **Enable performance monitoring**:
   ```javascript
   // In browser console
   localStorage.setItem('PERF_MONITORING_LEVEL', 'detailed');
   window.location.reload();
   ```

2. **Apply filters and check console**:
   - Apply CB1 subject filter
   - Check console for timing logs
   - Verify measurements within budgets

3. **Check performance summary**:
   ```javascript
   // In browser console
   window.__PERFORMANCE_TRACKER__.printSummary();
   ```

4. **Test Redux DevTools integration**:
   - Open Redux DevTools
   - Apply filters
   - Use time-travel debugging
   - Verify performance metrics visible

5. **Test budget warnings**:
   - Temporarily lower budget in `performanceBudgets.js`
   - Apply filters
   - Verify warning appears in console

6. **Test production build**:
   - Build for production: `npm run build`
   - Verify no performance monitoring code in bundle
   - Verify zero console output in production

**Unit Tests** (optional):
```javascript
// PerformanceTracker.test.js
import { PerformanceTracker } from '../PerformanceTracker';

describe('PerformanceTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new PerformanceTracker();
    tracker.setEnabled(true);
  });

  test('should measure operation duration', () => {
    tracker.startMeasure('test-operation');

    // Simulate work
    const start = Date.now();
    while (Date.now() - start < 50) {}

    const duration = tracker.endMeasure('test-operation');

    expect(duration).toBeGreaterThan(45);
    expect(duration).toBeLessThan(100);
  });

  test('should warn when budget exceeded', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    tracker.setBudget('slow-operation', 10);
    tracker.startMeasure('slow-operation');

    const start = Date.now();
    while (Date.now() - start < 50) {}

    tracker.endMeasure('slow-operation');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Budget exceeded')
    );

    consoleSpy.mockRestore();
  });

  test('should calculate stats correctly', () => {
    tracker.startMeasure('op1');
    tracker.endMeasure('op1');

    tracker.startMeasure('op1');
    tracker.endMeasure('op1');

    const metrics = tracker.getMetrics('op1');

    expect(metrics.count).toBe(2);
    expect(metrics.stats).toBeDefined();
    expect(metrics.stats.avg).toBeGreaterThan(0);
  });
});
```

---

## Integration Verification

### IV1: Performance Monitoring Active in Development

**Verification Steps**:
1. Start development server: `npm start`
2. Open browser console
3. Apply filter (CB1 subject)
4. Observe console output

**Success Criteria**:
- Performance logs visible in console
- Timing measurements for Redux actions
- URL sync timing logged
- No errors in console

### IV2: Budget Warnings Appear When Exceeded

**Verification Steps**:
1. Temporarily set strict budget: `'redux:action:setSubjects': 1` in `performanceBudgets.js`
2. Apply subject filter
3. Check console for warning

**Success Criteria**:
- Warning appears: "Budget exceeded for redux:action:setSubjects"
- Shows measured duration vs. budget
- Shows overage amount

### IV3: Performance Summary Available

**Verification Steps**:
1. Apply various filters
2. Open console
3. Run: `window.__PERFORMANCE_TRACKER__.printSummary()`

**Success Criteria**:
- Summary shows all measured operations
- Statistics (min/max/avg/p95) displayed
- Budget compliance status (✅/⚠️) shown
- Data accurate and readable

### IV4: Zero Production Overhead

**Verification Steps**:
1. Build for production: `npm run build`
2. Analyze bundle size
3. Inspect production bundle for performance monitoring code
4. Run production build and check console

**Success Criteria**:
- No performance monitoring code in production bundle
- No console logs in production
- Bundle size not increased
- Performance monitoring tree-shaken out

### IV5: Redux DevTools Integration

**Verification Steps**:
1. Install Redux DevTools extension
2. Apply filters
3. Open Redux DevTools
4. Check for performance data in state

**Success Criteria**:
- Redux DevTools shows performance metrics
- Time-travel debugging preserves performance context
- Performance summary prints on time-travel

---

## Definition of Done

- [x] PerformanceTracker utility class implemented with all required methods
- [x] Performance budget configuration file created
- [x] Redux performance monitoring middleware implemented
- [x] Performance monitoring integrated into Redux store (development only)
- [x] Timing instrumentation added to urlSyncMiddleware
- [x] API call timing added to useProductsSearch hook
- [x] Validation timing added to FilterValidator
- [x] Registry timing added to FilterRegistry
- [x] Optional React Profiler integration documented
- [x] Manual testing confirms performance visibility
- [x] Budget warnings appear when thresholds exceeded
- [x] Performance summary available via console
- [x] Zero production overhead confirmed
- [x] Redux DevTools integration working
- [x] Documentation added for using PerformanceTracker
- [x] Code reviewed by another developer

---

## Risk Assessment and Mitigation

### Primary Risk: Performance Monitoring Overhead

**Risk**: Performance monitoring code itself adds overhead, impacting the metrics it's trying to measure

**Mitigation**:
1. **Minimal instrumentation** - Only measure critical operations
2. **Conditional execution** - Guard all measurements with `if (enabled)` checks
3. **Development-only** - Tree-shake out of production builds
4. **Lazy evaluation** - Defer expensive calculations until needed
5. **Profiling the profiler** - Measure overhead of PerformanceTracker itself

**Probability**: Medium (instrumentation always has some overhead)
**Impact**: Low (development-only, can be disabled if problematic)

### Secondary Risk: False Positives from Budget Warnings

**Risk**: Budget warnings appear for operations that are actually acceptable

**Mitigation**:
1. **Calibrate budgets** - Set realistic thresholds based on actual measurements
2. **Per-environment budgets** - Adjust for different device capabilities
3. **Warning thresholds** - Warn at 80% of budget before exceeding
4. **Disable specific warnings** - Allow suppressing known false positives
5. **Context-aware budgets** - Adjust budgets based on filter complexity

**Probability**: Medium (initial budgets may need tuning)
**Impact**: Low (warnings are informational, don't block functionality)

### Rollback Plan

If performance monitoring causes issues:

1. **Immediate Rollback** (2 minutes):
   - Set `REACT_APP_PERF_MONITORING_LEVEL=off` in `.env`
   - Reload application
   - Performance monitoring disabled

2. **Selective Disable** (5 minutes):
   - Comment out specific middleware in `store.js`
   - Remove instrumentation from problematic component
   - Keep other monitoring active

3. **Full Removal** (15 minutes):
   - Git revert Story 1.15 commits
   - Remove performance monitoring files
   - Application functional without performance tracking

---

## Dependencies and Blockers

**Dependencies**:
- ✅ **Story 1.1**: urlSyncMiddleware must exist for instrumentation
- ✅ **Story 1.11**: FilterRegistry must exist for timing
- ✅ **Story 1.12**: FilterValidator must exist for timing
- ✅ **Story 1.14**: Refactored filtersSlice for cleaner monitoring

**Blockers**:
- None - Performance monitoring is non-intrusive and doesn't block other work

**Enables**:
- Data-driven performance optimization
- Regression detection for performance issues
- Validation of debouncing/memoization effectiveness
- **Phase 3 Completion** ✅

---

## Related PRD Sections

- **Section 3.1**: Non-functional requirements (Performance: Filter operations < 100ms)
- **Section 4.6**: Testing and validation strategy
- **Section 5.2**: Story 1.15 - Add Performance Monitoring for Filter Operations
- **Phase 3 Goal**: Architecture improvements and quality assurance

---

## Next Steps After Completion

1. **Calibrate Performance Budgets**: Run application under realistic conditions, adjust budgets based on actual measurements
2. **Phase 3 Complete**: All architecture improvement stories finished
3. **Move to Phase 4**: Begin enhanced testing and documentation (Stories 1.16-1.18)
4. **Performance Optimization**: Use collected metrics to identify and optimize bottlenecks
5. **Continuous Monitoring**: Integrate performance budgets into CI/CD pipeline

---

## Verification Script

```bash
# Verify PerformanceTracker created
test -f frontend/react-Admin3/src/utils/PerformanceTracker.js
echo "PerformanceTracker exists: $?"

# Verify performance budgets configuration created
test -f frontend/react-Admin3/src/config/performanceBudgets.js
echo "Performance budgets config exists: $?"

# Verify performance monitoring middleware created
test -f frontend/react-Admin3/src/store/middleware/performanceMonitoring.js
echo "Performance monitoring middleware exists: $?"

# Verify integration in store
grep "performanceMonitoringMiddleware" frontend/react-Admin3/src/store/store.js
echo "Store integration: $?"

# Verify timing added to urlSyncMiddleware
grep "performanceTracker" frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.js
echo "URL sync timing: $?"

# Verify timing added to useProductsSearch
grep "performanceTracker" frontend/react-Admin3/src/hooks/useProductsSearch.js
echo "API timing: $?"

# Verify production build excludes performance monitoring
npm run build 2>/dev/null
! grep -r "performanceTracker" frontend/react-Admin3/build/static/js/*.js 2>/dev/null
echo "Production build clean: $?"
```

---

**Story Status**: Ready for Development (after Story 1.14 complete)
**Assigned To**: [Pending]
**Started**: [Pending]
**Completed**: [Pending]
