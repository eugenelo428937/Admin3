/**
 * Contract Tests for PerformanceTracker Utility Class (Story 1.15)
 *
 * TDD RED Phase: These tests MUST FAIL until T006 implements the module
 *
 * Contract Reference: /specs/008-docs-stories-story/contracts/PerformanceTracker-contract.md
 *
 * Tests all 8 static methods:
 * - startMeasure()
 * - endMeasure()
 * - recordMetric()
 * - getMetrics()
 * - getReport()
 * - clearMetrics()
 * - checkBudget()
 * - isSupported()
 */

import PerformanceTracker from '../PerformanceTracker';

// Mock Performance API for Jest/jsdom environment
const mockPerformanceEntries = [];
const mockMarks = new Map();

// Mock performance.mark
const originalMark = performance.mark;
performance.mark = function(markName) {
  const entry = {
    name: markName,
    entryType: 'mark',
    startTime: performance.now(),
    duration: 0
  };
  mockMarks.set(markName, entry);
  mockPerformanceEntries.push(entry);
  return entry;
};

// Mock performance.measure
const originalMeasure = performance.measure;
performance.measure = function(measureName, startMark, endMark) {
  const start = mockMarks.get(startMark);
  const end = mockMarks.get(endMark);

  if (!start || !end) {
    throw new Error(`Mark not found: ${startMark} or ${endMark}`);
  }

  const entry = {
    name: measureName,
    entryType: 'measure',
    startTime: start.startTime,
    duration: end.startTime - start.startTime
  };
  mockPerformanceEntries.push(entry);
  return entry;
};

// Mock performance.getEntriesByName
performance.getEntriesByName = function(name, type) {
  return mockPerformanceEntries.filter(entry =>
    entry.name === name && (!type || entry.entryType === type)
  );
};

// Mock performance.clearMarks
performance.clearMarks = function(name) {
  if (name) {
    mockMarks.delete(name);
    const index = mockPerformanceEntries.findIndex(e => e.name === name && e.entryType === 'mark');
    if (index !== -1) mockPerformanceEntries.splice(index, 1);
  } else {
    mockMarks.clear();
    for (let i = mockPerformanceEntries.length - 1; i >= 0; i--) {
      if (mockPerformanceEntries[i].entryType === 'mark') {
        mockPerformanceEntries.splice(i, 1);
      }
    }
  }
};

// Mock performance.clearMeasures
performance.clearMeasures = function(name) {
  if (name) {
    const index = mockPerformanceEntries.findIndex(e => e.name === name && e.entryType === 'measure');
    if (index !== -1) mockPerformanceEntries.splice(index, 1);
  } else {
    for (let i = mockPerformanceEntries.length - 1; i >= 0; i--) {
      if (mockPerformanceEntries[i].entryType === 'measure') {
        mockPerformanceEntries.splice(i, 1);
      }
    }
  }
};

