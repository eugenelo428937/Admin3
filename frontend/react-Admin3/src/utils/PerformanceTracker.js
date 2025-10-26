/**
 * PerformanceTracker Utility Class (Story 1.15)
 *
 * Provides browser Performance API wrapper for tracking operation timing.
 * Supports performance budgets, metrics collection, and reporting.
 *
 * Contract Reference: /specs/008-docs-stories-story/contracts/PerformanceTracker-contract.md
 *
 * All methods are static - no instantiation required.
 * Development-only - tree-shaken in production builds.
 */

/**
 * Internal storage for performance metrics and metadata
 */
const metricsStore = [];
const metadataStore = new Map();

/**
 * PerformanceMetric object structure
 * @typedef {Object} PerformanceMetric
 * @property {string} name - Operation name
 * @property {number} duration - Duration in milliseconds
 * @property {number} timestamp - Timestamp when measurement ended
 * @property {boolean} exceeded - Whether performance budget was exceeded
 * @property {Object} metadata - Additional context data
 */

/**
 * PerformanceReport object structure
 * @typedef {Object} PerformanceReport
 * @property {string} operation - Operation name
 * @property {number} count - Number of measurements
 * @property {number} min - Minimum duration
 * @property {number} max - Maximum duration
 * @property {number} avg - Average duration
 * @property {number} p50 - 50th percentile (median)
 * @property {number} p95 - 95th percentile
 * @property {number} p99 - 99th percentile
 */

class PerformanceTracker {
  /**
   * Check if Performance API is supported
   * @returns {boolean} True if Performance API available
   */
  static isSupported() {
    return !!(
      typeof performance !== 'undefined' &&
      performance.mark &&
      performance.measure &&
      performance.getEntriesByName
    );
  }

