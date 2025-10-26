/**
 * ActiveFilters Integration Tests (Story 1.16)
 *
 * TDD RED Phase: These tests MUST FAIL until test utilities are implemented (T026)
 *
 * Tests ActiveFilters component integration with:
 * - Redux filter state
 * - URL synchronization
 * - Filter removal
 * - FilterRegistry display values
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test-utils/testHelpers';
import ActiveFilters from '../ActiveFilters';
import { setSubjects, setCategories } from '../../../store/slices/filtersSlice';

describe('ActiveFilters Integration', () => {

  describe('Filter Display', () => {
    it('should display active filters from Redux state', () => {
      const { store } = renderWithProviders(<ActiveFilters />);

      store.dispatch(setSubjects(['CM2', 'SA1']));
      store.dispatch(setCategories(['Bundle']));

      expect(screen.getByText('CM2')).toBeInTheDocument();
      expect(screen.getByText('SA1')).toBeInTheDocument();
      expect(screen.getByText('Bundle')).toBeInTheDocument();
    });

    it('should use FilterRegistry colors', () => {
      const { store } = renderWithProviders(<ActiveFilters />);
      store.dispatch(setSubjects(['CM2']));

      const chip = screen.getByText('CM2').closest('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-colorPrimary');
    });
  });

  describe('Filter Removal', () => {
    it('should remove filter on chip delete', async () => {
      const user = userEvent.setup();
      const { store } = renderWithProviders(<ActiveFilters />);

      store.dispatch(setSubjects(['CM2']));

      const deleteButton = screen.getByTestId('delete-subject-CM2');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(store.getState().filters.subjects).not.toContain('CM2');
      });
    });

    it('should update URL when filter removed', async () => {
      const user = userEvent.setup();
      const { store } = renderWithProviders(<ActiveFilters />);

      store.dispatch(setSubjects(['CM2']));

      const deleteButton = screen.getByTestId('delete-subject-CM2');
      await user.click(deleteButton);

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBeNull();
      });
    });
  });

  describe('Performance', () => {
    it('should render in < 50ms', () => {
      const start = performance.now();
      renderWithProviders(<ActiveFilters />);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });
});
