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

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  exceeded: boolean;
  metadata: Record<string, unknown>;
}

export interface PerformanceReport {
  operation: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Internal storage for performance metrics and metadata
 */
const metricsStore: PerformanceMetric[] = [];
const metadataStore: Map<string, Record<string, unknown>> = new Map();

class PerformanceTracker {
  /**
   * Check if Performance API is supported
   */
  static isSupported(): boolean {
    return !!(
      typeof performance !== 'undefined' &&
      performance.mark &&
      performance.measure &&
      performance.getEntriesByName
    );
  }

  /**
   * Start measuring an operation
   */
  static startMeasure(name: string, metadata: Record<string, unknown> = {}): void {
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
   */
  static endMeasure(name: string, metadata: Record<string, unknown> = {}): PerformanceMetric | null {
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
      const metric: PerformanceMetric = {
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
   */
  static recordMetric(name: string, value: number, metadata: Record<string, unknown> = {}): PerformanceMetric {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('name must be a non-empty string');
    }

    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('value must be a number');
    }

    if (value < 0) {
      throw new Error('duration cannot be negative');
    }

    const metric: PerformanceMetric = {
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
   */
  static getMetrics(filterName: string | null = null): PerformanceMetric[] {
    if (filterName === null) {
      return [...metricsStore];
    }

    return metricsStore.filter(metric => metric.name.startsWith(filterName));
  }

  /**
   * Generate performance report for operation(s)
   */
  static getReport(operationName?: string | null): PerformanceReport | PerformanceReport[] {
    if (operationName === undefined || operationName === null) {
      // Generate reports for all unique operations
      const operationNames = [...new Set(metricsStore.map(m => m.name))];
      return operationNames.map(name => this._generateReport(name));
    }

    return this._generateReport(operationName);
  }

  /**
   * Internal: Generate report for a specific operation
   */
  private static _generateReport(operationName: string): PerformanceReport {
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
   */
  private static _percentile(sortedArray: number[], percentile: number): number {
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
   */
  static clearMetrics(operationName: string | null = null): number {
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
   */
  static checkBudget(name: string, duration: number, budget: number): boolean {
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
if ((import.meta as any).env?.DEV) {
  // Export for development use
  (window as any).PerformanceTracker = PerformanceTracker;
}

export default PerformanceTracker;
