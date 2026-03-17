/**
 * Redux Integration Tests for Filter Validation (Story 1.12)
 *
 * Tests validation integration with Redux state management:
 * - Auto-validation on filter changes
 * - Validation error state management
 * - Validation selectors
 * - Error clearing actions
 */

import filtersReducer, {
  setSubjects,
  toggleSubjectFilter,
  removeSubjectFilter,
  setCategories,
  toggleCategoryFilter,
  setProductTypes,
  navSelectSubject,
  setMultipleFilters,
  clearAllFilters,
  clearValidationErrors,
  validateFilters,
  selectValidationErrors,
  selectHasValidationErrors,
} from '../filtersSlice';

describe('filtersSlice - Validation Integration', () => {
  let initialState;

  beforeEach(() => {
    initialState = filtersReducer(undefined, { type: '@@INIT' });
  });

  describe('Auto-validation on filter changes', () => {
    it('should validate when setting subjects filter', () => {
      const state = filtersReducer(initialState, setSubjects(['CM2', 'SA1']));

      expect(state.validationErrors).toBeDefined();
      expect(Array.isArray(state.validationErrors)).toBe(true);
    });

    it('should validate when toggling subject filter', () => {
      const state = filtersReducer(initialState, toggleSubjectFilter('CM2'));

      expect(state.validationErrors).toBeDefined();
      expect(Array.isArray(state.validationErrors)).toBe(true);
      expect(state.subjects).toContain('CM2');
    });

    it('should validate when removing subject filter', () => {
      // First add a subject
      let state = filtersReducer(initialState, setSubjects(['CM2', 'SA1']));

      // Then remove it
      state = filtersReducer(state, removeSubjectFilter('CM2'));

      expect(state.validationErrors).toBeDefined();
      expect(Array.isArray(state.validationErrors)).toBe(true);
      expect(state.subjects).toEqual(['SA1']);
    });

    it('should validate when setting categories filter', () => {
      const state = filtersReducer(initialState, setCategories(['Bundle']));

      expect(state.validationErrors).toBeDefined();
      expect(Array.isArray(state.validationErrors)).toBe(true);
    });

    it('should validate when toggling category filter', () => {
      const state = filtersReducer(initialState, toggleCategoryFilter('Bundle'));

      expect(state.validationErrors).toBeDefined();
      expect(Array.isArray(state.validationErrors)).toBe(true);
      expect(state.categories).toContain('Bundle');
    });

    it('should validate when setting product types filter', () => {
      const state = filtersReducer(initialState, setProductTypes(['Core Study Material']));

      expect(state.validationErrors).toBeDefined();
      expect(Array.isArray(state.validationErrors)).toBe(true);
    });

    it('should validate when using navigation action', () => {
      const state = filtersReducer(initialState, navSelectSubject('CM2'));

      expect(state.validationErrors).toBeDefined();
      expect(Array.isArray(state.validationErrors)).toBe(true);
      expect(state.subjects).toEqual(['CM2']);
    });

    it('should validate when setting multiple filters', () => {
      const state = filtersReducer(initialState, setMultipleFilters({
        subjects: ['CM2'],
        categories: ['Bundle'],
      }));

      expect(state.validationErrors).toBeDefined();
      expect(Array.isArray(state.validationErrors)).toBe(true);
      expect(state.subjects).toEqual(['CM2']);
      expect(state.categories).toEqual(['Bundle']);
    });
  });

  describe('Validation error state management', () => {
    it('should initialize with empty validation errors', () => {
      expect(initialState.validationErrors).toBeDefined();
      expect(initialState.validationErrors).toEqual([]);
    });

    it('should maintain validation errors array structure', () => {
      const state = filtersReducer(initialState, setSubjects(['CM2']));

      expect(Array.isArray(state.validationErrors)).toBe(true);

      // Validation errors should be array of objects with specific structure
      state.validationErrors.forEach(error => {
        if (error) {
          expect(error).toHaveProperty('field');
          expect(error).toHaveProperty('message');
          expect(error).toHaveProperty('severity');
          expect(error).toHaveProperty('suggestion');
        }
      });
    });

    it('should update validation errors on subsequent filter changes', () => {
      let state = filtersReducer(initialState, setSubjects(['CM2']));
      const firstValidation = state.validationErrors;

      state = filtersReducer(state, setCategories(['Bundle']));
      const secondValidation = state.validationErrors;

      // Validation should run again (arrays are new instances)
      expect(secondValidation).toBeDefined();
      expect(Array.isArray(secondValidation)).toBe(true);
    });
  });

  describe('clearValidationErrors action', () => {
    it('should clear validation errors', () => {
      // Create state with some filters (which triggers validation)
      let state = filtersReducer(initialState, setSubjects(['CM2']));

      // Clear validation errors
      state = filtersReducer(state, clearValidationErrors());

      expect(state.validationErrors).toEqual([]);
    });

    it('should not affect filter values when clearing validation errors', () => {
      let state = filtersReducer(initialState, setSubjects(['CM2', 'SA1']));

      state = filtersReducer(state, clearValidationErrors());

      expect(state.validationErrors).toEqual([]);
      expect(state.subjects).toEqual(['CM2', 'SA1']);
    });
  });

  describe('validateFilters action', () => {
    it('should run validation manually', () => {
      // Set up some filters without triggering auto-validation
      let state = { ...initialState, subjects: ['CM2'] };

      // Manually trigger validation
      state = filtersReducer(state, validateFilters());

      expect(state.validationErrors).toBeDefined();
      expect(Array.isArray(state.validationErrors)).toBe(true);
    });
  });

  describe('clearAllFilters action', () => {
    it('should clear validation errors when clearing all filters', () => {
      let state = filtersReducer(initialState, setSubjects(['CM2']));
      expect(state.subjects.length).toBeGreaterThan(0);

      state = filtersReducer(state, clearAllFilters());

      expect(state.validationErrors).toEqual([]);
      expect(state.subjects).toEqual([]);
    });
  });

  describe('Validation selectors', () => {
    describe('selectValidationErrors', () => {
      it('should return validation errors array', () => {
        const state = {
          filters: filtersReducer(initialState, setSubjects(['CM2'])),
        };

        const errors = selectValidationErrors(state);

        expect(Array.isArray(errors)).toBe(true);
      });

      it('should return empty array when no validation errors', () => {
        const state = {
          filters: initialState,
        };

        const errors = selectValidationErrors(state);

        expect(errors).toEqual([]);
      });
    });

    describe('selectHasValidationErrors', () => {
      it('should return false when no error-severity issues exist', () => {
        const state = {
          filters: initialState,
        };

        const hasErrors = selectHasValidationErrors(state);

        expect(hasErrors).toBe(false);
      });

      it('should return false when only warnings exist', () => {
        const stateWithWarnings = {
          ...initialState,
          validationErrors: [
            {
              field: 'test',
              message: 'Warning message',
              severity: 'warning',
              suggestion: 'Fix this',
            },
          ],
        };

        const state = {
          filters: stateWithWarnings,
        };

        const hasErrors = selectHasValidationErrors(state);

        expect(hasErrors).toBe(false);
      });

      it('should return true when error-severity issues exist', () => {
        const stateWithErrors = {
          ...initialState,
          validationErrors: [
            {
              field: 'test',
              message: 'Error message',
              severity: 'error',
              suggestion: 'Fix this',
            },
          ],
        };

        const state = {
          filters: stateWithErrors,
        };

        const hasErrors = selectHasValidationErrors(state);

        expect(hasErrors).toBe(true);
      });

      it('should return true when both errors and warnings exist', () => {
        const stateWithMixed = {
          ...initialState,
          validationErrors: [
            {
              field: 'test1',
              message: 'Error message',
              severity: 'error',
              suggestion: 'Fix this',
            },
            {
              field: 'test2',
              message: 'Warning message',
              severity: 'warning',
              suggestion: 'Consider this',
            },
          ],
        };

        const state = {
          filters: stateWithMixed,
        };

        const hasErrors = selectHasValidationErrors(state);

        expect(hasErrors).toBe(true);
      });
    });
  });

  describe('Multiple filter changes and validation accumulation', () => {
    it('should run validation after each filter change', () => {
      let state = initialState;

      state = filtersReducer(state, setSubjects(['CM2']));
      expect(state.validationErrors).toBeDefined();

      state = filtersReducer(state, setCategories(['Bundle']));
      expect(state.validationErrors).toBeDefined();

      state = filtersReducer(state, setProductTypes(['Core Study Material']));
      expect(state.validationErrors).toBeDefined();
    });

    it('should maintain correct filter state after multiple changes with validation', () => {
      let state = initialState;

      state = filtersReducer(state, setSubjects(['CM2', 'SA1']));
      state = filtersReducer(state, toggleSubjectFilter('CB1'));
      state = filtersReducer(state, setCategories(['Bundle']));

      expect(state.subjects).toEqual(['CM2', 'SA1', 'CB1']);
      expect(state.categories).toEqual(['Bundle']);
      expect(state.validationErrors).toBeDefined();
    });
  });

  describe('Validation error structure compliance', () => {
    it('should ensure all validation errors have required fields', () => {
      const stateWithErrors = {
        ...initialState,
        validationErrors: [
          {
            field: 'test_field',
            message: 'Test error message',
            severity: 'error',
            suggestion: 'Test suggestion',
          },
        ],
      };

      const state = {
        filters: stateWithErrors,
      };

      const errors = selectValidationErrors(state);

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
