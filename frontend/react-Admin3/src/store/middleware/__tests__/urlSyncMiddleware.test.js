/**
 * Tests for urlSyncMiddleware (Stories 1.1, 1.6)
 *
 * This middleware provides bidirectional synchronization between Redux filter state and URL:
 * - Redux → URL: Automatically update URL when filter actions are dispatched
 * - URL → Redux: Parse URL parameters and restore filter state
 *
 * TDD: These tests MUST FAIL before implementation.
 */

import { configureStore } from '@reduxjs/toolkit';
import filtersReducer, {
  setSubjects,
  setCategories,
  setProductTypes,
  setProducts,
  setModesOfDelivery,
  setTutorialFormat,
  setDistanceLearning,
  setTutorial,
  setSearchQuery,
  clearAllFilters,
} from '../../slices/filtersSlice';
import { urlSyncMiddleware, parseUrlToFilters } from '../urlSyncMiddleware';

// Mock window.history for testing
const mockReplaceState = jest.fn();
const mockPushState = jest.fn();

beforeAll(() => {
  Object.defineProperty(window, 'history', {
    value: {
      replaceState: mockReplaceState,
      pushState: mockPushState,
    },
    writable: true,
  });
});

beforeEach(() => {
  mockReplaceState.mockClear();
  mockPushState.mockClear();
  // Reset window.location.search
  delete window.location;
  window.location = { search: '', pathname: '/products' };
});

// Helper to create a test store with middleware
const createTestStore = () => {
  return configureStore({
    reducer: {
      filters: filtersReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(urlSyncMiddleware.middleware),
  });
};

describe('urlSyncMiddleware - Redux → URL Sync (Story 1.1)', () => {
  let store;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('Filter actions trigger URL updates', () => {
    it('should update URL when setSubjects is dispatched', () => {
      store.dispatch(setSubjects(['CB1', 'CB2']));

      expect(mockReplaceState).toHaveBeenCalled();
      const urlArgs = mockReplaceState.mock.calls[0];
      const urlString = urlArgs[2];

      expect(urlString).toContain('subject_code=CB1');
      expect(urlString).toContain('subject_1=CB2');
    });

    it('should update URL when setCategories is dispatched', () => {
      store.dispatch(setCategories(['MAT', 'TUT']));

      expect(mockReplaceState).toHaveBeenCalled();
      const urlString = mockReplaceState.mock.calls[0][2];

      expect(urlString).toContain('category_code=MAT');
      expect(urlString).toContain('category_1=TUT');
    });

    it('should update URL with comma-separated format for product types', () => {
      store.dispatch(setProductTypes(['PRINTED', 'EBOOK']));

      expect(mockReplaceState).toHaveBeenCalled();
      const urlString = mockReplaceState.mock.calls[0][2];

      expect(urlString).toContain('group=PRINTED%2CEBOOK');
    });

    it('should update URL when setTutorialFormat is dispatched', () => {
      store.dispatch(setTutorialFormat('online'));

      expect(mockReplaceState).toHaveBeenCalled();
      const urlString = mockReplaceState.mock.calls[0][2];

      expect(urlString).toContain('tutorial_format=online');
    });

    it('should update URL with boolean format for distance_learning', () => {
      store.dispatch(setDistanceLearning(true));

      expect(mockReplaceState).toHaveBeenCalled();
      const urlString = mockReplaceState.mock.calls[0][2];

      expect(urlString).toContain('distance_learning=1');
    });

    it('should update URL with boolean format for tutorial', () => {
      store.dispatch(setTutorial(true));

      expect(mockReplaceState).toHaveBeenCalled();
      const urlString = mockReplaceState.mock.calls[0][2];

      expect(urlString).toContain('tutorial=1');
    });

    it('should update URL when setSearchQuery is dispatched', () => {
      store.dispatch(setSearchQuery('exam materials'));

      expect(mockReplaceState).toHaveBeenCalled();
      const urlString = mockReplaceState.mock.calls[0][2];

      expect(urlString).toContain('search_query=exam');
    });
  });

  describe('URL update strategy', () => {
    it('should use replaceState not pushState to avoid polluting history', () => {
      store.dispatch(setSubjects(['CB1']));

      expect(mockReplaceState).toHaveBeenCalled();
      expect(mockPushState).not.toHaveBeenCalled();
    });

    it('should not create multiple history entries for rapid filter changes', () => {
      store.dispatch(setSubjects(['CB1']));
      store.dispatch(setCategories(['MAT']));
      store.dispatch(setProductTypes(['PRINTED']));

      // Should use replaceState, not pushState
      expect(mockReplaceState.mock.calls.length).toBeGreaterThan(0);
      expect(mockPushState).not.toHaveBeenCalled();
    });
  });

  describe('Loop prevention', () => {
    it('should not update URL if parameters are identical to last update', () => {
      // First update
      store.dispatch(setSubjects(['CB1']));
      const firstCallCount = mockReplaceState.mock.calls.length;

      // Clear mock
      mockReplaceState.mockClear();

      // Same update (should be skipped)
      store.dispatch(setSubjects(['CB1']));

      // Should not have called replaceState again
      expect(mockReplaceState).not.toHaveBeenCalled();
    });
  });

  describe('Invalid filter values', () => {
    it('should ignore invalid filter values and not include in URL', () => {
      store.dispatch(setTutorialFormat('invalid_format'));

      const urlString = mockReplaceState.mock.calls[0]?.[2] || '';

      // Invalid values should not be in URL
      expect(urlString).not.toContain('invalid_format');
    });
  });

  describe('Clear all filters', () => {
    it('should reset URL to base path when clearAllFilters is dispatched', () => {
      // Set some filters
      store.dispatch(setSubjects(['CB1']));
      store.dispatch(setCategories(['MAT']));

      // Clear mock
      mockReplaceState.mockClear();

      // Clear all filters
      store.dispatch(clearAllFilters());

      expect(mockReplaceState).toHaveBeenCalled();
      const urlString = mockReplaceState.mock.calls[0][2];

      // URL should be empty or just the base path
      expect(urlString === '' || urlString === '/products').toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete URL update within 5ms', () => {
      const start = performance.now();

      store.dispatch(setSubjects(['CB1']));

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5);
    });
  });
});

