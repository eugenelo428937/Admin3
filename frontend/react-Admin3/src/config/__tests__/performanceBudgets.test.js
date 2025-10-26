/**
 * Contract Tests for Performance Budgets Configuration (Story 1.15)
 *
 * TDD RED Phase: These tests MUST FAIL until T007 implements the config
 *
 * Contract Reference: /specs/008-docs-stories-story/contracts/performanceBudgets-contract.md
 *
 * Tests configuration constants:
 * - REDUX_ACTION_BUDGET: 16ms (60 FPS threshold)
 * - URL_SYNC_BUDGET: 5ms
 * - API_CALL_BUDGET: 1000ms
 * - VALIDATION_BUDGET: 10ms
 * - REGISTRY_LOOKUP_BUDGET: 1ms
 */

import {
  PERFORMANCE_BUDGETS,
  REDUX_ACTION_BUDGET,
  URL_SYNC_BUDGET,
  API_CALL_BUDGET,
  VALIDATION_BUDGET,
  REGISTRY_LOOKUP_BUDGET,
  getBudgetForOperation,
  isOperationWithinBudget,
  PERFORMANCE_MONITORING_CONFIG
} from '../performanceBudgets';

describe('Performance Budgets Configuration', () => {

  describe('Budget Constants', () => {
    it('should define REDUX_ACTION_BUDGET as 16ms', () => {
      expect(REDUX_ACTION_BUDGET).toBe(16);
    });

    it('should define URL_SYNC_BUDGET as 5ms', () => {
      expect(URL_SYNC_BUDGET).toBe(5);
    });

    it('should define API_CALL_BUDGET as 1000ms', () => {
      expect(API_CALL_BUDGET).toBe(1000);
    });

    it('should define VALIDATION_BUDGET as 10ms', () => {
      expect(VALIDATION_BUDGET).toBe(10);
    });

    it('should define REGISTRY_LOOKUP_BUDGET as 1ms', () => {
      expect(REGISTRY_LOOKUP_BUDGET).toBe(1);
    });
  });

  describe('PERFORMANCE_BUDGETS Object', () => {
    it('should define all budget categories', () => {
      expect(PERFORMANCE_BUDGETS).toHaveProperty('redux');
      expect(PERFORMANCE_BUDGETS).toHaveProperty('urlSync');
      expect(PERFORMANCE_BUDGETS).toHaveProperty('api');
      expect(PERFORMANCE_BUDGETS).toHaveProperty('validation');
      expect(PERFORMANCE_BUDGETS).toHaveProperty('registry');
    });

    it('should have correct values for each category', () => {
      expect(PERFORMANCE_BUDGETS.redux).toBe(16);
      expect(PERFORMANCE_BUDGETS.urlSync).toBe(5);
      expect(PERFORMANCE_BUDGETS.api).toBe(1000);
      expect(PERFORMANCE_BUDGETS.validation).toBe(10);
      expect(PERFORMANCE_BUDGETS.registry).toBe(1);
    });

    it('should be frozen (immutable)', () => {
      expect(() => {
        PERFORMANCE_BUDGETS.redux = 999;
      }).toThrow();
    });
  });

  describe('getBudgetForOperation()', () => {
    it('should return correct budget for redux operations', () => {
      expect(getBudgetForOperation('redux.setSubjects')).toBe(16);
      expect(getBudgetForOperation('redux.setCategories')).toBe(16);
      expect(getBudgetForOperation('redux.clearAllFilters')).toBe(16);
    });

    it('should return correct budget for urlSync operations', () => {
      expect(getBudgetForOperation('urlSync')).toBe(5);
      expect(getBudgetForOperation('urlSync.updateParams')).toBe(5);
    });

    it('should return correct budget for API operations', () => {
      expect(getBudgetForOperation('api.products')).toBe(1000);
      expect(getBudgetForOperation('api.subjects')).toBe(1000);
    });

    it('should return correct budget for validation operations', () => {
      expect(getBudgetForOperation('validation.subjects')).toBe(10);
      expect(getBudgetForOperation('validation.categories')).toBe(10);
    });

    it('should return correct budget for registry operations', () => {
      expect(getBudgetForOperation('registry.lookup')).toBe(1);
      expect(getBudgetForOperation('registry.getFilterType')).toBe(1);
    });

    it('should handle unknown operations gracefully', () => {
      expect(getBudgetForOperation('unknown.operation')).toBeUndefined();
    });

    it('should throw error if operation is not a string', () => {
      expect(() => {
        getBudgetForOperation(null);
      }).toThrow('operation must be a non-empty string');

      expect(() => {
        getBudgetForOperation(123);
      }).toThrow('operation must be a non-empty string');
    });
  });

  describe('isOperationWithinBudget()', () => {
    it('should return true when duration within budget', () => {
      expect(isOperationWithinBudget('redux.setSubjects', 12)).toBe(true);
      expect(isOperationWithinBudget('urlSync', 3)).toBe(true);
      expect(isOperationWithinBudget('api.products', 500)).toBe(true);
    });

    it('should return false when duration exceeds budget', () => {
      expect(isOperationWithinBudget('redux.setSubjects', 18)).toBe(false);
      expect(isOperationWithinBudget('urlSync', 8)).toBe(false);
      expect(isOperationWithinBudget('api.products', 1200)).toBe(false);
    });

    it('should return true when duration equals budget', () => {
      expect(isOperationWithinBudget('redux.setSubjects', 16)).toBe(true);
      expect(isOperationWithinBudget('urlSync', 5)).toBe(true);
    });

    it('should handle unknown operations', () => {
      expect(isOperationWithinBudget('unknown.operation', 10)).toBe(true);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => {
        isOperationWithinBudget('redux.setSubjects', 'not a number');
      }).toThrow();

      expect(() => {
        isOperationWithinBudget('redux.setSubjects', -5);
      }).toThrow('duration cannot be negative');
    });
  });

  describe('PERFORMANCE_MONITORING_CONFIG', () => {
    it('should define monitoring level', () => {
      expect(PERFORMANCE_MONITORING_CONFIG).toHaveProperty('level');
      expect(['off', 'minimal', 'standard', 'verbose']).toContain(
        PERFORMANCE_MONITORING_CONFIG.level
      );
    });

    it('should define enabled flag', () => {
      expect(PERFORMANCE_MONITORING_CONFIG).toHaveProperty('enabled');
      expect(typeof PERFORMANCE_MONITORING_CONFIG.enabled).toBe('boolean');
    });

    it('should only enable in development', () => {
      if (process.env.NODE_ENV === 'production') {
        expect(PERFORMANCE_MONITORING_CONFIG.enabled).toBe(false);
      } else {
        expect(PERFORMANCE_MONITORING_CONFIG.enabled).toBe(true);
      }
    });

    it('should define console logging flag', () => {
      expect(PERFORMANCE_MONITORING_CONFIG).toHaveProperty('consoleLogging');
      expect(typeof PERFORMANCE_MONITORING_CONFIG.consoleLogging).toBe('boolean');
    });

    it('should define Redux DevTools integration flag', () => {
      expect(PERFORMANCE_MONITORING_CONFIG).toHaveProperty('reduxDevTools');
      expect(typeof PERFORMANCE_MONITORING_CONFIG.reduxDevTools).toBe('boolean');
    });

    it('should define operation filters', () => {
      expect(PERFORMANCE_MONITORING_CONFIG).toHaveProperty('includeOperations');
      expect(Array.isArray(PERFORMANCE_MONITORING_CONFIG.includeOperations)).toBe(true);
    });

    it('should be frozen (immutable)', () => {
      expect(() => {
        PERFORMANCE_MONITORING_CONFIG.enabled = false;
      }).toThrow();
    });
  });

  describe('Budget Rationale', () => {
    it('REDUX_ACTION_BUDGET should support 60 FPS', () => {
      // 60 FPS = 16.67ms per frame
      // Redux action budget of 16ms leaves headroom for rendering
      expect(REDUX_ACTION_BUDGET).toBeLessThanOrEqual(16.67);
    });

    it('URL_SYNC_BUDGET should be minimal overhead', () => {
      // URL sync should be < 5ms to not interfere with user interactions
      expect(URL_SYNC_BUDGET).toBeLessThanOrEqual(5);
    });

    it('API_CALL_BUDGET should be reasonable for network requests', () => {
      // 1 second is standard for API timeout warnings
      expect(API_CALL_BUDGET).toBe(1000);
    });

    it('VALIDATION_BUDGET should be fast enough for real-time feedback', () => {
      // Validation should complete in < 10ms for instant feedback
      expect(VALIDATION_BUDGET).toBeLessThanOrEqual(10);
    });

    it('REGISTRY_LOOKUP_BUDGET should be nearly instant', () => {
      // Registry lookups are in-memory, should be < 1ms
      expect(REGISTRY_LOOKUP_BUDGET).toBeLessThanOrEqual(1);
    });
  });

  describe('Configuration Validation', () => {
    it('all budget values should be positive numbers', () => {
      expect(REDUX_ACTION_BUDGET).toBeGreaterThan(0);
      expect(URL_SYNC_BUDGET).toBeGreaterThan(0);
      expect(API_CALL_BUDGET).toBeGreaterThan(0);
      expect(VALIDATION_BUDGET).toBeGreaterThan(0);
      expect(REGISTRY_LOOKUP_BUDGET).toBeGreaterThan(0);
    });

    it('all budget values should be integers', () => {
      expect(Number.isInteger(REDUX_ACTION_BUDGET)).toBe(true);
      expect(Number.isInteger(URL_SYNC_BUDGET)).toBe(true);
      expect(Number.isInteger(API_CALL_BUDGET)).toBe(true);
      expect(Number.isInteger(VALIDATION_BUDGET)).toBe(true);
      expect(Number.isInteger(REGISTRY_LOOKUP_BUDGET)).toBe(true);
    });

    it('budgets should be ordered by expected duration', () => {
      // Registry < URL Sync < Validation < Redux < API
      expect(REGISTRY_LOOKUP_BUDGET).toBeLessThan(URL_SYNC_BUDGET);
      expect(URL_SYNC_BUDGET).toBeLessThan(VALIDATION_BUDGET);
      expect(VALIDATION_BUDGET).toBeLessThan(REDUX_ACTION_BUDGET);
      expect(REDUX_ACTION_BUDGET).toBeLessThan(API_CALL_BUDGET);
    });
  });

  describe('Export Verification', () => {
    it('should export all required constants', () => {
      expect(PERFORMANCE_BUDGETS).toBeDefined();
      expect(REDUX_ACTION_BUDGET).toBeDefined();
      expect(URL_SYNC_BUDGET).toBeDefined();
      expect(API_CALL_BUDGET).toBeDefined();
      expect(VALIDATION_BUDGET).toBeDefined();
      expect(REGISTRY_LOOKUP_BUDGET).toBeDefined();
    });

    it('should export helper functions', () => {
      expect(typeof getBudgetForOperation).toBe('function');
      expect(typeof isOperationWithinBudget).toBe('function');
    });

    it('should export configuration object', () => {
      expect(PERFORMANCE_MONITORING_CONFIG).toBeDefined();
      expect(typeof PERFORMANCE_MONITORING_CONFIG).toBe('object');
    });
  });
});