describe('PerformanceTracker', () => {

  beforeEach(() => {
    // Clear metrics before each test
    if (PerformanceTracker.clearMetrics) {
      PerformanceTracker.clearMetrics();
    }

    // Clear performance mocks
    mockPerformanceEntries.length = 0;
    mockMarks.clear();
  });

  describe('isSupported()', () => {
    it('should return true if Performance API is available', () => {
      expect(PerformanceTracker.isSupported()).toBe(true);
    });

    it('should return false if Performance API is unavailable', () => {
      const originalMark = performance.mark;
      performance.mark = undefined;

      expect(PerformanceTracker.isSupported()).toBe(false);

      performance.mark = originalMark;
    });
  });

  describe('startMeasure()', () => {
    it('should create a performance mark with name-start', () => {
      PerformanceTracker.startMeasure('testOperation');

      const marks = performance.getEntriesByName('testOperation-start', 'mark');
      expect(marks.length).toBe(1);
    });

    it('should store metadata for the measurement', () => {
      const metadata = { filterType: 'subjects', count: 2 };
      PerformanceTracker.startMeasure('testOperation', metadata);

      // Metadata should be retrievable after endMeasure
      const metric = PerformanceTracker.endMeasure('testOperation');
      expect(metric.metadata).toMatchObject(metadata);
    });

    it('should throw error if name is empty', () => {
      expect(() => {
        PerformanceTracker.startMeasure('');
      }).toThrow('name must be a non-empty string');
    });

    it('should throw error if name is not a string', () => {
      expect(() => {
        PerformanceTracker.startMeasure(123);
      }).toThrow('name must be a non-empty string');
    });
  });

  describe('endMeasure()', () => {
    it('should create performance mark and measure', () => {
      PerformanceTracker.startMeasure('testOperation');
      const metric = PerformanceTracker.endMeasure('testOperation');

      // Verify metric was created (marks are cleaned up after measure)
      expect(metric).not.toBeNull();
      expect(metric.name).toBe('testOperation');
      expect(typeof metric.duration).toBe('number');
    });

    it('should return PerformanceMetric object with correct structure', () => {
      PerformanceTracker.startMeasure('testOperation');
      const metric = PerformanceTracker.endMeasure('testOperation');

      expect(metric).toHaveProperty('name', 'testOperation');
      expect(metric).toHaveProperty('duration');
      expect(metric).toHaveProperty('timestamp');
      expect(metric).toHaveProperty('exceeded');
      expect(metric).toHaveProperty('metadata');

      expect(typeof metric.duration).toBe('number');
      expect(typeof metric.timestamp).toBe('number');
      expect(typeof metric.exceeded).toBe('boolean');
    });

    it('should merge metadata from startMeasure and endMeasure', () => {
      PerformanceTracker.startMeasure('testOperation', { start: true });
      const metric = PerformanceTracker.endMeasure('testOperation', { end: true });

      expect(metric.metadata).toMatchObject({ start: true, end: true });
    });

    it('should return null if no matching startMeasure', () => {
      const metric = PerformanceTracker.endMeasure('nonExistent');

      expect(metric).toBeNull();
    });

    it('should clear performance marks to avoid memory leaks', () => {
      PerformanceTracker.startMeasure('testOperation');
      PerformanceTracker.endMeasure('testOperation');

      const startMarks = performance.getEntriesByName('testOperation-start', 'mark');
      const endMarks = performance.getEntriesByName('testOperation-end', 'mark');

      expect(startMarks.length).toBe(0);
      expect(endMarks.length).toBe(0);
    });

    it('should throw error if name is empty', () => {
      expect(() => {
        PerformanceTracker.endMeasure('');
      }).toThrow('name must be a non-empty string');
    });
  });

  describe('recordMetric()', () => {
    it('should create PerformanceMetric without using marks', () => {
      const metric = PerformanceTracker.recordMetric('customOperation', 5.2);

      expect(metric).toHaveProperty('name', 'customOperation');
      expect(metric).toHaveProperty('duration', 5.2);
      expect(metric).toHaveProperty('timestamp');
    });

    it('should include metadata in metric', () => {
      const metadata = { operationType: 'validation' };
      const metric = PerformanceTracker.recordMetric('customOperation', 5.2, metadata);

      expect(metric.metadata).toMatchObject(metadata);
    });

    it('should throw error if value is not a number', () => {
      expect(() => {
        PerformanceTracker.recordMetric('test', 'not a number');
      }).toThrow();
    });

    it('should throw error if value is negative', () => {
      expect(() => {
        PerformanceTracker.recordMetric('test', -5);
      }).toThrow('duration cannot be negative');
    });
  });

  describe('getMetrics()', () => {
    beforeEach(() => {
      PerformanceTracker.recordMetric('redux.setSubjects', 3.2);
      PerformanceTracker.recordMetric('redux.setCategories', 2.8);
      PerformanceTracker.recordMetric('urlSync', 1.5);
    });

    it('should return all metrics when no filter provided', () => {
      const metrics = PerformanceTracker.getMetrics();

      expect(metrics.length).toBe(3);
    });

    it('should filter metrics by name prefix', () => {
      const reduxMetrics = PerformanceTracker.getMetrics('redux');

      expect(reduxMetrics.length).toBe(2);
      expect(reduxMetrics.every(m => m.name.startsWith('redux'))).toBe(true);
    });

    it('should return empty array if no matches', () => {
      const metrics = PerformanceTracker.getMetrics('nonExistent');

      expect(metrics).toEqual([]);
    });
  });

  describe('getReport()', () => {
    beforeEach(() => {
      // Record multiple metrics for same operation
      PerformanceTracker.recordMetric('redux.setSubjects', 1.2);
      PerformanceTracker.recordMetric('redux.setSubjects', 3.4);
      PerformanceTracker.recordMetric('redux.setSubjects', 8.5);
      PerformanceTracker.recordMetric('redux.setSubjects', 2.1);
      PerformanceTracker.recordMetric('urlSync', 1.5);
    });

    it('should generate report for specific operation', () => {
      const report = PerformanceTracker.getReport('redux.setSubjects');

      expect(report).toHaveProperty('operation', 'redux.setSubjects');
      expect(report).toHaveProperty('count', 4);
      expect(report).toHaveProperty('min', 1.2);
      expect(report).toHaveProperty('max', 8.5);
      expect(report).toHaveProperty('avg');
      expect(report).toHaveProperty('p50');
      expect(report).toHaveProperty('p95');
      expect(report).toHaveProperty('p99');
    });

    it('should calculate correct average', () => {
      const report = PerformanceTracker.getReport('redux.setSubjects');

      const expectedAvg = (1.2 + 3.4 + 8.5 + 2.1) / 4;
      expect(report.avg).toBeCloseTo(expectedAvg, 2);
    });

    it('should calculate correct percentiles', () => {
      const report = PerformanceTracker.getReport('redux.setSubjects');

      // For values [1.2, 2.1, 3.4, 8.5]:
      // p50 (median) should be between 2.1 and 3.4
      expect(report.p50).toBeGreaterThanOrEqual(2.1);
      expect(report.p50).toBeLessThanOrEqual(3.4);

      // p95 should be close to max
      expect(report.p95).toBeGreaterThan(3.4);
    });

    it('should return array of reports when no operation specified', () => {
      const reports = PerformanceTracker.getReport();

      expect(Array.isArray(reports)).toBe(true);
      expect(reports.length).toBe(2); // redux.setSubjects and urlSync
      expect(reports.some(r => r.operation === 'redux.setSubjects')).toBe(true);
      expect(reports.some(r => r.operation === 'urlSync')).toBe(true);
    });
  });

  describe('clearMetrics()', () => {
    beforeEach(() => {
      PerformanceTracker.recordMetric('redux.setSubjects', 3.2);
      PerformanceTracker.recordMetric('redux.setCategories', 2.8);
      PerformanceTracker.recordMetric('urlSync', 1.5);
    });

    it('should clear all metrics when no operation specified', () => {
      const cleared = PerformanceTracker.clearMetrics();

      expect(cleared).toBe(3);
      expect(PerformanceTracker.getMetrics().length).toBe(0);
    });

    it('should clear metrics for specific operation only', () => {
      const cleared = PerformanceTracker.clearMetrics('redux.setSubjects');

      expect(cleared).toBe(1);
      expect(PerformanceTracker.getMetrics().length).toBe(2);
      expect(PerformanceTracker.getMetrics('redux.setSubjects').length).toBe(0);
    });

    it('should return 0 if no metrics to clear', () => {
      PerformanceTracker.clearMetrics();
      const cleared = PerformanceTracker.clearMetrics();

      expect(cleared).toBe(0);
    });
  });

  describe('checkBudget()', () => {
    let consoleWarnSpy;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should return true if duration within budget', () => {
      const result = PerformanceTracker.checkBudget('urlSync', 3.2, 5);

      expect(result).toBe(true);
    });

    it('should return false if duration exceeds budget', () => {
      const result = PerformanceTracker.checkBudget('urlSync', 8.5, 5);

      expect(result).toBe(false);
    });

    it('should log warning when budget exceeded', () => {
      PerformanceTracker.checkBudget('urlSync', 8.5, 5);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('Performance budget exceeded');
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('urlSync');
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('8.5ms');
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('5ms');
    });

    it('should not log warning when within budget', () => {
      PerformanceTracker.checkBudget('urlSync', 3.2, 5);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Performance Requirements', () => {
    it('startMeasure should complete in < 0.1ms', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        PerformanceTracker.startMeasure(`test${i}`);
      }

      const duration = performance.now() - start;
      const avgDuration = duration / 100;

      expect(avgDuration).toBeLessThan(0.1);
    });

    it('endMeasure should complete in < 0.5ms', () => {
      for (let i = 0; i < 100; i++) {
        PerformanceTracker.startMeasure(`test${i}`);
      }

      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        PerformanceTracker.endMeasure(`test${i}`);
      }

      const duration = performance.now() - start;
      const avgDuration = duration / 100;

      expect(avgDuration).toBeLessThan(0.5);
    });

    it('getMetrics should complete in < 1ms for 1000 metrics', () => {
      for (let i = 0; i < 1000; i++) {
        PerformanceTracker.recordMetric(`test${i}`, 5);
      }

      const start = performance.now();
      PerformanceTracker.getMetrics();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1);
    });

    it('getReport should complete in < 20ms for 1000 metrics', () => {
      for (let i = 0; i < 1000; i++) {
        PerformanceTracker.recordMetric('redux.setSubjects', i);
      }

      const start = performance.now();
      PerformanceTracker.getReport('redux.setSubjects');
      const duration = performance.now() - start;

      // Use generous threshold to avoid flakiness in CI/slow environments
      expect(duration).toBeLessThan(20);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing startMeasure gracefully', () => {
      const metric = PerformanceTracker.endMeasure('neverStarted');

      expect(metric).toBeNull();
    });

    it('should handle concurrent measurements with same name', () => {
      PerformanceTracker.startMeasure('operation');
      PerformanceTracker.startMeasure('operation'); // Start again before ending

      const metric = PerformanceTracker.endMeasure('operation');

      expect(metric).not.toBeNull();
      expect(metric.name).toBe('operation');
    });

    it('should handle very large metric values', () => {
      const metric = PerformanceTracker.recordMetric('largeOperation', 999999);

      expect(metric.duration).toBe(999999);
    });

    it('should handle empty metadata', () => {
      PerformanceTracker.startMeasure('test', {});
      const metric = PerformanceTracker.endMeasure('test', {});

      expect(metric.metadata).toEqual({});
    });
  });
});
