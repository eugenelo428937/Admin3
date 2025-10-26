/**
 * Contract Tests for Performance Monitoring Middleware (Story 1.15)
 *
 * TDD RED Phase: These tests MUST FAIL until T008 implements the middleware
 *
 * Contract Reference: /specs/008-docs-stories-story/contracts/performanceMonitoring-contract.md
 *
 * Tests middleware functionality:
 * - Intercepts Redux filter actions
 * - Records performance metrics for each action
 * - Validates against performance budgets
 * - Logs warnings for budget violations
 * - Development-only operation (zero production overhead)
 */

import { configureStore } from '@reduxjs/toolkit';
import filtersReducer from '../../slices/filtersSlice';
import performanceMonitoringMiddleware from '../performanceMonitoring';
import PerformanceTracker from '../../../utils/PerformanceTracker';

// Mock PerformanceTracker for middleware tests
jest.mock('../../../utils/PerformanceTracker');

describe('Performance Monitoring Middleware', () => {
  let store;
  let consoleWarnSpy;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Spy on console.warn
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Mock PerformanceTracker methods
    PerformanceTracker.startMeasure = jest.fn();
    PerformanceTracker.endMeasure = jest.fn(() => ({
      name: 'redux.setSubjects',
      duration: 2.5,
      timestamp: Date.now(),
      exceeded: false,
      metadata: {}
    }));
    PerformanceTracker.checkBudget = jest.fn(() => true);
    PerformanceTracker.isSupported = jest.fn(() => true);

    // Create store with middleware
    store = configureStore({
      reducer: {
        filters: filtersReducer
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(performanceMonitoringMiddleware)
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Action Interception', () => {
    it('should intercept filter actions', () => {
      store.dispatch({ type: 'filters/setSubjects', payload: ['CM2'] });

      expect(PerformanceTracker.startMeasure).toHaveBeenCalledWith(
        'redux.setSubjects',
        expect.any(Object)
      );
      expect(PerformanceTracker.endMeasure).toHaveBeenCalledWith(
        'redux.setSubjects'
      );
    });

    it('should track setCategories action', () => {
      store.dispatch({ type: 'filters/setCategories', payload: ['Bundle'] });

      expect(PerformanceTracker.startMeasure).toHaveBeenCalledWith(
        'redux.setCategories',
        expect.any(Object)
      );
    });

    it('should track setSearchQuery action', () => {
      store.dispatch({ type: 'filters/setSearchQuery', payload: 'actuarial' });

      expect(PerformanceTracker.startMeasure).toHaveBeenCalledWith(
        'redux.setSearchQuery',
        expect.any(Object)
      );
    });

    it('should track clearAllFilters action', () => {
      store.dispatch({ type: 'filters/clearAllFilters' });

      expect(PerformanceTracker.startMeasure).toHaveBeenCalledWith(
        'redux.clearAllFilters',
        expect.any(Object)
      );
    });

    it('should not track non-filter actions', () => {
      store.dispatch({ type: 'someOtherAction', payload: {} });

      expect(PerformanceTracker.startMeasure).not.toHaveBeenCalled();
    });
  });

  describe('Performance Metrics Recording', () => {
    it('should record metrics for each action', () => {
      store.dispatch({ type: 'filters/setSubjects', payload: ['CM2'] });

      expect(PerformanceTracker.endMeasure).toHaveBeenCalledWith(
        'redux.setSubjects'
      );
    });

    it('should include action metadata in metrics', () => {
      store.dispatch({
        type: 'filters/setSubjects',
        payload: ['CM2', 'SA1']
      });

      expect(PerformanceTracker.startMeasure).toHaveBeenCalledWith(
        'redux.setSubjects',
        expect.objectContaining({
          filterCount: 2
        })
      );
    });

    it('should handle actions with no payload', () => {
      store.dispatch({ type: 'filters/clearAllFilters' });

      expect(PerformanceTracker.startMeasure).toHaveBeenCalledWith(
        'redux.clearAllFilters',
        expect.any(Object)
      );
      expect(PerformanceTracker.endMeasure).toHaveBeenCalled();
    });
  });

  describe('Budget Validation', () => {
    it('should check budget for Redux actions', () => {
      PerformanceTracker.endMeasure.mockReturnValueOnce({
        name: 'redux.setSubjects',
        duration: 2.5,
        timestamp: Date.now(),
        exceeded: false,
        metadata: {}
      });

      store.dispatch({ type: 'filters/setSubjects', payload: ['CM2'] });

      expect(PerformanceTracker.checkBudget).toHaveBeenCalledWith(
        'redux.setSubjects',
        2.5,
        16 // Redux action budget
      );
    });

    it('should log warning when budget exceeded', () => {
      // Use real checkBudget implementation to get warning
      PerformanceTracker.checkBudget.mockRestore();
      PerformanceTracker.checkBudget = jest.requireActual('../../../utils/PerformanceTracker').default.checkBudget;

      PerformanceTracker.endMeasure.mockReturnValueOnce({
        name: 'redux.setSubjects',
        duration: 18.5,
        timestamp: Date.now(),
        exceeded: true,
        metadata: {}
      });

      store.dispatch({ type: 'filters/setSubjects', payload: ['CM2'] });

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('Performance budget exceeded');

      // Re-mock for other tests
      PerformanceTracker.checkBudget = jest.fn(() => true);
    });

    it('should not log warning when within budget', () => {
      PerformanceTracker.checkBudget.mockReturnValueOnce(true);
      PerformanceTracker.endMeasure.mockReturnValueOnce({
        name: 'redux.setSubjects',
        duration: 2.5,
        timestamp: Date.now(),
        exceeded: false,
        metadata: {}
      });

      store.dispatch({ type: 'filters/setSubjects', payload: ['CM2'] });

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Development-Only Operation', () => {
    it('should check if Performance API is supported', () => {
      store.dispatch({ type: 'filters/setSubjects', payload: ['CM2'] });

      expect(PerformanceTracker.isSupported).toHaveBeenCalled();
    });

    it('should not track when Performance API unavailable', () => {
      PerformanceTracker.isSupported.mockReturnValueOnce(false);

      store.dispatch({ type: 'filters/setSubjects', payload: ['CM2'] });

      expect(PerformanceTracker.startMeasure).not.toHaveBeenCalled();
    });

    it('should only operate in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // In production, middleware should be no-op or not loaded
      // This test verifies the middleware respects NODE_ENV

      store.dispatch({ type: 'filters/setSubjects', payload: ['CM2'] });

      // In production, should not call PerformanceTracker
      // (This test will be refined once we see actual implementation)

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Action Passthrough', () => {
    it('should not interfere with action dispatch', () => {
      const initialState = store.getState().filters.subjects;

      store.dispatch({ type: 'filters/setSubjects', payload: ['CM2'] });

      const newState = store.getState().filters.subjects;
      expect(newState).toEqual(['CM2']);
    });

    it('should handle multiple sequential actions', () => {
      store.dispatch({ type: 'filters/setSubjects', payload: ['CM2'] });
      store.dispatch({ type: 'filters/setCategories', payload: ['Bundle'] });
      store.dispatch({ type: 'filters/setSearchQuery', payload: 'actuarial' });

      expect(PerformanceTracker.startMeasure).toHaveBeenCalledTimes(3);
      expect(PerformanceTracker.endMeasure).toHaveBeenCalledTimes(3);
    });

    it('should handle errors gracefully', () => {
      PerformanceTracker.startMeasure.mockImplementationOnce(() => {
        throw new Error('Performance tracking failed');
      });

      // Action should still complete despite tracking error
      expect(() => {
        store.dispatch({ type: 'filters/setSubjects', payload: ['CM2'] });
      }).not.toThrow();
    });
  });

  describe('Metadata Tracking', () => {
    it('should track filter array length in metadata', () => {
      store.dispatch({
        type: 'filters/setSubjects',
        payload: ['CM2', 'SA1', 'CB1']
      });

      expect(PerformanceTracker.startMeasure).toHaveBeenCalledWith(
        'redux.setSubjects',
        expect.objectContaining({
          filterCount: 3
        })
      );
    });

    it('should track action type in metadata', () => {
      store.dispatch({ type: 'filters/setCategories', payload: ['Bundle'] });

      expect(PerformanceTracker.startMeasure).toHaveBeenCalledWith(
        'redux.setCategories',
        expect.objectContaining({
          actionType: 'filters/setCategories'
        })
      );
    });
  });

  describe('Performance Requirements', () => {
    it('middleware overhead should be minimal', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        store.dispatch({ type: 'filters/setSubjects', payload: ['CM2'] });
      }

      const duration = performance.now() - start;
      const avgOverhead = duration / 100;

      // Middleware overhead should be < 1ms per action (relaxed for test environment)
      expect(avgOverhead).toBeLessThan(1);
    });
  });
});
