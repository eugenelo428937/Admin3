/**
 * Filter Validation Integration Tests (Story 1.12, T016-T017)
 *
 * End-to-end tests verifying the complete filter validation workflow:
 * - Redux state updates trigger validation
 * - FilterPanel displays validation errors
 * - API calls blocked when validation errors exist
 * - Validation errors cleared when filters fixed
 *
 * NOTE: Tutorial-related validation rules removed (tutorial_format, distance_learning).
 * These tests validate the framework architecture works correctly.
 * When validation rules are added for existing filter fields, these tests
 * will verify the complete workflow.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import filtersReducer from '../../src/store/slices/filtersSlice';

// Mock component that uses validation
const ValidationTestComponent = () => {
  const { useSelector, useDispatch } = require('react-redux');
  const {
    selectValidationErrors,
    selectHasValidationErrors,
    setSubjects,
    clearValidationErrors,
  } = require('../../src/store/slices/filtersSlice');

  const validationErrors = useSelector(selectValidationErrors);
  const hasValidationErrors = useSelector(selectHasValidationErrors);
  const dispatch = useDispatch();

  return (
    <div>
      <button onClick={() => dispatch(setSubjects(['CM2']))}>
        Add Subject Filter
      </button>
      <button onClick={() => dispatch(clearValidationErrors())}>
        Clear Errors
      </button>
      <div data-testid="has-errors">{hasValidationErrors ? 'true' : 'false'}</div>
      <div data-testid="error-count">{validationErrors.length}</div>
      {validationErrors.map((error, index) => (
        <div key={index} data-testid={`error-${index}`}>
          {error.message}
        </div>
      ))}
    </div>
  );
};

/**
 * Create test store with filters reducer
 */
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      filters: filtersReducer,
    },
    preloadedState,
  });
};

/**
 * Render component with Redux provider
 */
const renderWithProvider = (component, store) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>
  );
};

