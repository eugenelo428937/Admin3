/**
 * Tests for searchService
 *
 * @module services/__tests__/searchService.test
 *
 * Tests search operations including:
 * - fuzzySearch: Basic fuzzy search with query
 * - advancedSearch: Advanced search with filters
 * - getDefaultSearchData: Get default filters and popular products
 * - debounce: Utility debounce function
 */

jest.mock('../httpService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../config', () => ({
  __esModule: true,
  default: {
    productsUrl: 'http://test-api/products',
    apiBaseUrl: 'http://test-api',
  },
}));

import searchService from '../searchService';
import httpService from '../httpService';

describe('searchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('fuzzySearch', () => {
    test('should return empty result for empty query', async () => {
      const result = await searchService.fuzzySearch('');

      expect(result).toEqual({
        suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
        suggested_products: [],
      });
      expect(httpService.get).not.toHaveBeenCalled();
    });

    test('should return empty result for whitespace-only query', async () => {
      const result = await searchService.fuzzySearch('   ');

      expect(result).toEqual({
        suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
        suggested_products: [],
      });
      expect(httpService.get).not.toHaveBeenCalled();
    });

    test('should return empty result for null query', async () => {
      const result = await searchService.fuzzySearch(null);

      expect(result).toEqual({
        suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
        suggested_products: [],
      });
    });

    test('should return empty result for undefined query', async () => {
      const result = await searchService.fuzzySearch(undefined);

      expect(result).toEqual({
        suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
        suggested_products: [],
      });
    });

    test('should perform fuzzy search with valid query', async () => {
      const mockResponse = {
        data: {
          suggested_filters: {
            subjects: [{ code: 'CM1', name: 'CM1 - Actuarial Mathematics' }],
            product_groups: [{ id: 1, name: 'Core Study Material' }],
            variations: [],
            products: [],
          },
          products: [
            { id: 1, name: 'CM1 Study Text' },
            { id: 2, name: 'CM1 Practice Questions' },
          ],
          search_info: { query: 'CM1', match_type: 'fuzzy' },
          total_count: 2,
        },
      };
      httpService.get.mockResolvedValue(mockResponse);

      const result = await searchService.fuzzySearch('CM1');

      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api/products/search/',
        {
          params: {
            q: 'CM1',
            limit: 50,
          },
        }
      );
      expect(result.suggested_filters.subjects).toHaveLength(1);
      expect(result.suggested_products).toHaveLength(2);
      expect(result.total_count).toBe(2);
    });

    test('should trim query before searching', async () => {
      const mockResponse = { data: { products: [], suggested_filters: {} } };
      httpService.get.mockResolvedValue(mockResponse);

      await searchService.fuzzySearch('  actuarial  ');

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({ q: 'actuarial' }),
        })
      );
    });

    test('should handle missing suggested_filters in response', async () => {
      const mockResponse = {
        data: {
          products: [{ id: 1, name: 'Test Product' }],
        },
      };
      httpService.get.mockResolvedValue(mockResponse);

      const result = await searchService.fuzzySearch('test');

      expect(result.suggested_filters).toEqual({
        subjects: [],
        product_groups: [],
        variations: [],
        products: [],
      });
    });

    test('should handle missing products in response', async () => {
      const mockResponse = {
        data: {
          suggested_filters: { subjects: [], product_groups: [] },
        },
      };
      httpService.get.mockResolvedValue(mockResponse);

      const result = await searchService.fuzzySearch('test');

      expect(result.suggested_products).toEqual([]);
    });

    test('should throw connection error when no response', async () => {
      const error = new Error('Network error');
      error.response = undefined;
      httpService.get.mockRejectedValue(error);

      await expect(searchService.fuzzySearch('test')).rejects.toThrow(
        'Cannot connect to server. Please ensure the Django server is running.'
      );
    });

    test('should throw 404 error for missing endpoint', async () => {
      const error = new Error('Not found');
      error.response = { status: 404 };
      httpService.get.mockRejectedValue(error);

      await expect(searchService.fuzzySearch('test')).rejects.toThrow(
        'Search endpoint not found. Please check your API configuration.'
      );
    });

    test('should throw server error for 500+ status', async () => {
      const error = new Error('Server error');
      error.response = { status: 500 };
      httpService.get.mockRejectedValue(error);

      await expect(searchService.fuzzySearch('test')).rejects.toThrow(
        'Server error occurred. Please try again later.'
      );

      // Test with 503
      error.response.status = 503;
      await expect(searchService.fuzzySearch('test')).rejects.toThrow(
        'Server error occurred. Please try again later.'
      );
    });

    test('should throw error message from response data', async () => {
      const error = new Error('API error');
      error.response = { status: 400, data: { error: 'Invalid search query' } };
      httpService.get.mockRejectedValue(error);

      await expect(searchService.fuzzySearch('test')).rejects.toThrow('Invalid search query');
    });

    test('should throw message from response data', async () => {
      const error = new Error('API error');
      error.response = { status: 400, data: { message: 'Query too short' } };
      httpService.get.mockRejectedValue(error);

      await expect(searchService.fuzzySearch('test')).rejects.toThrow('Query too short');
    });

    test('should fallback to error.message when no response data', async () => {
      const error = new Error('Custom error message');
      error.response = { status: 400, data: {} };
      httpService.get.mockRejectedValue(error);

      await expect(searchService.fuzzySearch('test')).rejects.toThrow('Custom error message');
    });

    test('should fallback to Search failed when no error message', async () => {
      const error = new Error();
      error.response = { status: 400, data: {} };
      httpService.get.mockRejectedValue(error);

      await expect(searchService.fuzzySearch('test')).rejects.toThrow('Search failed');
    });
  });

  describe('advancedSearch', () => {
    test('should perform advanced search with query only', async () => {
      const mockResponse = {
        data: {
          products: [{ id: 1, name: 'Test Product' }],
          total_count: 1,
          search_info: { query: 'test' },
          suggested_filters: {},
        },
      };
      httpService.get.mockResolvedValue(mockResponse);

      const result = await searchService.advancedSearch({ q: 'test' });

      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api/products/advanced-search/',
        {
          params: {
            q: 'test',
            limit: 50,
          },
        }
      );
      expect(result.results).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    test('should use custom page_size when provided', async () => {
      const mockResponse = { data: { products: [], total_count: 0 } };
      httpService.get.mockResolvedValue(mockResponse);

      await searchService.advancedSearch({ q: 'test', page_size: 25 });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({ limit: 25 }),
        })
      );
    });

    test('should handle empty query', async () => {
      const mockResponse = { data: { products: [], total_count: 0 } };
      httpService.get.mockResolvedValue(mockResponse);

      await searchService.advancedSearch({ q: '' });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        {
          params: { limit: 50 },
        }
      );
    });

    test('should handle whitespace-only query', async () => {
      const mockResponse = { data: { products: [], total_count: 0 } };
      httpService.get.mockResolvedValue(mockResponse);

      await searchService.advancedSearch({ q: '   ' });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        {
          params: { limit: 50 },
        }
      );
    });

    test('should add subject filters', async () => {
      const mockResponse = { data: { products: [], total_count: 0 } };
      httpService.get.mockResolvedValue(mockResponse);

      await searchService.advancedSearch({
        q: 'test',
        subjects: ['CM1', 'CM2'],
      });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({ subjects: 'CM1,CM2' }),
        })
      );
    });

    test('should not add empty subject filters', async () => {
      const mockResponse = { data: { products: [], total_count: 0 } };
      httpService.get.mockResolvedValue(mockResponse);

      await searchService.advancedSearch({
        q: 'test',
        subjects: [],
      });

      const callParams = httpService.get.mock.calls[0][1].params;
      expect(callParams.subjects).toBeUndefined();
    });

    test('should add group filters as categories', async () => {
      const mockResponse = { data: { products: [], total_count: 0 } };
      httpService.get.mockResolvedValue(mockResponse);

      await searchService.advancedSearch({
        q: 'test',
        groups: ['1', '2'],
      });

      expect(httpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({ categories: '1,2' }),
        })
      );
    });

    test('should not add empty group filters', async () => {
      const mockResponse = { data: { products: [], total_count: 0 } };
      httpService.get.mockResolvedValue(mockResponse);

      await searchService.advancedSearch({
        q: 'test',
        groups: [],
      });

      const callParams = httpService.get.mock.calls[0][1].params;
      expect(callParams.categories).toBeUndefined();
    });

    test('should handle variation filters (currently not implemented)', async () => {
      const mockResponse = { data: { products: [], total_count: 0 } };
      httpService.get.mockResolvedValue(mockResponse);

      await searchService.advancedSearch({
        q: 'test',
        variations: ['printed', 'ebook'],
      });

      // Variations are currently logged but not sent to backend
      expect(httpService.get).toHaveBeenCalled();
    });

    test('should handle product filters (currently not implemented)', async () => {
      const mockResponse = { data: { products: [], total_count: 0 } };
      httpService.get.mockResolvedValue(mockResponse);

      await searchService.advancedSearch({
        q: 'test',
        products: ['123', '456'],
      });

      // Products are currently logged but not sent to backend
      expect(httpService.get).toHaveBeenCalled();
    });

    test('should return structured response', async () => {
      const mockResponse = {
        data: {
          products: [{ id: 1, name: 'Product 1' }],
          total_count: 100,
          search_info: { query: 'test', type: 'fuzzy' },
          suggested_filters: { subjects: [] },
        },
      };
      httpService.get.mockResolvedValue(mockResponse);

      const result = await searchService.advancedSearch({ q: 'test' });

      expect(result).toEqual({
        results: [{ id: 1, name: 'Product 1' }],
        count: 100,
        has_next: false,
        has_previous: false,
        search_info: { query: 'test', type: 'fuzzy' },
        suggested_filters: { subjects: [] },
      });
    });

    test('should handle missing response data gracefully', async () => {
      const mockResponse = { data: {} };
      httpService.get.mockResolvedValue(mockResponse);

      const result = await searchService.advancedSearch({ q: 'test' });

      expect(result).toEqual({
        results: [],
        count: 0,
        has_next: false,
        has_previous: false,
        search_info: {},
        suggested_filters: {},
      });
    });

    test('should throw connection error when no response', async () => {
      const error = new Error('Network error');
      error.response = undefined;
      httpService.get.mockRejectedValue(error);

      await expect(searchService.advancedSearch({ q: 'test' })).rejects.toThrow(
        'Cannot connect to server. Please ensure the Django server is running.'
      );
    });

    test('should throw 404 error for missing endpoint', async () => {
      const error = new Error('Not found');
      error.response = { status: 404 };
      httpService.get.mockRejectedValue(error);

      await expect(searchService.advancedSearch({ q: 'test' })).rejects.toThrow(
        'Advanced search endpoint not found. Please check your API configuration.'
      );
    });

    test('should throw server error for 500+ status', async () => {
      const error = new Error('Server error');
      error.response = { status: 502 };
      httpService.get.mockRejectedValue(error);

      await expect(searchService.advancedSearch({ q: 'test' })).rejects.toThrow(
        'Server error occurred. Please try again later.'
      );
    });

    test('should throw error message from response data', async () => {
      const error = new Error('API error');
      error.response = { status: 400, data: { error: 'Invalid parameters' } };
      httpService.get.mockRejectedValue(error);

      await expect(searchService.advancedSearch({ q: 'test' })).rejects.toThrow(
        'Invalid parameters'
      );
    });

    test('should fallback to Advanced search failed when no error message', async () => {
      const error = new Error();
      error.response = { status: 400, data: {} };
      httpService.get.mockRejectedValue(error);

      await expect(searchService.advancedSearch({ q: 'test' })).rejects.toThrow(
        'Advanced search failed'
      );
    });
  });

  describe('getDefaultSearchData', () => {
    test('should fetch default search data', async () => {
      const mockResponse = {
        data: {
          suggested_filters: {
            subjects: [{ code: 'CM1', name: 'CM1' }],
            product_groups: [{ id: 1, name: 'Materials' }],
            variations: [],
            products: [],
          },
          popular_products: [{ id: 1, name: 'Popular Product' }],
          total_count: 10,
        },
      };
      httpService.get.mockResolvedValue(mockResponse);

      const result = await searchService.getDefaultSearchData();

      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api/api/search/default-data/',
        {
          params: { limit: 5 },
        }
      );
      expect(result.suggested_filters.subjects).toHaveLength(1);
      expect(result.suggested_products).toHaveLength(1);
      expect(result.search_info).toEqual({ query: '', type: 'default' });
      expect(result.total_count).toBe(10);
    });

    test('should handle missing suggested_filters in response', async () => {
      const mockResponse = {
        data: {
          popular_products: [],
          total_count: 0,
        },
      };
      httpService.get.mockResolvedValue(mockResponse);

      const result = await searchService.getDefaultSearchData();

      expect(result.suggested_filters).toEqual({
        subjects: [],
        product_groups: [],
        variations: [],
        products: [],
      });
    });

    test('should handle missing popular_products in response', async () => {
      const mockResponse = {
        data: {
          suggested_filters: {},
          total_count: 0,
        },
      };
      httpService.get.mockResolvedValue(mockResponse);

      const result = await searchService.getDefaultSearchData();

      expect(result.suggested_products).toEqual([]);
    });

    test('should return fallback data on 404 error', async () => {
      const error = new Error('Not found');
      error.response = { status: 404 };
      httpService.get.mockRejectedValue(error);

      const result = await searchService.getDefaultSearchData();

      expect(result).toEqual({
        suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
        suggested_products: [],
        search_info: { query: '', type: 'fallback' },
        total_count: 0,
      });
    });

    test('should return safe empty data on network error', async () => {
      const error = new Error('Network error');
      error.response = undefined;
      httpService.get.mockRejectedValue(error);

      const result = await searchService.getDefaultSearchData();

      expect(result).toEqual({
        suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
        suggested_products: [],
        search_info: { query: '', type: 'error' },
        total_count: 0,
      });
    });

    test('should return safe empty data on server error', async () => {
      const error = new Error('Server error');
      error.response = { status: 500 };
      httpService.get.mockRejectedValue(error);

      const result = await searchService.getDefaultSearchData();

      expect(result).toEqual({
        suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
        suggested_products: [],
        search_info: { query: '', type: 'error' },
        total_count: 0,
      });
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should delay function execution', () => {
      const mockFn = jest.fn();
      const debouncedFn = searchService.debounce(mockFn, 300);

      debouncedFn('arg1');

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);

      expect(mockFn).toHaveBeenCalledWith('arg1');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should cancel previous call when called again within wait period', () => {
      const mockFn = jest.fn();
      const debouncedFn = searchService.debounce(mockFn, 300);

      debouncedFn('first');
      jest.advanceTimersByTime(100);

      debouncedFn('second');
      jest.advanceTimersByTime(100);

      debouncedFn('third');
      jest.advanceTimersByTime(300);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('third');
    });

    test('should pass multiple arguments', () => {
      const mockFn = jest.fn();
      const debouncedFn = searchService.debounce(mockFn, 100);

      debouncedFn('arg1', 'arg2', { key: 'value' });

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
    });

    test('should allow multiple executions with sufficient delay', () => {
      const mockFn = jest.fn();
      const debouncedFn = searchService.debounce(mockFn, 100);

      debouncedFn('first');
      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);

      debouncedFn('second');
      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('second');
    });

    test('should handle zero wait time', () => {
      const mockFn = jest.fn();
      const debouncedFn = searchService.debounce(mockFn, 0);

      debouncedFn('test');

      // Even with 0 wait, setTimeout still runs asynchronously
      jest.advanceTimersByTime(0);

      expect(mockFn).toHaveBeenCalledWith('test');
    });
  });
});
