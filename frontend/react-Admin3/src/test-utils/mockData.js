/**
 * Mock data factory functions for testing
 * Provides realistic test data for User, Product, Cart, Order entities
 */

export const mockUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  isActive: true,
  ...overrides,
});

export const mockProduct = (overrides = {}) => ({
  id: 1,
  name: 'Test Product',
  description: 'A test product description',
  price: 49.99,
  category: 'Test Category',
  subjectCode: 'CM2',
  producttype: 'Core Study Material',
  modeOfDelivery: 'PRINTED',
  active: true,
  ...overrides,
});

export const mockProductVariation = (overrides = {}) => ({
  id: 1,
  productId: 1,
  variationType: 'FORMAT',
  variationValue: 'PRINTED',
  price: 49.99,
  active: true,
  ...overrides,
});

export const mockCartItem = (overrides = {}) => ({
  id: 1,
  productId: 1,
  productName: 'Test Product',
  quantity: 1,
  price: 49.99,
  subtotal: 49.99,
  ...overrides,
});

export const mockCart = (overrides = {}) => ({
  id: 1,
  items: [mockCartItem()],
  subtotal: 49.99,
  tax: 9.00,
  total: 58.99,
  itemCount: 1,
  ...overrides,
});

export const mockOrder = (overrides = {}) => ({
  id: 1,
  orderNumber: 'ORD-2024-0001',
  userId: 1,
  items: [mockCartItem()],
  subtotal: 49.99,
  tax: 9.00,
  total: 58.99,
  status: 'PENDING',
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const mockSubject = (overrides = {}) => ({
  id: 1,
  code: 'CM2',
  name: 'Actuarial Mathematics CM2',
  description: 'Core subject for actuarial exams',
  active: true,
  ...overrides,
});

export const mockExamSession = (overrides = {}) => ({
  id: 1,
  name: 'April 2024',
  startDate: '2024-04-01',
  endDate: '2024-04-30',
  registrationDeadline: '2024-03-15',
  active: true,
  ...overrides,
});

export const mockAddress = (overrides = {}) => ({
  id: 1,
  addressLine1: '123 Test Street',
  addressLine2: 'Apt 4',
  city: 'Test City',
  state: 'TS',
  postalCode: '12345',
  country: 'Test Country',
  ...overrides,
});

// Bulk data generators
export const mockProductList = (count = 5, overrides = {}) =>
  Array.from({ length: count }, (_, i) =>
    mockProduct({ id: i + 1, name: , ...overrides })
  );

export const mockCartItems = (count = 3, overrides = {}) =>
  Array.from({ length: count }, (_, i) =>
    mockCartItem({ id: i + 1, productName: , ...overrides })
  );

// Pagination response helper
export const mockPaginatedResponse = (data, overrides = {}) => ({
  results: data,
  count: data.length,
  next: null,
  previous: null,
  ...overrides,
});
