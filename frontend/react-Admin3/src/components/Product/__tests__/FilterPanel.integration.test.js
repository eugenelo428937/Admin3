/**
 * FilterPanel Integration Tests (Story 1.16)
 *
 * TDD RED Phase: These tests MUST FAIL until test utilities are implemented (T026)
 *
 * Tests FilterPanel component integration with:
 * - Redux filter state
 * - URL synchronization
 * - User interactions
 * - FilterRegistry
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockStore, mockProductsApi } from '../../../test-utils/testHelpers';
import FilterPanel from '../FilterPanel';
import { setSubjects, setCategories } from '../../../store/slices/filtersSlice';

describe('FilterPanel Integration', () => {
  beforeEach(() => {
    mockProductsApi({
      products: [],
      filterCounts: {
        subjects: { CM2: { count: 10 }, SA1: { count: 5 } },
        categories: { Bundle: { count: 8 }, Material: { count: 12 } },
      },
    });
  });

  describe('Filter Rendering', () => {
    it('should render all filter sections from FilterRegistry', () => {
      renderWithProviders(<FilterPanel />);

      expect(screen.getByText(/subjects/i)).toBeInTheDocument();
      expect(screen.getByText(/categories/i)).toBeInTheDocument();
    });

    it('should display filter counts from API', async () => {
      renderWithProviders(<FilterPanel />);

      await waitFor(() => {
        expect(screen.getByText(/CM2/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should toggle filter selection on click', async () => {
      const user = userEvent.setup();
      const { store } = renderWithProviders(<FilterPanel />);

      const checkbox = await screen.findByLabelText(/CM2/i);
      await user.click(checkbox);

      await waitFor(() => {
        expect(store.getState().filters.subjects).toContain('CM2');
      });
    });

    it('should update URL when filter selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FilterPanel />);

      const checkbox = await screen.findByLabelText(/CM2/i);
      await user.click(checkbox);

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBe('CM2');
      });
    });
  });

  describe('Performance', () => {
    it('should render in < 50ms', () => {
      const start = performance.now();
      renderWithProviders(<FilterPanel />);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });
});
