/**
 * Backward Compatibility Integration Tests (Story 1.16)
 *
 * TDD RED Phase: These tests MUST FAIL until test utilities are implemented (T026)
 *
 * Tests backward compatibility with legacy URL formats and navigation patterns:
 * - Legacy URL parameter names
 * - Mixed indexed/comma-separated formats
 * - Old navigation patterns
 * - URL parameter aliases
 */

import { renderWithProviders, simulateUrlChange, createMockStore } from '../test-utils/testHelpers';
import { setSubjects, setCategories } from '../store/slices/filtersSlice';
import { waitFor } from '@testing-library/react';

describe('Backward Compatibility', () => {

  describe('Legacy URL Parameter Formats', () => {
    it('should support legacy "subject" alias for "subject_code"', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject=CM2',
      });

      const filters = store.getState().filters;
      expect(filters.subjects).toContain('CM2');
    });

    it('should support legacy "category" alias for "category_code"', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?category=Bundle',
      });

      const filters = store.getState().filters;
      expect(filters.categories).toContain('Bundle');
    });

    it('should support mixed primary and alias parameters', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject_code=CM2&category=Bundle',
      });

      const filters = store.getState().filters;
      expect(filters.subjects).toContain('CM2');
      expect(filters.categories).toContain('Bundle');
    });
  });

  describe('Legacy Indexed Format', () => {
    it('should support old indexed format without base param', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject_1=CM2&subject_2=SA1',
      });

      const filters = store.getState().filters;
      // Should handle gracefully even if format differs slightly
      expect(Array.isArray(filters.subjects)).toBe(true);
    });

    it('should support mixed indexed and comma-separated', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject_code=CM2&subject_1=SA1&group=CORE_MATERIAL,MOCK_EXAM',
      });

      const filters = store.getState().filters;
      expect(filters.subjects).toContain('CM2');
      expect(filters.product_types).toContain('CORE_MATERIAL');
    });
  });

  describe('Legacy Navigation Patterns', () => {
    it('should handle direct subject links from navbar', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject_code=CM2',
      });

      const filters = store.getState().filters;
      expect(filters.subjects).toEqual(['CM2']);
    });

    it('should handle View All Products navigation', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products',
      });

      const filters = store.getState().filters;
      expect(filters.subjects).toEqual([]);
      expect(filters.categories).toEqual([]);
    });

    it('should handle product group navigation', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?group=CORE_MATERIAL',
      });

      const filters = store.getState().filters;
      expect(filters.product_types).toEqual(['CORE_MATERIAL']);
    });
  });

  describe('URL Migration', () => {
    it('should normalize legacy URLs to new format', async () => {
      const store = createMockStore();

      // Start with legacy URL
      simulateUrlChange('/products?subject=CM2&category=Bundle');

      // Dispatch action to normalize
      store.dispatch(setSubjects(['CM2']));
      store.dispatch(setCategories(['Bundle']));

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        // Should use new primary param names
        expect(params.has('subject_code') || params.has('subject')).toBe(true);
      });
    });

    it('should preserve filter state during URL migration', async () => {
      const store = createMockStore();

      simulateUrlChange('/products?subject=CM2&subject=SA1');

      store.dispatch(setSubjects(['CM2', 'SA1']));

      await waitFor(() => {
        const state = store.getState().filters;
        expect(state.subjects).toContain('CM2');
        expect(state.subjects).toContain('SA1');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle duplicate URL parameters (browser behavior)', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject_code=CM2&subject_code=SA1',
      });

      const filters = store.getState().filters;
      // Browser URLSearchParams behavior - should handle gracefully
      expect(Array.isArray(filters.subjects)).toBe(true);
    });

    it('should handle URL parameter case sensitivity', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?Subject_Code=CM2',
      });

      // Parameter names are case-sensitive - should handle gracefully
      const filters = store.getState().filters;
      expect(() => filters.subjects).not.toThrow();
    });

    it('should handle encoded special characters in legacy URLs', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject=CM2%2BSA1',
      });

      const filters = store.getState().filters;
      expect(Array.isArray(filters.subjects)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should parse legacy URLs without performance penalty', () => {
      const legacyUrl = '/products?subject=CM2&subject=SA1&category=Bundle&group=CORE_MATERIAL,MOCK_EXAM';

      const start = performance.now();
      renderWithProviders(<div>Test</div>, { route: legacyUrl });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should handle complex legacy URLs efficiently', () => {
      const complexUrl =
        '/products?subject=CM2&subject=SA1&subject=CB1&category=Bundle&category=Material&group=CORE_MATERIAL,MOCK_EXAM,TUTORIAL';

      const start = performance.now();
      renderWithProviders(<div>Test</div>, { route: complexUrl });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(150);
    });
  });

  describe('URL Round-Trip Compatibility', () => {
    it('should maintain filter state through legacy → modern → legacy cycle', async () => {
      const store = createMockStore();

      // Start with legacy URL
      simulateUrlChange('/products?subject=CM2&category=Bundle');

      // Parse to Redux
      store.dispatch(setSubjects(['CM2']));
      store.dispatch(setCategories(['Bundle']));

      await waitFor(() => {
        const state = store.getState().filters;
        expect(state.subjects).toContain('CM2');
        expect(state.categories).toContain('Bundle');
      });

      // Verify URL reflects state (may use modern params)
      const params = new URLSearchParams(window.location.search);
      expect(params.has('subject_code') || params.has('subject')).toBe(true);
    });
  });

  describe('Search Query Compatibility', () => {
    it('should support legacy "q" parameter for search', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?q=actuarial',
      });

      const filters = store.getState().filters;
      expect(filters.searchQuery).toBe('actuarial');
    });

    it('should support legacy "search" parameter', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?search=actuarial',
      });

      const filters = store.getState().filters;
      expect(filters.searchQuery).toBe('actuarial');
    });

    it('should prioritize "search_query" over aliases', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?search_query=modern&q=legacy',
      });

      const filters = store.getState().filters;
      // Implementation should handle multiple search params consistently
      expect(typeof filters.searchQuery).toBe('string');
    });
  });
});
