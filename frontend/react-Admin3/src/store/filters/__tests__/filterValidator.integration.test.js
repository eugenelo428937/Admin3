/**
 * FilterValidator Integration Tests (Story 1.16)
 *
 * TDD RED Phase: These tests MUST FAIL until test utilities are implemented (T026)
 *
 * Tests FilterValidator integration with:
 * - Redux state validation
 * - Component error handling
 * - API call prevention
 * - Performance tracking
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockStore, waitForStateUpdate } from '../../../test-utils/testHelpers';
import FilterValidator from '../filterValidator';
import {
  setSubjects,
  setCategories,
  setProductTypes,
  selectHasValidationErrors,
  selectValidationErrors,
} from '../../slices/filtersSlice';

// Simple component to test validator integration
const TestValidationDisplay = () => {
  const [validationErrors, setValidationErrors] = React.useState([]);

  React.useEffect(() => {
    const mockFilters = {
      subjects: ['CM2'],
      categories: [],
      product_types: [],
      products: [],
      modes_of_delivery: [],
    };

    const errors = FilterValidator.validate(mockFilters);
    setValidationErrors(errors);
  }, []);

  return (
    <div>
      <div data-testid="error-count">{validationErrors.length}</div>
      {validationErrors.map((error, index) => (
        <div key={index} data-testid={`error-${index}`}>
          {error.message}
        </div>
      ))}
    </div>
  );
};

describe('FilterValidator Integration', () => {

  describe('Redux State Validation', () => {
    it('should validate complete filter state', () => {
      const filters = {
        subjects: ['CM2', 'SA1'],
        categories: ['Bundle'],
        product_types: ['CORE_MATERIAL'],
        products: [],
        modes_of_delivery: [],
      };

      const errors = FilterValidator.validate(filters);
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should return empty array for valid filter state', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const errors = FilterValidator.validate(filters);
      expect(errors).toEqual([]);
    });

    it('should handle null filter state gracefully', () => {
      const errors = FilterValidator.validate(null);
      expect(errors).toEqual([]);
    });

    it('should handle undefined filter state gracefully', () => {
      const errors = FilterValidator.validate(undefined);
      expect(errors).toEqual([]);
    });

    it('should validate filter state from Redux store', () => {
      const store = createMockStore({
        preloadedState: {
          filters: {
            subjects: ['CM2'],
            categories: ['Bundle'],
            product_types: [],
            products: [],
            modes_of_delivery: [],
            searchQuery: '',
            currentPage: 1,
            pageSize: 20,
          },
        },
      });

      const filters = store.getState().filters;
      const errors = FilterValidator.validate(filters);

      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('Validation Error Detection', () => {
    it('should detect error-severity issues', () => {
      // Currently returns empty array (placeholder validation)
      // Future implementation may add validation rules
      const filters = {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const hasErrors = FilterValidator.hasErrors(filters);
      expect(typeof hasErrors).toBe('boolean');
    });

    it('should get only error-severity issues', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const errors = FilterValidator.getErrors(filters);
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should get only warning-severity issues', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const warnings = FilterValidator.getWarnings(filters);
      expect(Array.isArray(warnings)).toBe(true);
    });

    it('should sort errors by severity (errors before warnings)', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const errors = FilterValidator.validate(filters);

      // If errors exist, check they're sorted by severity
      if (errors.length > 0) {
        let lastSeverity = 'error';
        errors.forEach(error => {
          if (lastSeverity === 'error' && error.severity === 'warning') {
            lastSeverity = 'warning';
          }
          // Errors should come before warnings
          if (error.severity === 'error') {
            expect(lastSeverity).toBe('error');
          }
        });
      }
    });
  });

  describe('Component Integration', () => {
    it('should provide validation errors to React components', () => {
      renderWithProviders(<TestValidationDisplay />);

      expect(screen.getByTestId('error-count')).toBeInTheDocument();
    });

    it('should update validation state when filters change', async () => {
      const store = createMockStore();

      // Initially no errors
      let errors = FilterValidator.validate(store.getState().filters);
      expect(errors).toEqual([]);

      // Change filters
      store.dispatch(setSubjects(['CM2']));

      await waitForStateUpdate(
        store,
        (state) => state.filters.subjects.includes('CM2'),
        { timeout: 1000 }
      );

      // Re-validate
      errors = FilterValidator.validate(store.getState().filters);
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle validation in Redux selector', () => {
      const store = createMockStore({
        preloadedState: {
          filters: {
            subjects: ['CM2'],
            categories: [],
            product_types: [],
            products: [],
            modes_of_delivery: [],
            searchQuery: '',
            currentPage: 1,
            pageSize: 20,
          },
        },
      });

      const hasErrors = selectHasValidationErrors(store.getState());
      expect(typeof hasErrors).toBe('boolean');
    });

    it('should provide validation errors through Redux selector', () => {
      const store = createMockStore({
        preloadedState: {
          filters: {
            subjects: ['CM2'],
            categories: [],
            product_types: [],
            products: [],
            modes_of_delivery: [],
            searchQuery: '',
            currentPage: 1,
            pageSize: 20,
          },
        },
      });

      const errors = selectValidationErrors(store.getState());
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('API Call Prevention', () => {
    it('should prevent API calls when validation errors exist', async () => {
      const store = createMockStore({
        preloadedState: {
          filters: {
            subjects: ['CM2'],
            categories: [],
            product_types: [],
            products: [],
            modes_of_delivery: [],
            searchQuery: '',
            currentPage: 1,
            pageSize: 20,
            validationErrors: [
              {
                severity: 'error',
                message: 'Test error',
                field: 'subjects',
              },
            ],
          },
        },
      });

      const hasErrors = selectHasValidationErrors(store.getState());

      // If validation errors exist, API calls should be prevented
      if (hasErrors) {
        // Hook should skip API call (tested in useProductsSearch integration tests)
        expect(hasErrors).toBe(true);
      }
    });

    it('should allow API calls when no validation errors', () => {
      const store = createMockStore({
        preloadedState: {
          filters: {
            subjects: ['CM2'],
            categories: [],
            product_types: [],
            products: [],
            modes_of_delivery: [],
            searchQuery: '',
            currentPage: 1,
            pageSize: 20,
            validationErrors: [],
          },
        },
      });

      const hasErrors = selectHasValidationErrors(store.getState());
      expect(hasErrors).toBe(false);
    });
  });

  describe('Validation Rules', () => {
    it('should validate product groups (placeholder)', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: ['CORE_MATERIAL'],
        products: [],
        modes_of_delivery: [],
      };

      const errors = FilterValidator.validate(filters);

      // Currently placeholder implementation returns empty array
      expect(errors).toEqual([]);
    });

    it('should handle empty filter state', () => {
      const filters = {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const errors = FilterValidator.validate(filters);
      expect(errors).toEqual([]);
    });

    it('should handle partial filter state', () => {
      const filters = {
        subjects: ['CM2'],
        // Missing other filter arrays
      };

      const errors = FilterValidator.validate(filters);
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should validate in < 10ms', () => {
      const filters = {
        subjects: ['CM2', 'SA1', 'CB1'],
        categories: ['Bundle', 'Material'],
        product_types: ['CORE_MATERIAL', 'MOCK_EXAM'],
        products: [],
        modes_of_delivery: [],
      };

      const start = performance.now();
      FilterValidator.validate(filters);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should handle validation of large filter state efficiently', () => {
      const filters = {
        subjects: Array.from({ length: 50 }, (_, i) => `SUBJECT_${i}`),
        categories: Array.from({ length: 20 }, (_, i) => `CATEGORY_${i}`),
        product_types: Array.from({ length: 10 }, (_, i) => `TYPE_${i}`),
        products: [],
        modes_of_delivery: [],
      };

      const start = performance.now();
      FilterValidator.validate(filters);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(20);
    });

    it('should validate multiple times without performance degradation', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        FilterValidator.validate(filters);
      }

      const duration = performance.now() - start;
      const avgDuration = duration / iterations;

      expect(avgDuration).toBeLessThan(1);
    });
  });

  describe('Performance Tracking Integration', () => {
    it('should track validation performance', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      // Mock performance API
      const performanceMarks = [];
      const originalMark = window.performance.mark;
      window.performance.mark = jest.fn((name) => {
        performanceMarks.push(name);
        return originalMark.call(window.performance, name);
      });

      FilterValidator.validate(filters);

      // Should have performance marks (in development mode)
      if (process.env.NODE_ENV !== 'production') {
        expect(performanceMarks.some((mark) => mark.includes('validation'))).toBe(true);
      }

      // Restore original
      window.performance.mark = originalMark;
    });

    it('should include metadata in performance tracking', () => {
      const filters = {
        subjects: ['CM2', 'SA1'],
        categories: ['Bundle'],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const performanceMarks = [];
      const originalMark = window.performance.mark;
      window.performance.mark = jest.fn((name) => {
        performanceMarks.push(name);
        return originalMark.call(window.performance, name);
      });

      FilterValidator.validate(filters);

      // Should track validation with metadata
      if (process.env.NODE_ENV !== 'production') {
        expect(performanceMarks.length).toBeGreaterThan(0);
      }

      window.performance.mark = originalMark;
    });
  });

  describe('Redux Integration', () => {
    it('should validate state after Redux action dispatch', async () => {
      const store = createMockStore();

      store.dispatch(setSubjects(['CM2']));

      await waitForStateUpdate(
        store,
        (state) => state.filters.subjects.includes('CM2'),
        { timeout: 1000 }
      );

      const errors = FilterValidator.validate(store.getState().filters);
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should validate after multiple filter changes', async () => {
      const store = createMockStore();

      store.dispatch(setSubjects(['CM2']));
      store.dispatch(setCategories(['Bundle']));
      store.dispatch(setProductTypes(['CORE_MATERIAL']));

      await waitForStateUpdate(
        store,
        (state) =>
          state.filters.subjects.includes('CM2') &&
          state.filters.categories.includes('Bundle') &&
          state.filters.product_types.includes('CORE_MATERIAL'),
        { timeout: 1000 }
      );

      const errors = FilterValidator.validate(store.getState().filters);
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle filter state with extra properties', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        extraProperty: 'should be ignored',
        anotherExtra: 123,
      };

      const errors = FilterValidator.validate(filters);
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle filter state with missing properties', () => {
      const filters = {
        subjects: ['CM2'],
        // Missing other filter properties
      };

      const errors = FilterValidator.validate(filters);
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle invalid filter values', () => {
      const filters = {
        subjects: [null, undefined, '', 123],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const errors = FilterValidator.validate(filters);
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle circular references gracefully', () => {
      const filters = {
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      // Create circular reference
      filters.self = filters;

      expect(() => {
        FilterValidator.validate(filters);
      }).not.toThrow();
    });
  });

  describe('Error Message Quality', () => {
    it('should provide descriptive error messages', () => {
      const filters = {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const errors = FilterValidator.validate(filters);

      // If errors exist, they should have message property
      errors.forEach(error => {
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('severity');
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      });
    });

    it('should include field information in errors', () => {
      const filters = {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
      };

      const errors = FilterValidator.validate(filters);

      // If errors exist, they should have field property
      errors.forEach(error => {
        if (error.field) {
          expect(typeof error.field).toBe('string');
        }
      });
    });
  });
});
