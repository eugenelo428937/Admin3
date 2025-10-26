/**
 * ProductList Integration Tests (Story 1.16)
 *
 * TDD RED Phase: These tests MUST FAIL until test utilities are implemented (T026)
 *
 * Tests ProductList component integration with:
 * - Filter state restoration from URL
 * - Product search hook
 * - Loading states
 * - Error handling
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, mockProductsApi, flushPromises } from '../../../test-utils/testHelpers';
import ProductList from '../ProductList';

describe('ProductList Integration', () => {
  beforeEach(() => {
    mockProductsApi({
      products: [
        {
          id: 1,
          subject_code: 'CM2',
          name: 'Core Reading',
          category: 'BUNDLE',
          product_type: 'CORE_MATERIAL',
          mode_of_delivery: 'EBOOK',
          price: 45.00,
          available: true,
        },
      ],
    });
  });

  describe('URL Filter Restoration', () => {
    it('should restore filters from URL on mount', () => {
      const { store } = renderWithProviders(<ProductList />, {
        route: '/products?subject_code=CM2&category_code=Bundle',
      });

      const filters = store.getState().filters;
      expect(filters.subjects).toContain('CM2');
      expect(filters.categories).toContain('Bundle');
    });

    it('should trigger search with restored filters', async () => {
      renderWithProviders(<ProductList />, {
        route: '/products?subject_code=CM2',
      });

      await waitFor(() => {
        expect(screen.getByText('Core Reading')).toBeInTheDocument();
      });
    });
  });

  describe('Product Display', () => {
    it('should display products from search results', async () => {
      renderWithProviders(<ProductList />);

      await flushPromises();

      await waitFor(() => {
        expect(screen.getByText('Core Reading')).toBeInTheDocument();
      });
    });

    it('should show loading state during search', () => {
      renderWithProviders(<ProductList />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should mount in < 100ms', () => {
      const start = performance.now();
      renderWithProviders(<ProductList />);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
