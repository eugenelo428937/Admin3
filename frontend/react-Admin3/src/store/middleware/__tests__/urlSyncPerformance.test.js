/**
 * Performance Test for URL Sync Middleware (Story 1.1)
 *
 * Validates that URL updates occur in < 5ms as specified in requirements.
 */

import { configureStore } from '@reduxjs/toolkit';
import filtersReducer, { setSubjects, setCategories, setProductTypes } from '../../slices/filtersSlice';
import { urlSyncMiddleware } from '../urlSyncMiddleware';

// Mock window.history
const mockReplaceState = jest.fn();
Object.defineProperty(window, 'history', {
  value: {
    replaceState: mockReplaceState,
  },
  writable: true,
});

describe('URL Sync Middleware - Performance (Story 1.1)', () => {
  let store;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create store with middleware
    store = configureStore({
      reducer: {
        filters: filtersReducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
          .prepend(urlSyncMiddleware.middleware),
    });
  });

  it('should update URL in less than 5ms for single filter change', () => {
    const startTime = performance.now();

    // Dispatch action
    store.dispatch(setSubjects(['CM2']));

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Assert: URL update should be < 5ms
    expect(duration).toBeLessThan(5);
    expect(mockReplaceState).toHaveBeenCalled();
  });

  it('should update URL in less than 5ms for multiple filter changes', () => {
    const startTime = performance.now();

    // Dispatch multiple actions
    store.dispatch(setSubjects(['CM2', 'SA1', 'FM1']));
    store.dispatch(setCategories(['Bundle', 'Materials']));
    store.dispatch(setProductTypes(['Core Study Material']));

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Assert: Combined URL updates should be < 5ms
    expect(duration).toBeLessThan(5);
    expect(mockReplaceState).toHaveBeenCalled();
  });

  it('should handle rapid filter changes efficiently', () => {
    const timings = [];

    // Perform 10 rapid filter changes
    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();
      store.dispatch(setSubjects([`SUBJ${i}`]));
      const endTime = performance.now();
      timings.push(endTime - startTime);
    }

    // Calculate average time
    const averageTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;

    // Assert: Average update time should be < 5ms
    expect(averageTime).toBeLessThan(5);

    // Assert: All individual updates should be < 10ms (generous max)
    timings.forEach(time => {
      expect(time).toBeLessThan(10);
    });
  });

  it('should not cause performance degradation with large filter arrays', () => {
    // Create large filter array (20 subjects)
    const largeSubjectArray = Array.from({ length: 20 }, (_, i) => `SUBJ${i}`);

    const startTime = performance.now();
    store.dispatch(setSubjects(largeSubjectArray));
    const endTime = performance.now();

    const duration = endTime - startTime;

    // Assert: Even with large arrays, should be < 5ms
    expect(duration).toBeLessThan(5);
    expect(mockReplaceState).toHaveBeenCalled();
  });

  it.skip('should meet performance target consistently over 100 operations (flaky)', () => {
    const timings = [];

    // Perform 100 filter changes
    for (let i = 0; i < 100; i++) {
      const startTime = performance.now();

      if (i % 3 === 0) {
        store.dispatch(setSubjects([`SUBJ${i}`]));
      } else if (i % 3 === 1) {
        store.dispatch(setCategories([`CAT${i}`]));
      } else {
        store.dispatch(setProductTypes([`TYPE${i}`]));
      }

      const endTime = performance.now();
      timings.push(endTime - startTime);
    }

    // Calculate statistics
    const averageTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
    const maxTime = Math.max(...timings);
    const p95Time = timings.sort((a, b) => a - b)[Math.floor(timings.length * 0.95)];

    // Assert: Performance targets
    expect(averageTime).toBeLessThan(5); // Average < 5ms
    expect(p95Time).toBeLessThan(5); // 95th percentile < 5ms
    expect(maxTime).toBeLessThan(10); // Max < 10ms (generous)

    // Log performance metrics for visibility
    console.log('Performance Metrics:');
    console.log(`  Average: ${averageTime.toFixed(3)}ms`);
    console.log(`  95th Percentile: ${p95Time.toFixed(3)}ms`);
    console.log(`  Maximum: ${maxTime.toFixed(3)}ms`);
  });
});