describe('parseUrlToFilters - URL → Redux Restoration (Story 1.6)', () => {
  describe('Indexed parameter format', () => {
    it('should parse indexed subject parameters to array', () => {
      const params = new URLSearchParams('subject_code=CB1&subject_1=CB2&subject_2=CB3');
      const filters = parseUrlToFilters(params);

      expect(filters.subjects).toEqual(['CB1', 'CB2', 'CB3']);
    });

    it('should parse indexed category parameters to array', () => {
      const params = new URLSearchParams('category_code=MAT&category_1=TUT');
      const filters = parseUrlToFilters(params);

      expect(filters.categories).toEqual(['MAT', 'TUT']);
    });

    it('should handle single indexed parameter', () => {
      const params = new URLSearchParams('subject_code=CB1');
      const filters = parseUrlToFilters(params);

      expect(filters.subjects).toEqual(['CB1']);
    });
  });

  describe('Comma-separated parameter format', () => {
    it('should parse comma-separated group parameter to product_types array', () => {
      const params = new URLSearchParams('group=PRINTED,EBOOK,ONLINE');
      const filters = parseUrlToFilters(params);

      expect(filters.product_types).toEqual(['PRINTED', 'EBOOK', 'ONLINE']);
    });

    it('should parse comma-separated product parameter to products array', () => {
      const params = new URLSearchParams('product=PROD1,PROD2');
      const filters = parseUrlToFilters(params);

      expect(filters.products).toEqual(['PROD1', 'PROD2']);
    });

    it('should handle single value in comma-separated format', () => {
      const params = new URLSearchParams('group=PRINTED');
      const filters = parseUrlToFilters(params);

      expect(filters.product_types).toEqual(['PRINTED']);
    });
  });

  describe('Boolean parameter format', () => {
    it('should parse tutorial=1 to boolean true', () => {
      const params = new URLSearchParams('tutorial=1');
      const filters = parseUrlToFilters(params);

      expect(filters.tutorial).toBe(true);
    });

    it('should parse missing tutorial parameter to boolean false', () => {
      const params = new URLSearchParams('subject_code=CB1');
      const filters = parseUrlToFilters(params);

      expect(filters.tutorial).toBe(false);
    });

    it('should parse distance_learning=1 to boolean true', () => {
      const params = new URLSearchParams('distance_learning=1');
      const filters = parseUrlToFilters(params);

      expect(filters.distance_learning).toBe(true);
    });

    it('should parse missing distance_learning parameter to boolean false', () => {
      const params = new URLSearchParams('');
      const filters = parseUrlToFilters(params);

      expect(filters.distance_learning).toBe(false);
    });
  });

  describe('Single value parameters', () => {
    it('should parse tutorial_format parameter', () => {
      const params = new URLSearchParams('tutorial_format=online');
      const filters = parseUrlToFilters(params);

      expect(filters.tutorial_format).toBe('online');
    });

    it('should return null for missing tutorial_format', () => {
      const params = new URLSearchParams('');
      const filters = parseUrlToFilters(params);

      expect(filters.tutorial_format).toBeNull();
    });

    it('should parse search_query parameter', () => {
      const params = new URLSearchParams('search_query=exam+materials');
      const filters = parseUrlToFilters(params);

      expect(filters.searchQuery).toBe('exam materials');
    });
  });

  describe('Legacy parameter name mapping', () => {
    it('should map legacy "group" to "product_types"', () => {
      const params = new URLSearchParams('group=PRINTED,EBOOK');
      const filters = parseUrlToFilters(params);

      expect(filters.product_types).toEqual(['PRINTED', 'EBOOK']);
    });
  });

  describe('Invalid parameters', () => {
    it('should ignore unknown parameters gracefully', () => {
      const params = new URLSearchParams('unknown_param=value&subject_code=CB1');
      const filters = parseUrlToFilters(params);

      expect(filters.subjects).toEqual(['CB1']);
      expect(filters).not.toHaveProperty('unknown_param');
    });

    it('should ignore invalid tutorial_format values', () => {
      const params = new URLSearchParams('tutorial_format=invalid');
      const filters = parseUrlToFilters(params);

      // Invalid values should be ignored, defaults to null
      expect(filters.tutorial_format).toBeNull();
    });

    it('should log warning for invalid parameters', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const params = new URLSearchParams('tutorial_format=invalid');
      parseUrlToFilters(params);

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Empty and missing parameters', () => {
    it('should return initial state for empty URLSearchParams', () => {
      const params = new URLSearchParams('');
      const filters = parseUrlToFilters(params);

      expect(filters.subjects).toEqual([]);
      expect(filters.categories).toEqual([]);
      expect(filters.product_types).toEqual([]);
      expect(filters.products).toEqual([]);
      expect(filters.modes_of_delivery).toEqual([]);
      expect(filters.tutorial_format).toBeNull();
      expect(filters.distance_learning).toBe(false);
      expect(filters.tutorial).toBe(false);
      expect(filters.searchQuery).toBe('');
    });
  });

  describe('Complex multi-filter URLs', () => {
    it('should parse URL with multiple filter types', () => {
      const params = new URLSearchParams(
        'subject_code=CB1&subject_1=CB2&category_code=MAT&group=PRINTED,EBOOK&tutorial_format=online&tutorial=1&search_query=exam'
      );
      const filters = parseUrlToFilters(params);

      expect(filters.subjects).toEqual(['CB1', 'CB2']);
      expect(filters.categories).toEqual(['MAT']);
      expect(filters.product_types).toEqual(['PRINTED', 'EBOOK']);
      expect(filters.tutorial_format).toBe('online');
      expect(filters.tutorial).toBe(true);
      expect(filters.searchQuery).toBe('exam');
    });
  });

  describe('URL contract validation', () => {
    it('should return filters matching redux-state.schema.json structure', () => {
      const params = new URLSearchParams('subject_code=CB1&tutorial=1');
      const filters = parseUrlToFilters(params);

      // Verify structure matches schema
      expect(filters).toHaveProperty('subjects');
      expect(filters).toHaveProperty('categories');
      expect(filters).toHaveProperty('product_types');
      expect(filters).toHaveProperty('products');
      expect(filters).toHaveProperty('modes_of_delivery');
      expect(filters).toHaveProperty('tutorial_format');
      expect(filters).toHaveProperty('distance_learning');
      expect(filters).toHaveProperty('tutorial');
      expect(filters).toHaveProperty('searchQuery');

      // Verify types
      expect(Array.isArray(filters.subjects)).toBe(true);
      expect(typeof filters.tutorial).toBe('boolean');
      expect(filters.tutorial_format === null || typeof filters.tutorial_format === 'string').toBe(true);
    });
  });
});