  /**
   * Start measuring an operation
   * @param {string} name - Operation name (must be non-empty string)
   * @param {Object} metadata - Optional metadata to store with measurement
   * @throws {Error} If name is not a non-empty string
   */
  static startMeasure(name, metadata = {}) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('name must be a non-empty string');
    }

    if (!this.isSupported()) {
      return;
    }

    try {
      const markName = `${name}-start`;
      performance.mark(markName);

      // Store metadata for later retrieval in endMeasure
      metadataStore.set(name, metadata);
    } catch (error) {
      // Gracefully handle performance API errors
      console.warn(`[PerformanceTracker] Failed to start measure for ${name}:`, error);
    }
  }

  /**
   * End measuring an operation and return PerformanceMetric
   * @param {string} name - Operation name (must match startMeasure call)
   * @param {Object} metadata - Optional additional metadata to merge
   * @returns {PerformanceMetric|null} Performance metric or null if startMeasure wasn't called
   * @throws {Error} If name is not a non-empty string
   */
  static endMeasure(name, metadata = {}) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('name must be a non-empty string');
    }

    if (!this.isSupported()) {
      return null;
    }

    try {
      const startMarkName = `${name}-start`;
      const endMarkName = `${name}-end`;

      // Check if start mark exists
      const startMarks = performance.getEntriesByName(startMarkName, 'mark');
      if (startMarks.length === 0) {
        return null;
      }

      // Create end mark
      performance.mark(endMarkName);

      // Create measure
      performance.measure(name, startMarkName, endMarkName);

      // Get measure entry
      const measures = performance.getEntriesByName(name, 'measure');
      const measure = measures[measures.length - 1]; // Get latest measure

      // Merge metadata from startMeasure and endMeasure
      const startMetadata = metadataStore.get(name) || {};
      const combinedMetadata = { ...startMetadata, ...metadata };

      // Create PerformanceMetric object
      const metric = {
        name,
        duration: measure.duration,
        timestamp: measure.startTime + measure.duration,
        exceeded: false, // Will be set by checkBudget if needed
        metadata: combinedMetadata
      };

      // Store metric
      metricsStore.push(metric);

      // Clean up performance marks to avoid memory leaks
      performance.clearMarks(startMarkName);
      performance.clearMarks(endMarkName);
      performance.clearMeasures(name);

      // Clean up metadata
      metadataStore.delete(name);

      return metric;
    } catch (error) {
      console.warn(`[PerformanceTracker] Failed to end measure for ${name}:`, error);
      return null;
    }
  }

  /**
   * Record a metric directly without using marks/measures
   * @param {string} name - Operation name
   * @param {number} value - Duration value in milliseconds
   * @param {Object} metadata - Optional metadata
   * @returns {PerformanceMetric} The recorded metric
   * @throws {Error} If name is not a string or value is invalid
   */
  static recordMetric(name, value, metadata = {}) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('name must be a non-empty string');
    }

    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('value must be a number');
    }

    if (value < 0) {
      throw new Error('duration cannot be negative');
    }

    const metric = {
      name,
      duration: value,
      timestamp: performance.now(),
      exceeded: false,
      metadata
    };

    metricsStore.push(metric);
    return metric;
  }

  /**
   * Get stored metrics, optionally filtered by name prefix
   * @param {string|null} filterName - Optional name prefix to filter by
   * @returns {PerformanceMetric[]} Array of metrics
   */
  static getMetrics(filterName = null) {
    if (filterName === null) {
      return [...metricsStore];
    }

    return metricsStore.filter(metric => metric.name.startsWith(filterName));
  }

  /**
   * Generate performance report for operation(s)
   * @param {string|null} operationName - Specific operation or null for all
   * @returns {PerformanceReport|PerformanceReport[]} Report(s)
   */
  static getReport(operationName = null) {
    if (operationName === null) {
      // Generate reports for all unique operations
      const operationNames = [...new Set(metricsStore.map(m => m.name))];
      return operationNames.map(name => this._generateReport(name));
    }

    return this._generateReport(operationName);
  }

  /**
   * Internal: Generate report for a specific operation
   * @private
   * @param {string} operationName - Operation name
   * @returns {PerformanceReport} Performance report
   */
  static _generateReport(operationName) {
    const metrics = metricsStore.filter(m => m.name === operationName);
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);

    if (durations.length === 0) {
      return {
        operation: operationName,
        count: 0,
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0
      };
    }

    const sum = durations.reduce((acc, d) => acc + d, 0);
    const avg = sum / durations.length;

    return {
      operation: operationName,
      count: durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
      avg: parseFloat(avg.toFixed(2)),
      p50: this._percentile(durations, 50),
      p95: this._percentile(durations, 95),
      p99: this._percentile(durations, 99)
    };
  }

  /**
   * Internal: Calculate percentile from sorted array
   * @private
   * @param {number[]} sortedArray - Sorted array of numbers
   * @param {number} percentile - Percentile (0-100)
   * @returns {number} Percentile value
   */
  static _percentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    if (sortedArray.length === 1) return sortedArray[0];

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Clear stored metrics
   * @param {string|null} operationName - Specific operation or null for all
   * @returns {number} Number of metrics cleared
   */
  static clearMetrics(operationName = null) {
    if (operationName === null) {
      const count = metricsStore.length;
      metricsStore.length = 0;
      metadataStore.clear();
      return count;
    }

    const initialLength = metricsStore.length;
    const filteredMetrics = metricsStore.filter(m => m.name !== operationName);
    metricsStore.length = 0;
    metricsStore.push(...filteredMetrics);

    return initialLength - metricsStore.length;
  }

  /**
   * Check if duration is within budget and log warning if exceeded
   * @param {string} name - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {number} budget - Budget threshold in milliseconds
   * @returns {boolean} True if within budget, false if exceeded
   */
  static checkBudget(name, duration, budget) {
    const withinBudget = duration <= budget;

    if (!withinBudget) {
      console.warn(
        `⚠️ Performance budget exceeded: ${name} took ${duration}ms (budget: ${budget}ms, +${(duration - budget).toFixed(1)}ms)`
      );
    }

    return withinBudget;
  }
}

// Development-only export
if (process.env.NODE_ENV === 'development') {
  // Export for development use
  window.PerformanceTracker = PerformanceTracker;
}

export default PerformanceTracker;
