/**
 * Integration tests for catalogApi RTK Query service
 * 
 * Tests API calls, caching, error handling, and request/response transformation
 */

import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { configureStore } from '@reduxjs/toolkit';
import { catalogApi } from './catalogApi';
import config from '../../config';

// Mock API server
const server = setupServer();

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

describe('catalogApi', () => {
  
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  
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
    
    beforeEach(() => {
      // Mock successful search response
      server.use(
        rest.post(`${config.apiBaseUrl}/api/exam-sessions-subjects-products/search/`, (req, res, ctx) => {
          return res(ctx.json(mockSearchResponse));
        })
      );
    });
    
    it('should make successful search request', async () => {
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
      server.use(
        rest.post(`${config.apiBaseUrl}/api/exam-sessions-subjects-products/search/`, (req, res, ctx) => {
          return res(ctx.json({}));
        })
      );
      
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
      
      server.use(
        rest.post(`${config.apiBaseUrl}/api/exam-sessions-subjects-products/search/`, (req, res, ctx) => {
          return res(ctx.status(400), ctx.json(errorResponse));
        })
      );
      
      const store = createTestStore();
      const searchParams = { filters: { invalid_filter: ['test'] } };
      
      const result = await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );
      
      expect(result.error).toBeDefined();
      expect(result.error.status).toBe(400);
      expect(result.error.data.error).toBe('Search failed');
    });
    
    it('should handle network errors', async () => {
      server.use(
        rest.post(`${config.apiBaseUrl}/api/exam-sessions-subjects-products/search/`, (req, res, ctx) => {
          return res.networkError('Network connection failed');
        })
      );
      
      const store = createTestStore();
      const searchParams = { filters: { subjects: ['CM2'] } };
      
      const result = await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );
      
      expect(result.error).toBeDefined();
      expect(result.error.name).toBe('NetworkError');
    });
    
    it('should handle authentication errors with token refresh', async () => {
      let attemptCount = 0;
      
      server.use(
        rest.post(`${config.apiBaseUrl}/api/exam-sessions-subjects-products/search/`, (req, res, ctx) => {
          attemptCount++;
          if (attemptCount === 1) {
            return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
          }
          return res(ctx.json(mockSearchResponse));
        }),
        rest.post(`${config.apiBaseUrl}/api/auth/refresh/`, (req, res, ctx) => {
          return res(ctx.json({ access: 'new_access_token' }));
        })
      );
      
      // Mock localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn((key) => {
            if (key === 'refresh_token') return 'mock_refresh_token';
            return null;
          }),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });
      
      const store = createTestStore();
      const searchParams = { filters: { subjects: ['CM2'] } };
      
      const result = await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate(searchParams)
      );
      
      // Should succeed after token refresh
      expect(result.data).toEqual({
        products: mockSearchResponse.products,
        filterCounts: mockSearchResponse.filter_counts,
        pagination: mockSearchResponse.pagination,
      });
      
      // Should have attempted refresh
      expect(window.localStorage.setItem).toHaveBeenCalledWith('access_token', 'new_access_token');
    });
    
  });
  
  describe('listProducts (legacy)', () => {
    
    it('should make legacy list products request', async () => {
      const mockResponse = {
        results: [{ id: 1, name: 'Test Product' }],
        count: 1,
      };
      
      server.use(
        rest.get(`${config.apiBaseUrl}/api/exam-sessions-subjects-products/current/list/`, (req, res, ctx) => {
          return res(ctx.json(mockResponse));
        })
      );
      
      const store = createTestStore();
      const params = { subject: 'CM2' };
      
      const result = await store.dispatch(
        catalogApi.endpoints.listProducts.initiate(params)
      );
      
      expect(result.data).toEqual(mockResponse);
    });
    
    it('should handle query parameters correctly', async () => {
      let capturedParams;
      
      server.use(
        rest.get(`${config.apiBaseUrl}/api/exam-sessions-subjects-products/current/list/`, (req, res, ctx) => {
          capturedParams = Object.fromEntries(req.url.searchParams);
          return res(ctx.json({ results: [] }));
        })
      );
      
      const store = createTestStore();
      const params = { 
        subject: 'CM2',
        category: 'Bundle',
        page: '2',
      };
      
      await store.dispatch(
        catalogApi.endpoints.listProducts.initiate(params)
      );
      
      expect(capturedParams).toEqual({
        subject: 'CM2',
        category: 'Bundle',
        page: '2',
      });
    });
    
  });
  
  describe('getDefaultSearchData', () => {
    
    it('should fetch default search data', async () => {
      const mockResponse = {
        subjects: [{ code: 'CM2', name: 'Commercial Management 2' }],
        categories: ['Materials', 'Bundle'],
      };
      
      server.use(
        rest.get(`${config.apiBaseUrl}/api/exam-sessions-subjects-products/current/default-search-data/`, (req, res, ctx) => {
          return res(ctx.json(mockResponse));
        })
      );
      
      const store = createTestStore();
      
      const result = await store.dispatch(
        catalogApi.endpoints.getDefaultSearchData.initiate()
      );
      
      expect(result.data).toEqual(mockResponse);
    });
    
  });
  
  describe('caching behavior', () => {
    
    it('should cache identical search requests', async () => {
      let requestCount = 0;
      
      server.use(
        rest.post(`${config.apiBaseUrl}/api/exam-sessions-subjects-products/search/`, (req, res, ctx) => {
          requestCount++;
          return res(ctx.json({
            products: [],
            filter_counts: {},
            pagination: { page: 1, page_size: 20, total_count: 0 },
          }));
        })
      );
      
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
      
      expect(requestCount).toBe(1); // Should only make one request due to caching
    });
    
    it('should make new request for different parameters', async () => {
      let requestCount = 0;
      
      server.use(
        rest.post(`${config.apiBaseUrl}/api/exam-sessions-subjects-products/search/`, (req, res, ctx) => {
          requestCount++;
          return res(ctx.json({
            products: [],
            filter_counts: {},
            pagination: { page: 1, page_size: 20, total_count: 0 },
          }));
        })
      );
      
      const store = createTestStore();
      
      // Make first request
      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate({ filters: { subjects: ['CM2'] } })
      );
      
      // Make second request with different parameters
      await store.dispatch(
        catalogApi.endpoints.unifiedSearch.initiate({ filters: { subjects: ['SA1'] } })
      );
      
      expect(requestCount).toBe(2); // Should make two separate requests
    });
    
  });
  
});