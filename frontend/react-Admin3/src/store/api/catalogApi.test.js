/**
 * Integration tests for catalogApi RTK Query service
 *
 * Tests API calls, caching, error handling, and request/response transformation
 * Uses Jest mocks instead of MSW for fetch mocking (avoids ESM compatibility issues)
 */

import { configureStore } from '@reduxjs/toolkit';
import { catalogApi } from './catalogApi';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test store setup
const createTestStore = () => {
  return configureStore({
    reducer: {
      [catalogApi.reducerPath]: catalogApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(catalogApi.middleware),
  });
};

// Helper to create mock Response (proper fetch Response object for RTK Query)
const createMockResponse = (data, status = 200) => {
  const responseInit = {
    status,
    headers: { 'Content-Type': 'application/json' }
  };
  const body = JSON.stringify(data);
  const response = new Response(body, responseInit);
  return Promise.resolve(response);
};

describe('catalogApi', () => {

  beforeEach(() => {
    // Reset mocks
    mockFetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    // Reset RTK Query cache between tests
    catalogApi.util.resetApiState();
  });

  describe('unifiedSearch', () => {

    const mockSearchResponse = {
      products: [
        {
          id: 1,
          name: 'Test Product',
          subjectCodes: ['CM2'],
          category: 'Materials',
        },
      ],
      filter_counts: {
        subjects: { CM2: 45, SA1: 23 },
        categories: { Bundle: 12, Materials: 67 },
      },
      pagination: {
        page: 1,
        page_size: 20,
        total_count: 1,
        has_next: false,
        has_previous: false,
      },
    };

    it('should make successful search request', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockSearchResponse));

      const store = createTestStore();

      const searchParams = {
        filters: {
          subjects: ['CM2'],
          categories: ['Materials'],
        },
        pagination: {
          page: 1,
          page_size: 20,
        },
        options: {
          include_bundles: true,
        },
      };

      // Dispatch search
      const result = await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      expect(result.data).toEqual({
        products: mockSearchResponse.products,
        filterCounts: mockSearchResponse.filter_counts,
        pagination: mockSearchResponse.pagination,
      });
    });

    it('should transform response correctly', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockSearchResponse));

      const store = createTestStore();

      const searchParams = {
        filters: { subjects: ['CM2'] },
      };

      const result = await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      // Check that response is transformed correctly
      expect(result.data.filterCounts).toEqual(mockSearchResponse.filter_counts);
      expect(result.data.products).toEqual(mockSearchResponse.products);
      expect(result.data.pagination).toEqual(mockSearchResponse.pagination);
    });

    it('should handle empty response gracefully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      const store = createTestStore();
      const searchParams = { filters: {} };

      const result = await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      // Should provide defaults for missing fields
      expect(result.data.products).toEqual([]);
      expect(result.data.filterCounts).toEqual({});
      expect(result.data.pagination).toEqual({
        page: 1,
        page_size: 20,
        total_count: 0,
        has_next: false,
        has_previous: false,
      });
    });

    it('should handle API errors', async () => {
      const errorResponse = {
        error: 'Search failed',
        details: 'Invalid filter parameters',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(errorResponse, 400));

      const store = createTestStore();
      const searchParams = { filters: { invalid_filter: ['test'] } };

      const result = await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      expect(result.error).toBeDefined();
      expect(result.error.status).toBe(400);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network connection failed'));

      const store = createTestStore();
      const searchParams = { filters: { subjects: ['CM2'] } };

      const result = await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      expect(result.error).toBeDefined();
      expect(result.error.status).toBe('FETCH_ERROR');
    });

    it('should include authorization header when token exists', async () => {
      localStorageMock.getItem.mockReturnValue('mock_access_token');
      mockFetch.mockResolvedValueOnce(createMockResponse(mockSearchResponse));

      const store = createTestStore();
      const searchParams = { filters: { subjects: ['CM2'] } };

      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      // Verify fetch was called with authorization header
      // RTK Query passes a Request object to fetch
      expect(mockFetch).toHaveBeenCalled();
      const request = mockFetch.mock.calls[0][0];
      expect(request.headers.get('authorization')).toBe('Bearer mock_access_token');
    });

    it('should set content-type header', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockSearchResponse));

      const store = createTestStore();
      const searchParams = { filters: { subjects: ['CM2'] } };

      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      // Verify fetch was called with content-type header
      // RTK Query passes a Request object to fetch
      const request = mockFetch.mock.calls[0][0];
      expect(request.headers.get('content-type')).toBe('application/json');
    });

  });

  describe('listProducts (legacy)', () => {

    it('should make legacy list products request', async () => {
      const mockResponse = {
        results: [{ id: 1, name: 'Test Product' }],
        count: 1,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const store = createTestStore();
      const params = { subject: 'CM2' };

      const result = await store.dispatch(
        catalogApi.endpoints.listProducts.initiate(params)
      );

      expect(result.data).toEqual(mockResponse);
    });

    it('should build query parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ results: [] }));

      const store = createTestStore();
      const params = {
        subject: 'CM2',
        category: 'Bundle',
        page: '2',
      };

      await store.dispatch(
        catalogApi.endpoints.listProducts.initiate(params)
      );

      // Verify URL contains query params - RTK Query passes a Request object
      const request = mockFetch.mock.calls[0][0];
      const fetchUrl = request.url;
      expect(fetchUrl).toContain('subject=CM2');
      expect(fetchUrl).toContain('category=Bundle');
      expect(fetchUrl).toContain('page=2');
    });

  });

  describe('getDefaultSearchData', () => {

    it('should fetch default search data', async () => {
      const mockResponse = {
        subjects: [{ code: 'CM2', name: 'Commercial Management 2' }],
        categories: ['Materials', 'Bundle'],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const store = createTestStore();

      const result = await store.dispatch(
        catalogApi.endpoints.getDefaultSearchData.initiate()
      );

      expect(result.data).toEqual(mockResponse);
    });

  });

  describe('caching behavior', () => {

    it('should cache identical search requests', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        products: [],
        filter_counts: {},
        pagination: { page: 1, page_size: 20, total_count: 0 },
      }));

      const store = createTestStore();
      const searchParams = { filters: { subjects: ['CM2'] } };

      // Make first request
      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      // Make identical second request - should use cache
      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      expect(mockFetch).toHaveBeenCalledTimes(1); // Should only make one request due to caching
    });

    it('should make new request for different parameters', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        products: [],
        filter_counts: {},
        pagination: { page: 1, page_size: 20, total_count: 0 },
      }));

      const store = createTestStore();

      // Make first request
      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate({ filters: { subjects: ['CM2'] } })
      );

      // Make second request with different parameters
      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate({ filters: { subjects: ['SA1'] } })
      );

      expect(mockFetch).toHaveBeenCalledTimes(2); // Should make two separate requests
    });

    it('should cache requests with same searchQuery and filters', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        products: [],
        filter_counts: {},
        pagination: { page: 1, page_size: 20, total_count: 0 },
      }));

      const store = createTestStore();
      const searchParams = {
        searchQuery: 'test query',
        filters: { subjects: ['CM2'] }
      };

      // Make first request
      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      // Make identical second request - should use cache
      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should NOT cache requests with different searchQuery', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        products: [],
        filter_counts: {},
        pagination: { page: 1, page_size: 20, total_count: 0 },
      }));

      const store = createTestStore();

      // Make first request
      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate({
          searchQuery: 'test query 1',
          filters: { subjects: ['CM2'] }
        })
      );

      // Make second request with different searchQuery
      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate({
          searchQuery: 'test query 2',
          filters: { subjects: ['CM2'] }
        })
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

  });

  describe('request body construction', () => {

    it('should send searchQuery in request body for fuzzy search', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        products: [],
        filter_counts: {},
        pagination: { page: 1, page_size: 20, total_count: 0 },
      }));

      const store = createTestStore();
      const searchParams = {
        searchQuery: 'exam materials',
        filters: { subjects: ['CM2'] }
      };

      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      // Verify request body contains searchQuery - RTK Query passes a Request object
      const request = mockFetch.mock.calls[0][0];
      const bodyText = await request.clone().text();
      const body = JSON.parse(bodyText);
      expect(body.searchQuery).toBe('exam materials');
    });

    it('should include filters in request body', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        products: [],
        filter_counts: {},
        pagination: { page: 1, page_size: 20, total_count: 0 },
      }));

      const store = createTestStore();
      const searchParams = {
        filters: {
          subjects: ['CM2', 'SA1'],
          categories: ['Bundle']
        }
      };

      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      // Verify request body contains filters - RTK Query passes a Request object
      const request = mockFetch.mock.calls[0][0];
      const bodyText = await request.clone().text();
      const body = JSON.parse(bodyText);
      expect(body.filters.subjects).toEqual(['CM2', 'SA1']);
      expect(body.filters.categories).toEqual(['Bundle']);
    });

    it('should include pagination in request body', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        products: [],
        filter_counts: {},
        pagination: { page: 2, page_size: 50, total_count: 0 },
      }));

      const store = createTestStore();
      const searchParams = {
        filters: {},
        pagination: { page: 2, page_size: 50 }
      };

      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      // Verify request body contains pagination - RTK Query passes a Request object
      const request = mockFetch.mock.calls[0][0];
      const bodyText = await request.clone().text();
      const body = JSON.parse(bodyText);
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.page_size).toBe(50);
    });

    it('should include default options with include_bundles true', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        products: [],
        filter_counts: {},
        pagination: { page: 1, page_size: 20, total_count: 0 },
      }));

      const store = createTestStore();
      const searchParams = { filters: {} };

      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );

      // Verify request body includes default options - RTK Query passes a Request object
      const request = mockFetch.mock.calls[0][0];
      const bodyText = await request.clone().text();
      const body = JSON.parse(bodyText);
      expect(body.options.include_bundles).toBe(true);
      expect(body.options.include_analytics).toBe(false);
    });

  });

});
