import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  mockProductList,
  mockProduct,
  mockCart,
  mockOrder,
  mockUser,
  mockPaginatedResponse,
} from './mockData';

// Define API base URL (match your actual API)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8888/api';

// MSW Request Handlers
export const handlers = [
  // Products API
  http.get(`${API_BASE}/products/`, () => {
    return HttpResponse.json(mockPaginatedResponse(mockProductList(10)));
  }),

  http.get(`${API_BASE}/products/:id/`, ({ params }) => {
    return HttpResponse.json(mockProduct({ id: parseInt(params.id) }));
  }),

  // Cart API
  http.get(`${API_BASE}/cart/`, () => {
    return HttpResponse.json(mockCart());
  }),

  http.post(`${API_BASE}/cart/add/`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockCart(),
      itemCount: 2,
      subtotal: 99.98,
      total: 107.98,
    });
  }),

  // Orders API
  http.post(`${API_BASE}/orders/`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(mockOrder());
  }),

  // Auth API
  http.post(`${API_BASE}/auth/login/`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      access: 'mock-access-token',
      refresh: 'mock-refresh-token',
      user: mockUser(),
    });
  }),
];

// Setup MSW server for Node environment (Jest/Vitest)
export const server = setupServer(...handlers);

// Error response helpers
export const mockApiError = (message, status = 400) =>
  HttpResponse.json({ error: message }, { status });

export const mockApiErrorHandler = (url, status = 500) =>
  http.get(url, () => mockApiError('Internal server error', status));
