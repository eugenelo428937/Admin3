/**
 * MSW (Mock Service Worker) Handlers for Integration Tests (Story 1.16)
 *
 * Intercepts API requests and returns mock data for testing.
 * Supports filtering by query parameters to simulate real API behavior.
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  mockProducts,
  mockSubjects,
  mockCategories,
  mockFilterCounts,
  filterProducts,
  calculateFilterCounts,
  createMockApiResponse,
} from './mockData';

/**
 * Parse filter parameters from URL search params
 */
const parseFilterParams = (searchParams) => {
  const filters = {
    subjects: [],
    categories: [],
    product_types: [],
    products: [],
    modes_of_delivery: [],
    searchQuery: '',
  };

  // Parse indexed subject parameters (subject_code, subject_1, subject_2, ...)
  const subjectCode = searchParams.get('subject_code');
  if (subjectCode) filters.subjects.push(subjectCode);

  let i = 1;
  while (searchParams.has(`subject_${i}`)) {
    filters.subjects.push(searchParams.get(`subject_${i}`));
    i++;
  }

  // Parse indexed category parameters (category_code, category_1, category_2, ...)
  const categoryCode = searchParams.get('category_code');
  if (categoryCode) filters.categories.push(categoryCode);

  i = 1;
  while (searchParams.has(`category_${i}`)) {
    filters.categories.push(searchParams.get(`category_${i}`));
    i++;
  }

  // Parse comma-separated product types (group=TYPE1,TYPE2)
  const group = searchParams.get('group');
  if (group) {
    filters.product_types = group.split(',').map(t => t.trim());
  }

  // Parse comma-separated products (product=ID1,ID2)
  const product = searchParams.get('product');
  if (product) {
    filters.products = product.split(',').map(p => p.trim());
  }

  // Parse comma-separated modes of delivery (mode_of_delivery=MODE1,MODE2)
  const modeOfDelivery = searchParams.get('mode_of_delivery');
  if (modeOfDelivery) {
    filters.modes_of_delivery = modeOfDelivery.split(',').map(m => m.trim());
  }

  // Parse search query
  const searchQuery = searchParams.get('search_query') || searchParams.get('q') || searchParams.get('search');
  if (searchQuery) {
    filters.searchQuery = searchQuery;
  }

  return filters;
};

/**
 * Default MSW handlers
 */
export const handlers = [
  // GET /api/products/ - Unified search endpoint
  http.get('/api/products/', ({ request }) => {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse filters from query parameters
    const filters = parseFilterParams(searchParams);

    // Filter products
    const filteredProducts = filterProducts(mockProducts, filters);

    // Calculate filter counts
    const filterCounts = calculateFilterCounts(filteredProducts);

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '20', 10);

    // Paginate results
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    // Create response
    const response = createMockApiResponse(
      paginatedProducts,
      filterCounts,
      {
        page,
        page_size: pageSize,
        total_count: filteredProducts.length,
        has_next: endIndex < filteredProducts.length,
        has_previous: page > 1,
      }
    );

    return HttpResponse.json(response);
  }),

  // GET /api/subjects/ - Subject list endpoint
  http.get('/api/subjects/', () => {
    return HttpResponse.json({ results: mockSubjects });
  }),

  // GET /api/categories/ - Category list endpoint
  http.get('/api/categories/', () => {
    return HttpResponse.json({ results: mockCategories });
  }),
];

/**
 * MSW Server instance
 */
export const server = setupServer(...handlers);

/**
 * Start MSW server before all tests
 */
export const setupMockServer = () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
};

/**
 * Configure custom handlers for specific test scenarios
 *
 * @param {Object} options - Configuration options
 * @param {Array} options.products - Custom product data
 * @param {Array} options.subjects - Custom subject data
 * @param {Array} options.categories - Custom category data
 * @param {number} options.delay - Network delay in ms
 * @param {number} options.errorRate - Fraction of requests that fail (0-1)
 */
export const configureMockHandlers = (options = {}) => {
  const {
    products = mockProducts,
    subjects = mockSubjects,
    categories = mockCategories,
    delay = 0,
    errorRate = 0,
  } = options;

  // Products handler with custom data
  const productsHandler = http.get('/api/products/', async ({ request }) => {
    // Simulate network delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Simulate random errors
    if (errorRate > 0 && Math.random() < errorRate) {
      return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse filters
    const filters = parseFilterParams(searchParams);

    // Filter products
    const filteredProducts = filterProducts(products, filters);

    // Calculate filter counts
    const filterCounts = calculateFilterCounts(filteredProducts);

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '20', 10);

    // Paginate results
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    // Create response
    const response = createMockApiResponse(
      paginatedProducts,
      filterCounts,
      {
        page,
        page_size: pageSize,
        total_count: filteredProducts.length,
        has_next: endIndex < filteredProducts.length,
        has_previous: page > 1,
      }
    );

    return HttpResponse.json(response);
  });

  // Subjects handler with custom data
  const subjectsHandler = http.get('/api/subjects/', () => {
    return HttpResponse.json({ results: subjects });
  });

  // Categories handler with custom data
  const categoriesHandler = http.get('/api/categories/', () => {
    return HttpResponse.json({ results: categories });
  });

  // Apply custom handlers
  server.use(productsHandler, subjectsHandler, categoriesHandler);
};

/**
 * Reset handlers to defaults
 */
export const resetMockHandlers = () => {
  server.resetHandlers();
};
