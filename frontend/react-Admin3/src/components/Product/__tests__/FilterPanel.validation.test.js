/**
 * FilterPanel UI Integration Tests for Validation (Story 1.12)
 *
 * Tests validation error display in FilterPanel:
 * - Alert rendering when validation errors exist
 * - Correct severity display (error vs warning)
 * - Error message display in AlertTitle
 * - Suggestion display in Alert body
 * - Multiple errors in Stack
 * - Error dismissal on close
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import FilterPanel from '../FilterPanel';
import filtersReducer from '../../../store/slices/filtersSlice';

/**
 * Create mock Redux store with validation errors
 */
const createMockStore = (validationErrors = []) => {
  return configureStore({
    reducer: {
      filters: filtersReducer,
    },
    preloadedState: {
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
        filterCounts: {
          subjects: {},
          categories: {},
          product_types: {},
          products: {},
          modes_of_delivery: {},
        },
        validationErrors,
        lastUpdated: Date.now(),
      },
    },
  });
};

/**
 * Render FilterPanel with Redux store
 */
const renderFilterPanel = (validationErrors = []) => {
  const store = createMockStore(validationErrors);
  return {
    ...render(
      <Provider store={store}>
        <FilterPanel />
      </Provider>
    ),
    store,
  };
};

describe('FilterPanel - Validation Error Display', () => {
  describe('Alert rendering', () => {
    it('should not display Alert when no validation errors exist', () => {
      renderFilterPanel([]);

      // Alert should not be present
      const alerts = screen.queryAllByRole('alert');
      // Only the error alert from the component's error state should be absent
      // Filter out any alerts that are not validation alerts
      const validationAlerts = alerts.filter(alert =>
        alert.textContent.includes('requires') || alert.textContent.includes('not available')
      );

      expect(validationAlerts.length).toBe(0);
    });

    it('should display Alert when validation error exists', () => {
      const validationErrors = [
        {
          field: 'tutorial_format',
          message: 'Tutorial format requires Tutorial Products filter',
          severity: 'error',
          suggestion: 'Please check the \'Tutorial Products\' filter',
        },
      ];

      renderFilterPanel(validationErrors);

      // Alert should be present
      const alert = screen.getByText('Tutorial format requires Tutorial Products filter');
      expect(alert).toBeInTheDocument();
    });

    it('should display multiple Alerts when multiple validation errors exist', () => {
      const validationErrors = [
        {
          field: 'tutorial_format',
          message: 'Tutorial format requires Tutorial Products filter',
          severity: 'error',
          suggestion: 'Please check the \'Tutorial Products\' filter',
        },
        {
          field: 'distance_learning',
          message: 'Distance learning not available for in-person tutorials',
          severity: 'error',
          suggestion: 'Select \'Online\' or \'Hybrid\' format instead',
        },
      ];

      renderFilterPanel(validationErrors);

      // Both error messages should be present
      expect(screen.getByText('Tutorial format requires Tutorial Products filter')).toBeInTheDocument();
      expect(screen.getByText('Distance learning not available for in-person tutorials')).toBeInTheDocument();
    });
  });

  describe('Alert severity', () => {
    it('should display error severity Alert for error-level validation', () => {
      const validationErrors = [
        {
          field: 'test_field',
          message: 'Error message',
          severity: 'error',
          suggestion: 'Fix this error',
        },
      ];

      renderFilterPanel(validationErrors);

      // Alert with error severity should have correct CSS class
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('MuiAlert-standardError');
    });

    it('should display warning severity Alert for warning-level validation', () => {
      const validationErrors = [
        {
          field: 'test_field',
          message: 'Warning message',
          severity: 'warning',
          suggestion: 'Consider this warning',
        },
      ];

      renderFilterPanel(validationErrors);

      // Alert with warning severity should have correct CSS class
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('MuiAlert-standardWarning');
    });

    it('should display mixed severity Alerts correctly', () => {
      const validationErrors = [
        {
          field: 'error_field',
          message: 'Error message',
          severity: 'error',
          suggestion: 'Fix this error',
        },
        {
          field: 'warning_field',
          message: 'Warning message',
          severity: 'warning',
          suggestion: 'Consider this warning',
        },
      ];

      renderFilterPanel(validationErrors);

      // Both alerts should be present with correct severities
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(2);

      // First alert should be error (sorted by severity)
      expect(alerts[0]).toHaveClass('MuiAlert-standardError');
      // Second alert should be warning
      expect(alerts[1]).toHaveClass('MuiAlert-standardWarning');
    });
  });

  describe('Alert content display', () => {
    it('should display error message as AlertTitle', () => {
      const validationErrors = [
        {
          field: 'test_field',
          message: 'Test Error Message',
          severity: 'error',
          suggestion: 'Test suggestion',
        },
      ];

      renderFilterPanel(validationErrors);

      // Error message should be in AlertTitle
      const alertTitle = screen.getByText('Test Error Message');
      expect(alertTitle).toBeInTheDocument();
      expect(alertTitle.tagName).toBe('DIV'); // AlertTitle renders as div
    });

    it('should display suggestion as Alert body', () => {
      const validationErrors = [
        {
          field: 'test_field',
          message: 'Test Error Message',
          severity: 'error',
          suggestion: 'This is the suggestion text',
        },
      ];

      renderFilterPanel(validationErrors);

      // Suggestion should be in Alert body
      const suggestion = screen.getByText('This is the suggestion text');
      expect(suggestion).toBeInTheDocument();
    });

    it('should display both message and suggestion for each error', () => {
      const validationErrors = [
        {
          field: 'field1',
          message: 'First Error',
          severity: 'error',
          suggestion: 'First Suggestion',
        },
        {
          field: 'field2',
          message: 'Second Error',
          severity: 'error',
          suggestion: 'Second Suggestion',
        },
      ];

      renderFilterPanel(validationErrors);

      // All messages and suggestions should be present
      expect(screen.getByText('First Error')).toBeInTheDocument();
      expect(screen.getByText('First Suggestion')).toBeInTheDocument();
      expect(screen.getByText('Second Error')).toBeInTheDocument();
      expect(screen.getByText('Second Suggestion')).toBeInTheDocument();
    });
  });

  describe('Multiple errors in Stack', () => {
    it('should render multiple errors in a Stack container', () => {
      const validationErrors = [
        {
          field: 'field1',
          message: 'Error 1',
          severity: 'error',
          suggestion: 'Fix 1',
        },
        {
          field: 'field2',
          message: 'Error 2',
          severity: 'error',
          suggestion: 'Fix 2',
        },
        {
          field: 'field3',
          message: 'Error 3',
          severity: 'warning',
          suggestion: 'Fix 3',
        },
      ];

      const { container } = renderFilterPanel(validationErrors);

      // Stack should contain all three alerts
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(3);

      // Verify Stack spacing is applied (MuiStack-root class)
      const stack = container.querySelector('.MuiStack-root');
      expect(stack).toBeInTheDocument();
    });
  });

  describe('Error dismissal', () => {
    it('should dismiss all errors when close button clicked', async () => {
      const user = userEvent.setup();
      const validationErrors = [
        {
          field: 'test_field',
          message: 'Test Error Message',
          severity: 'error',
          suggestion: 'Test suggestion',
        },
      ];

      const { store } = renderFilterPanel(validationErrors);

      // Verify error is displayed
      expect(screen.getByText('Test Error Message')).toBeInTheDocument();

      // Find and click close button
      const closeButton = screen.getByLabelText(/close/i);
      await user.click(closeButton);

      // Verify validationErrors cleared in Redux state
      await waitFor(() => {
        const state = store.getState();
        expect(state.filters.validationErrors).toEqual([]);
      });
    });

    it('should dismiss all errors at once (not individual errors)', async () => {
      const user = userEvent.setup();
      const validationErrors = [
        {
          field: 'field1',
          message: 'Error 1',
          severity: 'error',
          suggestion: 'Fix 1',
        },
        {
          field: 'field2',
          message: 'Error 2',
          severity: 'error',
          suggestion: 'Fix 2',
        },
      ];

      const { store } = renderFilterPanel(validationErrors);

      // Both errors should be displayed
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();

      // Click close button (should clear all errors)
      const closeButtons = screen.getAllByLabelText(/close/i);
      await user.click(closeButtons[0]);

      // Verify all validationErrors cleared in Redux state
      await waitFor(() => {
        const state = store.getState();
        expect(state.filters.validationErrors).toEqual([]);
      });
    });
  });

  describe('Error sorting by severity', () => {
    it('should display errors before warnings when sorted', () => {
      // Note: validationErrors should be sorted by severity (errors before warnings)
      // The FilterValidator.validate() method does this sorting
      const validationErrors = [
        {
          field: 'error_field',
          message: 'Error Message',
          severity: 'error',
          suggestion: 'Error suggestion',
        },
        {
          field: 'warning_field',
          message: 'Warning Message',
          severity: 'warning',
          suggestion: 'Warning suggestion',
        },
      ];

      renderFilterPanel(validationErrors);

      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(2);

      // First alert should be error severity
      expect(alerts[0]).toHaveClass('MuiAlert-standardError');
      expect(alerts[0]).toHaveTextContent('Error Message');

      // Second alert should be warning severity
      expect(alerts[1]).toHaveClass('MuiAlert-standardWarning');
      expect(alerts[1]).toHaveTextContent('Warning Message');
    });

    it('should maintain severity order with multiple errors and warnings', () => {
      // Note: validationErrors should be sorted by severity (errors before warnings)
      // The FilterValidator.validate() method does this sorting
      const validationErrors = [
        {
          field: 'error1',
          message: 'Error 1',
          severity: 'error',
          suggestion: 'Fix error 1',
        },
        {
          field: 'error2',
          message: 'Error 2',
          severity: 'error',
          suggestion: 'Fix error 2',
        },
        {
          field: 'warning1',
          message: 'Warning 1',
          severity: 'warning',
          suggestion: 'Fix warning 1',
        },
        {
          field: 'warning2',
          message: 'Warning 2',
          severity: 'warning',
          suggestion: 'Fix warning 2',
        },
      ];

      renderFilterPanel(validationErrors);

      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(4);

      // First two should be errors
      expect(alerts[0]).toHaveClass('MuiAlert-standardError');
      expect(alerts[1]).toHaveClass('MuiAlert-standardError');

      // Last two should be warnings
      expect(alerts[2]).toHaveClass('MuiAlert-standardWarning');
      expect(alerts[3]).toHaveClass('MuiAlert-standardWarning');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty validationErrors array', () => {
      renderFilterPanel([]);

      // No validation alerts should be present
      const alerts = screen.queryAllByRole('alert');
      const validationAlerts = alerts.filter(alert =>
        alert.textContent.includes('requires') || alert.textContent.includes('not available')
      );

      expect(validationAlerts.length).toBe(0);
    });

    it('should handle validation errors with special characters in message', () => {
      const validationErrors = [
        {
          field: 'test_field',
          message: 'Error with "quotes" and \'apostrophes\'',
          severity: 'error',
          suggestion: 'Fix this <special> error &amp;',
        },
      ];

      renderFilterPanel(validationErrors);

      // Special characters should be rendered correctly
      expect(screen.getByText(/Error with "quotes" and 'apostrophes'/)).toBeInTheDocument();
      expect(screen.getByText(/Fix this <special> error &/)).toBeInTheDocument();
    });

    it('should handle very long error messages and suggestions', () => {
      const longMessage = 'This is a very long error message that contains a lot of text to test how the component handles overflow and wrapping behavior in the Alert component when displaying validation errors to users.';
      const longSuggestion = 'This is a very long suggestion that provides detailed guidance on how to fix the validation error, including multiple steps and detailed explanations that might span several lines in the UI.';

      const validationErrors = [
        {
          field: 'test_field',
          message: longMessage,
          severity: 'error',
          suggestion: longSuggestion,
        },
      ];

      renderFilterPanel(validationErrors);

      // Long text should be present
      expect(screen.getByText(longMessage)).toBeInTheDocument();
      expect(screen.getByText(longSuggestion)).toBeInTheDocument();
    });
  });
});