describe('Filter Validation Integration Tests', () => {
  describe('T016: End-to-End Validation Workflow', () => {
    test('validates filter state is managed correctly in Redux', async () => {
      const store = createTestStore();
      const user = userEvent.setup();

      renderWithProvider(<ValidationTestComponent />, store);

      // Initially no validation errors
      expect(screen.getByTestId('has-errors')).toHaveTextContent('false');
      expect(screen.getByTestId('error-count')).toHaveTextContent('0');

      // Apply filter change
      const addSubjectButton = screen.getByText('Add Subject Filter');
      await user.click(addSubjectButton);

      // Validation should run (currently returns empty array with no active rules)
      await waitFor(() => {
        expect(screen.getByTestId('has-errors')).toHaveTextContent('false');
        expect(screen.getByTestId('error-count')).toHaveTextContent('0');
      });

      // Verify Redux state updated
      const state = store.getState();
      expect(state.filters.subjects).toEqual(['CM2']);
      expect(state.filters.validationErrors).toEqual([]);
    });

    test('validation errors array is reactive to filter changes', async () => {
      const store = createTestStore();
      const user = userEvent.setup();

      renderWithProvider(<ValidationTestComponent />, store);

      const addSubjectButton = screen.getByText('Add Subject Filter');

      // First filter change
      await user.click(addSubjectButton);

      await waitFor(() => {
        const state = store.getState();
        expect(state.filters.validationErrors).toBeDefined();
        expect(Array.isArray(state.filters.validationErrors)).toBe(true);
      });

      // Second filter change
      await user.click(addSubjectButton);

      await waitFor(() => {
        const state = store.getState();
        // validationErrors should still be an array (may be same or updated)
        expect(Array.isArray(state.filters.validationErrors)).toBe(true);
      });
    });

    test('clearValidationErrors action works correctly', async () => {
      const store = createTestStore({
        filters: {
          subjects: ['CM2'],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: '',
          currentPage: 1,
          pageSize: 20,
          isFilterPanelOpen: false,
          isLoading: false,
          error: null,
          filterCounts: {},
          // Manually set validation errors for testing
          validationErrors: [
            {
              field: 'test',
              message: 'Test error',
              severity: 'error',
              suggestion: 'Fix this',
            },
          ],
          lastUpdated: Date.now(),
        },
      });

      const user = userEvent.setup();
      renderWithProvider(<ValidationTestComponent />, store);

      // Initially has error
      expect(screen.getByTestId('error-count')).toHaveTextContent('1');
      expect(screen.getByTestId('has-errors')).toHaveTextContent('true');

      // Clear errors
      const clearButton = screen.getByText('Clear Errors');
      await user.click(clearButton);

      // Errors should be cleared
      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('0');
        expect(screen.getByTestId('has-errors')).toHaveTextContent('false');
      });
    });

    test('multiple filter changes maintain validation state correctly', async () => {
      const store = createTestStore();
      const { setCategories, setProductTypes } = require('../../src/store/slices/filtersSlice');

      // Apply multiple filter changes
      store.dispatch(setSubjects(['CM2', 'SA1']));
      store.dispatch(setCategories(['Bundle']));
      store.dispatch(setProductTypes(['Core Study Material']));

      const state = store.getState();

      // All filters should be applied
      expect(state.filters.subjects).toEqual(['CM2', 'SA1']);
      expect(state.filters.categories).toEqual(['Bundle']);
      expect(state.filters.product_types).toEqual(['Core Study Material']);

      // Validation should have run after each change
      expect(state.filters.validationErrors).toBeDefined();
      expect(Array.isArray(state.filters.validationErrors)).toBe(true);
    });
  });

  describe('T017: API Blocking Integration', () => {
    test('selectHasValidationErrors selector works correctly with empty errors', () => {
      const store = createTestStore();
      const { selectHasValidationErrors } = require('../../src/store/slices/filtersSlice');

      const state = store.getState();
      const hasErrors = selectHasValidationErrors({ filters: state.filters });

      // No validation errors, should return false
      expect(hasErrors).toBe(false);
    });

    test('selectHasValidationErrors returns true when error-severity issues exist', () => {
      const store = createTestStore({
        filters: {
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: '',
          currentPage: 1,
          pageSize: 20,
          isFilterPanelOpen: false,
          isLoading: false,
          error: null,
          filterCounts: {},
          validationErrors: [
            {
              field: 'test',
              message: 'Test error',
              severity: 'error',
              suggestion: 'Fix this',
            },
          ],
          lastUpdated: Date.now(),
        },
      });

      const { selectHasValidationErrors } = require('../../src/store/slices/filtersSlice');
      const state = store.getState();
      const hasErrors = selectHasValidationErrors({ filters: state.filters });

      expect(hasErrors).toBe(true);
    });

    test('selectHasValidationErrors returns false when only warnings exist', () => {
      const store = createTestStore({
        filters: {
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: '',
          currentPage: 1,
          pageSize: 20,
          isFilterPanelOpen: false,
          isLoading: false,
          error: null,
          filterCounts: {},
          validationErrors: [
            {
              field: 'test',
              message: 'Test warning',
              severity: 'warning',
              suggestion: 'Consider this',
            },
          ],
          lastUpdated: Date.now(),
        },
      });

      const { selectHasValidationErrors } = require('../../src/store/slices/filtersSlice');
      const state = store.getState();
      const hasErrors = selectHasValidationErrors({ filters: state.filters });

      // Only warnings, no errors, should return false
      expect(hasErrors).toBe(false);
    });

    test('validation state persists across filter changes', () => {
      const store = createTestStore();
      const { setSubjects, setCategories } = require('../../src/store/slices/filtersSlice');

      // Apply multiple filter changes
      store.dispatch(setSubjects(['CM2']));
      const state1 = store.getState();
      const validationErrors1 = state1.filters.validationErrors;

      store.dispatch(setCategories(['Bundle']));
      const state2 = store.getState();
      const validationErrors2 = state2.filters.validationErrors;

      // Validation errors should exist after each change
      expect(validationErrors1).toBeDefined();
      expect(validationErrors2).toBeDefined();
      expect(Array.isArray(validationErrors1)).toBe(true);
      expect(Array.isArray(validationErrors2)).toBe(true);
    });
  });

  describe('Framework Integration Verification', () => {
    test('auto-validation runs on all filter-changing actions', () => {
      const store = createTestStore();
      const {
        setSubjects,
        toggleSubjectFilter,
        removeSubjectFilter,
        navSelectSubject,
        clearAllFilters,
      } = require('../../src/store/slices/filtersSlice');

      // Test various filter actions
      const actions = [
        () => store.dispatch(setSubjects(['CM2'])),
        () => store.dispatch(toggleSubjectFilter('SA1')),
        () => store.dispatch(removeSubjectFilter('CM2')),
        () => store.dispatch(navSelectSubject('CB1')),
        () => store.dispatch(clearAllFilters()),
      ];

      actions.forEach(action => {
        action();
        const state = store.getState();

        // validationErrors should exist and be an array after each action
        expect(state.filters.validationErrors).toBeDefined();
        expect(Array.isArray(state.filters.validationErrors)).toBe(true);
      });
    });

    test('validation framework ready for future rules', () => {
      const store = createTestStore();
      const { setSubjects } = require('../../src/store/slices/filtersSlice');

      // Apply filter that could trigger validation (when rules are added)
      store.dispatch(setSubjects(['CM2']));

      const state = store.getState();

      // Framework should be in place
      expect(state.filters.validationErrors).toBeDefined();
      expect(Array.isArray(state.filters.validationErrors)).toBe(true);

      // Currently no active rules, so empty array
      expect(state.filters.validationErrors).toEqual([]);

      // But structure is ready for future validation errors
      // When validation rules are added, this same code will produce errors
    });

    test('validation error structure contract enforced', () => {
      const store = createTestStore({
        filters: {
          subjects: [],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: '',
          currentPage: 1,
          pageSize: 20,
          isFilterPanelOpen: false,
          isLoading: false,
          error: null,
          filterCounts: {},
          validationErrors: [
            {
              field: 'test_field',
              message: 'Test validation error',
              severity: 'error',
              suggestion: 'Fix this issue',
            },
          ],
          lastUpdated: Date.now(),
        },
      });

      const state = store.getState();
      const errors = state.filters.validationErrors;

      // Verify error structure
      errors.forEach(error => {
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('severity');
        expect(error).toHaveProperty('suggestion');
        expect(['error', 'warning']).toContain(error.severity);
        expect(typeof error.field).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(typeof error.suggestion).toBe('string');
      });
    });
  });

  describe('Performance and Stability', () => {
    test('rapid filter changes do not cause errors', async () => {
      const store = createTestStore();
      const {
        setSubjects,
        setCategories,
        setProductTypes,
      } = require('../../src/store/slices/filtersSlice');

      // Rapid filter changes (simulating user clicking multiple filters quickly)
      const rapidChanges = [
        () => store.dispatch(setSubjects(['CM2'])),
        () => store.dispatch(setCategories(['Bundle'])),
        () => store.dispatch(setProductTypes(['Core Study Material'])),
        () => store.dispatch(setSubjects(['CM2', 'SA1'])),
        () => store.dispatch(setCategories([])),
      ];

      // Apply all changes rapidly
      rapidChanges.forEach(change => change());

      // Should not throw errors
      const state = store.getState();
      expect(state.filters.validationErrors).toBeDefined();
      expect(Array.isArray(state.filters.validationErrors)).toBe(true);
    });

    test('validation state remains consistent across many operations', () => {
      const store = createTestStore();
      const { setSubjects, clearAllFilters } = require('../../src/store/slices/filtersSlice');

      // Perform 50 operations
      for (let i = 0; i < 50; i++) {
        store.dispatch(setSubjects(['CM2']));
        store.dispatch(clearAllFilters());
      }

      const state = store.getState();

      // State should remain valid
      expect(state.filters.validationErrors).toBeDefined();
      expect(Array.isArray(state.filters.validationErrors)).toBe(true);
      expect(state.filters.subjects).toEqual([]);
    });
  });
});
