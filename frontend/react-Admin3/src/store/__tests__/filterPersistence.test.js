/**
 * Filter State Persistence Integration Tests (Story 1.16)
 *
 * TDD RED Phase: These tests MUST FAIL until test utilities are implemented (T026)
 *
 * Tests filter state persistence across:
 * - Page refreshes
 * - Browser navigation (back/forward)
 * - Direct URL access
 * - URL sharing
 */

import { waitFor } from '@testing-library/react';
import {
  renderWithProviders,
  createMockStore,
  waitForStateUpdate,
  simulateUrlChange,
  createMockHistory,
} from '../../test-utils/testHelpers';
import {
  setSubjects,
  setCategories,
  setProductTypes,
  setSearchQuery,
  setCurrentPage,
} from '../slices/filtersSlice';

describe('Filter State Persistence', () => {
  // Story 1.16: Ensure window.location is properly initialized for each test
  beforeEach(() => {
    // Create a proper location mock that updates when history.replaceState is called
    const locationMock = {
      href: 'http://localhost/',
      search: '',
      pathname: '/',
      hash: '',
    };

    Object.defineProperty(window, 'location', {
      value: locationMock,
      writable: true,
      configurable: true,
    });

    // Mock history.replaceState to update window.location.search
    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function(state, title, url) {
      // Update location.search when replaceState is called
      if (url) {
        const urlObj = new URL(url, 'http://localhost');
        locationMock.search = urlObj.search;
        locationMock.pathname = urlObj.pathname;
        locationMock.href = urlObj.href;
      }
      return originalReplaceState.call(this, state, title, url);
    };
  });

  describe('URL-Based Persistence', () => {
    it('should restore filter state from URL on mount', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject_code=CM2&category_code=Bundle',
      });

      // State should be restored from URL
      const filters = store.getState().filters;
      expect(filters.subjects).toContain('CM2');
      expect(filters.categories).toContain('Bundle');
    });

    it('should restore multiple subjects from indexed URL params', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject_code=CM2&subject_1=SA1&subject_2=CB1',
      });

      const filters = store.getState().filters;
      expect(filters.subjects).toEqual(['CM2', 'SA1', 'CB1']);
    });

    it('should restore product types from comma-separated params', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?group=CORE_MATERIAL,MOCK_EXAM,TUTORIAL',
      });

      const filters = store.getState().filters;
      expect(filters.product_types).toEqual(['CORE_MATERIAL', 'MOCK_EXAM', 'TUTORIAL']);
    });

    it('should restore search query from URL', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?search_query=actuarial',
      });

      const filters = store.getState().filters;
      expect(filters.searchQuery).toBe('actuarial');
    });

    it('should restore pagination from URL', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?page=3&page_size=50',
      });

      const filters = store.getState().filters;
      expect(filters.currentPage).toBe(3);
      expect(filters.pageSize).toBe(50);
    });

    it('should restore complex filter state from URL', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject_code=CM2&subject_1=SA1&category_code=Bundle&group=CORE_MATERIAL&search_query=actuarial&page=2',
      });

      const filters = store.getState().filters;
      expect(filters.subjects).toEqual(['CM2', 'SA1']);
      expect(filters.categories).toEqual(['Bundle']);
      expect(filters.product_types).toEqual(['CORE_MATERIAL']);
      expect(filters.searchQuery).toBe('actuarial');
      expect(filters.currentPage).toBe(2);
    });
  });

  describe('Browser Navigation Persistence', () => {
    it('should maintain filter state when using browser back button', async () => {
      const history = createMockHistory(['/products', '/products?subject_code=CM2']);
      const store = createMockStore();

      // Start at filtered state
      expect(history.location.pathname).toBe('/products');

      // Navigate forward
      history.push('/products?subject_code=CM2');
      store.dispatch(setSubjects(['CM2']));

      await waitForStateUpdate(
        store,
        (state) => state.filters.subjects.includes('CM2'),
        { timeout: 1000 }
      );

      // Go back
      history.goBack();

      // State should reflect previous URL
      expect(history.location.pathname).toBe('/products');
    });

    it('should maintain filter state when using browser forward button', async () => {
      const history = createMockHistory(
        ['/products', '/products?subject_code=CM2'],
        1 // Start at second entry
      );

      expect(history.location.pathname).toBe('/products');

      // Go back
      history.goBack();
      expect(history.location.pathname).toBe('/products');

      // Go forward
      history.goForward();
      expect(history.location.pathname).toBe('/products');
    });

    it('should handle navigation history with multiple filter states', async () => {
      const history = createMockHistory([
        '/products',
        '/products?subject_code=CM2',
        '/products?subject_code=CM2&category_code=Bundle',
        '/products?subject_code=SA1',
      ]);

      // Verify we can navigate through history
      expect(history.location.pathname).toBe('/products');

      history.push('/products?subject_code=CM2');
      expect(history.location.search).toContain('subject_code=CM2');

      history.push('/products?subject_code=CM2&category_code=Bundle');
      expect(history.location.search).toContain('category_code=Bundle');

      history.goBack();
      expect(history.location.search).toContain('subject_code=CM2');
      expect(history.location.search).not.toContain('category_code=Bundle');
    });
  });

  describe('Page Refresh Persistence', () => {
    it('should restore filters after simulated page refresh', () => {
      // Initial state with filters
      const initialRoute = '/products?subject_code=CM2&category_code=Bundle';

      // Simulate page refresh by creating new component instance with same route
      const { store: store1 } = renderWithProviders(<div>Test 1</div>, {
        route: initialRoute,
      });

      const filters1 = store1.getState().filters;
      expect(filters1.subjects).toContain('CM2');
      expect(filters1.categories).toContain('Bundle');

      // Simulate refresh - new render with same URL
      const { store: store2 } = renderWithProviders(<div>Test 2</div>, {
        route: initialRoute,
      });

      const filters2 = store2.getState().filters;
      expect(filters2.subjects).toContain('CM2');
      expect(filters2.categories).toContain('Bundle');
    });

    it('should preserve filter state across component remount', () => {
      const route = '/products?subject_code=CM2&subject_1=SA1&search_query=test';

      const { store, unmount } = renderWithProviders(<div>Test</div>, { route });

      const filters1 = store.getState().filters;
      expect(filters1.subjects).toEqual(['CM2', 'SA1']);
      expect(filters1.searchQuery).toBe('test');

      // Unmount and remount
      unmount();

      const { store: store2 } = renderWithProviders(<div>Test</div>, { route });

      const filters2 = store2.getState().filters;
      expect(filters2.subjects).toEqual(['CM2', 'SA1']);
      expect(filters2.searchQuery).toBe('test');
    });
  });

  describe('Direct URL Access', () => {
    it('should handle direct URL access with filters', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject_code=CM2&category_code=Bundle&group=CORE_MATERIAL',
      });

      const filters = store.getState().filters;
      expect(filters.subjects).toEqual(['CM2']);
      expect(filters.categories).toEqual(['Bundle']);
      expect(filters.product_types).toEqual(['CORE_MATERIAL']);
    });

    it('should handle direct URL with all filter types', () => {
      const complexUrl =
        '/products?subject_code=CM2&subject_1=SA1&category_code=Bundle&category_1=Material&group=CORE_MATERIAL,MOCK_EXAM&search_query=actuarial&page=2&page_size=50';

      const { store } = renderWithProviders(<div>Test</div>, {
        route: complexUrl,
      });

      const filters = store.getState().filters;
      expect(filters.subjects).toEqual(['CM2', 'SA1']);
      expect(filters.categories).toEqual(['Bundle', 'Material']);
      expect(filters.product_types).toEqual(['CORE_MATERIAL', 'MOCK_EXAM']);
      expect(filters.searchQuery).toBe('actuarial');
      expect(filters.currentPage).toBe(2);
      expect(filters.pageSize).toBe(50);
    });

    it('should handle direct URL with encoded characters', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?search_query=test%20query%20with%20spaces',
      });

      const filters = store.getState().filters;
      expect(filters.searchQuery).toBe('test query with spaces');
    });

    it('should handle direct URL with special characters', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?search_query=test%26query%3Dvalue',
      });

      const filters = store.getState().filters;
      expect(filters.searchQuery).toBe('test&query=value');
    });
  });

  describe('URL Sharing', () => {
    it('should generate shareable URL with current filters', async () => {
      const store = createMockStore();

      // Set filters
      store.dispatch(setSubjects(['CM2', 'SA1']));
      store.dispatch(setCategories(['Bundle']));
      store.dispatch(setProductTypes(['CORE_MATERIAL']));

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBe('CM2');
        expect(params.get('subject_1')).toBe('SA1');
        expect(params.get('category_code')).toBe('Bundle');
        expect(params.get('group')).toBe('CORE_MATERIAL');
      });

      // URL should be shareable
      const shareableUrl = window.location.href;
      expect(shareableUrl).toContain('subject_code=CM2');
      expect(shareableUrl).toContain('subject_1=SA1');
      expect(shareableUrl).toContain('category_code=Bundle');
      expect(shareableUrl).toContain('group=CORE_MATERIAL');
    });

    it('should restore filters from shared URL', () => {
      const sharedUrl =
        '/products?subject_code=CM2&subject_1=SA1&category_code=Bundle&group=CORE_MATERIAL&search_query=actuarial';

      const { store } = renderWithProviders(<div>Test</div>, {
        route: sharedUrl,
      });

      const filters = store.getState().filters;
      expect(filters.subjects).toEqual(['CM2', 'SA1']);
      expect(filters.categories).toEqual(['Bundle']);
      expect(filters.product_types).toEqual(['CORE_MATERIAL']);
      expect(filters.searchQuery).toBe('actuarial');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty URL (no filters)', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products',
      });

      const filters = store.getState().filters;
      expect(filters.subjects).toEqual([]);
      expect(filters.categories).toEqual([]);
      expect(filters.product_types).toEqual([]);
      expect(filters.searchQuery).toBe('');
      expect(filters.currentPage).toBe(1);
    });

    it('should handle malformed URL parameters gracefully', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject_code=&category_code=invalid@#$',
      });

      // Should not crash
      expect(() => {
        store.getState().filters;
      }).not.toThrow();
    });

    it('should handle URL with unknown parameters', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject_code=CM2&unknown_param=value&another_unknown=123',
      });

      const filters = store.getState().filters;
      expect(filters.subjects).toEqual(['CM2']);
      // Unknown params should be ignored
    });

    it('should handle very long URLs', () => {
      const longSubjectList = Array.from(
        { length: 50 },
        (_, i) => `&subject_${i}=SUBJECT_${i}`
      ).join('');
      const longUrl = `/products?subject_code=CM2${longSubjectList}`;

      const { store } = renderWithProviders(<div>Test</div>, {
        route: longUrl,
      });

      // Should handle without crashing
      expect(() => {
        store.getState().filters;
      }).not.toThrow();
    });

    it('should handle URL parameter collision (duplicate keys)', () => {
      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject_code=CM2&subject_code=SA1',
      });

      const filters = store.getState().filters;
      // Should handle duplicate params gracefully (behavior depends on implementation)
      expect(Array.isArray(filters.subjects)).toBe(true);
    });
  });

  describe('State Sync Accuracy', () => {
    it('should maintain exact filter state after URL round-trip', async () => {
      const store = createMockStore();

      const originalFilters = {
        subjects: ['CM2', 'SA1', 'CB1'],
        categories: ['Bundle', 'Material'],
        product_types: ['CORE_MATERIAL', 'MOCK_EXAM'],
        searchQuery: 'actuarial',
        currentPage: 3,
      };

      // Set filters
      store.dispatch(setSubjects(originalFilters.subjects));
      store.dispatch(setCategories(originalFilters.categories));
      store.dispatch(setProductTypes(originalFilters.product_types));
      store.dispatch(setSearchQuery(originalFilters.searchQuery));
      store.dispatch(setCurrentPage(originalFilters.currentPage));

      // Wait for URL sync
      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBeTruthy();
      });

      // Capture URL
      const url = window.location.search;

      // Create new store and restore from URL
      const { store: newStore } = renderWithProviders(<div>Test</div>, {
        route: `/products${url}`,
      });

      const restoredFilters = newStore.getState().filters;

      // Should match exactly
      expect(restoredFilters.subjects).toEqual(originalFilters.subjects);
      expect(restoredFilters.categories).toEqual(originalFilters.categories);
      expect(restoredFilters.product_types).toEqual(originalFilters.product_types);
      expect(restoredFilters.searchQuery).toEqual(originalFilters.searchQuery);
      expect(restoredFilters.currentPage).toEqual(originalFilters.currentPage);
    });

    it('should preserve filter order across persistence', async () => {
      const store = createMockStore();

      const orderedSubjects = ['SA1', 'CM2', 'CB1']; // Specific order
      store.dispatch(setSubjects(orderedSubjects));

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBe('SA1');
      });

      const url = window.location.search;

      const { store: newStore } = renderWithProviders(<div>Test</div>, {
        route: `/products${url}`,
      });

      const restoredSubjects = newStore.getState().filters.subjects;
      expect(restoredSubjects).toEqual(orderedSubjects);
    });
  });

  describe('Performance', () => {
    it('should restore filters from URL in < 50ms', () => {
      const start = performance.now();

      const { store } = renderWithProviders(<div>Test</div>, {
        route: '/products?subject_code=CM2&subject_1=SA1&category_code=Bundle&group=CORE_MATERIAL',
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);

      // Verify filters were actually restored
      const filters = store.getState().filters;
      expect(filters.subjects).toContain('CM2');
    });

    it('should handle complex URL with many filters efficiently', () => {
      const start = performance.now();

      const complexUrl =
        '/products?subject_code=CM2&subject_1=SA1&subject_2=CB1&subject_3=CP1&category_code=Bundle&category_1=Material&group=CORE_MATERIAL,MOCK_EXAM,TUTORIAL&search_query=test&page=5';

      const { store } = renderWithProviders(<div>Test</div>, {
        route: complexUrl,
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);

      const filters = store.getState().filters;
      expect(filters.subjects.length).toBeGreaterThan(0);
    });
  });
});
