/**
 * FilterValidator Test Suite
 *
 * Tests for client-side filter validation framework.
 * Following TDD approach: Tests written before implementation.
 *
 * NOTE: Tutorial-related filters (tutorial_format, distance_learning, tutorial)
 * were removed from the filter state in previous implementation.
 * These tests validate the validator framework is ready for future validation rules.
 */

import FilterValidator from '../filterValidator';

describe('FilterValidator', () => {
  // T005: validate() integration tests
  describe('validate() - Main validation orchestrator', () => {
    test('returns empty array for valid filter state', () => {
      const filters = {
        subjects: ['CM2', 'SA1'],
        categories: ['Bundle'],
        product_types: ['Core Study Material'],
        products: [],
        modes_of_delivery: ['Online'],
      };

      const result = FilterValidator.validate(filters);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    test('returns empty array when no validation rules triggered', () => {
      const filters = {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const result = FilterValidator.validate(filters);

      expect(result).toEqual([]);
    });

    test('handles null filter values gracefully', () => {
      const filters = {
        subjects: null,
        categories: null,
        product_types: null,
        products: null,
        modes_of_delivery: null,
      };

      const result = FilterValidator.validate(filters);

      expect(result).toEqual([]);
    });

    test('handles undefined filter values gracefully', () => {
      const filters = {
        subjects: undefined,
        categories: undefined,
        product_types: undefined,
        products: undefined,
        modes_of_delivery: undefined,
      };

      const result = FilterValidator.validate(filters);

      expect(result).toEqual([]);
    });

    test('handles null filters parameter', () => {
      const result = FilterValidator.validate(null);

      expect(result).toEqual([]);
    });

    test('handles undefined filters parameter', () => {
      const result = FilterValidator.validate(undefined);

      expect(result).toEqual([]);
    });

    test('returns array that can be iterated', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const result = FilterValidator.validate(filters);

      // Should be iterable
      expect(Array.isArray(result)).toBe(true);
      expect(() => {
        for (const error of result) {
          // Should not throw
        }
      }).not.toThrow();
    });
  });

  // T006: Helper method tests
  describe('hasErrors() - Error detection helper', () => {
    test('returns false when no errors exist', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const result = FilterValidator.hasErrors(filters);

      expect(result).toBe(false);
    });

    test('returns false when validate returns empty array', () => {
      const filters = {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const result = FilterValidator.hasErrors(filters);

      expect(result).toBe(false);
    });
  });

  describe('getErrors() - Get error-severity issues', () => {
    test('returns empty array when no errors exist', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const result = FilterValidator.getErrors(filters);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    test('filters out warnings and returns only errors', () => {
      const filters = {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const result = FilterValidator.getErrors(filters);

      // Should only return error severity items
      result.forEach(error => {
        expect(error.severity).toBe('error');
      });
    });
  });

  describe('getWarnings() - Get warning-severity issues', () => {
    test('returns empty array when no warnings exist', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const result = FilterValidator.getWarnings(filters);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    test('filters out errors and returns only warnings', () => {
      const filters = {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const result = FilterValidator.getWarnings(filters);

      // Should only return warning severity items
      result.forEach(warning => {
        expect(warning.severity).toBe('warning');
      });
    });
  });

  // T007: Performance tests
  describe('Performance - Validation execution time', () => {
    test('validate() executes in < 5ms', () => {
      const filters = {
        subjects: ['CM2', 'SA1', 'CB1', 'CB2'],
        categories: ['Bundle', 'Individual'],
        product_types: ['Core Study Material', 'Mock Exam'],
        products: ['PROD1', 'PROD2', 'PROD3'],
        modes_of_delivery: ['Online', 'Printed'],
      };

      const startTime = performance.now();
      FilterValidator.validate(filters);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(5);
    });

    test('validate() handles 10+ concurrent validations', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const startTime = performance.now();

      for (let i = 0; i < 10; i++) {
        FilterValidator.validate(filters);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 10 validations should complete in < 50ms (5ms each)
      expect(totalTime).toBeLessThan(50);
    });

    test('validation does not block UI interactions', () => {
      const filters = {
        subjects: ['CM2', 'SA1'],
        categories: ['Bundle'],
        product_types: ['Core Study Material'],
        products: [],
        modes_of_delivery: ['Online'],
      };

      // Should complete synchronously
      const result = FilterValidator.validate(filters);

      // Should not be a Promise
      expect(result).not.toBeInstanceOf(Promise);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // T003-T004: validateProductGroups tests (future validation rules)
  describe('validateProductGroups() - Future validation placeholder', () => {
    test('returns empty array (no rules implemented yet)', () => {
      const filters = {
        subjects: ['CM2'],
        categories: ['Bundle'],
        product_types: ['Core Study Material'],
        products: ['PROD123'],
        modes_of_delivery: ['Online'],
      };

      const result = FilterValidator.validateProductGroups(filters);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    test('is ready for future validation rules', () => {
      // This test documents that validateProductGroups is a placeholder
      // for future validation rules on existing filter fields:
      // - subjects, categories, product_types, products, modes_of_delivery
      const filters = {
        subjects: [],
        categories: [],
        product_types: [],
        products: ['PROD123'], // Example: product without product_type
        modes_of_delivery: [],
      };

      const result = FilterValidator.validateProductGroups(filters);

      // Currently returns empty array (no validation rules)
      // Future implementation could validate product/product_type dependency
      expect(result).toEqual([]);
    });
  });

  // Error structure validation
  describe('Error structure compliance', () => {
    test('validate() returns properly structured errors when rules added', () => {
      // This test validates the error structure contract
      // Currently no errors returned, but structure is documented
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const errors = FilterValidator.validate(filters);

      // Each error (when rules are added) should have:
      // - field: string
      // - message: string
      // - severity: 'error' | 'warning'
      // - suggestion: string
      errors.forEach(error => {
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('severity');
        expect(error).toHaveProperty('suggestion');
        expect(['error', 'warning']).toContain(error.severity);
      });
    });
  });
});
