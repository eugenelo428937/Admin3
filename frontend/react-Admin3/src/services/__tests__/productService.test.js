/**
 * Tests for productService
 *
 * @module services/__tests__/productService.test
 */

// MUST be before imports to override setupTests.js global mock
jest.unmock('../productService');

// Mock dependencies BEFORE imports
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
    productsUrl: '/api/products',
    markingUrl: '/api/marking',
    apiBaseUrl: '/api',
    apiUrl: '/api',
  },
}));

import productService from '../productService';
import httpService from '../httpService';

describe('productService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('getAll', () => {
    test('should return products array from results', async () => {
      const mockProducts = [{ id: 1, name: 'Product 1' }];
      httpService.get.mockResolvedValue({ data: { results: mockProducts } });

      const result = await productService.getAll();

      expect(result).toEqual(mockProducts);
      expect(httpService.get).toHaveBeenCalledWith('/api/products/products/', { params: {} });
    });

    test('should return data directly if no results wrapper', async () => {
      const mockProducts = [{ id: 1, name: 'Product 1' }];
      httpService.get.mockResolvedValue({ data: mockProducts });

      const result = await productService.getAll();

      expect(result).toEqual(mockProducts);
    });

    test('should pass params to API', async () => {
      httpService.get.mockResolvedValue({ data: { results: [] } });

      await productService.getAll({ subject: 'CM2' });

      expect(httpService.get).toHaveBeenCalledWith('/api/products/products/', { params: { subject: 'CM2' } });
    });

    test('should throw structured error on failure', async () => {
      httpService.get.mockRejectedValue({
        response: { status: 500, data: { message: 'Server error' } },
      });

      await expect(productService.getAll()).rejects.toEqual({
        message: 'Server error',
        status: 500,
        data: { message: 'Server error' },
      });
    });
  });

  describe('getProductGroupFilters', () => {
    test('should return product group filters', async () => {
      const mockFilters = [{ id: 1, name: 'Filter 1' }];
      httpService.get.mockResolvedValue({ data: { results: mockFilters } });

      const result = await productService.getProductGroupFilters();

      expect(result).toEqual(mockFilters);
      expect(httpService.get).toHaveBeenCalledWith('/api/products/product-group-filters/');
    });

    test('should throw error on failure', async () => {
      httpService.get.mockRejectedValue({ message: 'Network error' });

      await expect(productService.getProductGroupFilters()).rejects.toMatchObject({
        message: 'Network error',
      });
    });
  });

  describe('getNavbarProductGroups', () => {
    test('should return array of product groups', async () => {
      const mockGroups = [{ id: 1, name: 'Group 1' }];
      httpService.get.mockResolvedValue({ data: { results: mockGroups } });

      const result = await productService.getNavbarProductGroups();

      expect(result).toEqual(mockGroups);
      expect(Array.isArray(result)).toBe(true);
    });

    test('should return empty array if data is not an array', async () => {
      httpService.get.mockResolvedValue({ data: { results: 'not an array' } });

      const result = await productService.getNavbarProductGroups();

      expect(result).toEqual([]);
    });

    test('should throw error on failure', async () => {
      httpService.get.mockRejectedValue({ response: { status: 404 } });

      await expect(productService.getNavbarProductGroups()).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('getAvailableProducts', () => {
    test('should return available products with pagination', async () => {
      const mockResponse = { results: [], count: 0, page: 1 };
      httpService.get.mockResolvedValue({ data: mockResponse });

      const result = await productService.getAvailableProducts({}, 1, 50);

      expect(result).toEqual(mockResponse);
      expect(httpService.get).toHaveBeenCalledWith(
        '/api/products/current/list/',
        expect.objectContaining({ params: expect.any(URLSearchParams) })
      );
    });

    test('should include pagination params', async () => {
      httpService.get.mockResolvedValue({ data: {} });

      await productService.getAvailableProducts({}, 2, 25);

      const call = httpService.get.mock.calls[0];
      const params = call[1].params;
      expect(params.get('page')).toBe('2');
      expect(params.get('page_size')).toBe('25');
    });

    test('should throw error on failure', async () => {
      httpService.get.mockRejectedValue({ message: 'Failed' });

      await expect(productService.getAvailableProducts()).rejects.toMatchObject({
        message: 'Failed',
      });
    });
  });

  describe('getById', () => {
    test('should return product by ID', async () => {
      const mockProduct = { id: 123, name: 'Test Product' };
      httpService.get.mockResolvedValue({ data: mockProduct });

      const result = await productService.getById(123);

      expect(result).toEqual(mockProduct);
      expect(httpService.get).toHaveBeenCalledWith('/api/products/123/');
    });

    test('should throw error for non-existent product', async () => {
      httpService.get.mockRejectedValue({
        response: { status: 404, data: { message: 'Not found' } },
      });

      await expect(productService.getById(999)).rejects.toMatchObject({
        message: 'Not found',
        status: 404,
      });
    });
  });

  describe('create', () => {
    test('should create product and return data', async () => {
      const productData = { name: 'New Product', price: 100 };
      const createdProduct = { id: 1, ...productData };
      httpService.post.mockResolvedValue({ data: createdProduct });

      const result = await productService.create(productData);

      expect(result).toEqual(createdProduct);
      expect(httpService.post).toHaveBeenCalledWith('/api/products/', productData);
    });

    test('should throw error on creation failure', async () => {
      httpService.post.mockRejectedValue({
        response: { status: 400, data: { message: 'Validation error' } },
      });

      await expect(productService.create({})).rejects.toMatchObject({
        message: 'Validation error',
        status: 400,
      });
    });
  });

  describe('update', () => {
    test('should update product and return data', async () => {
      const productData = { name: 'Updated Product' };
      const updatedProduct = { id: 1, ...productData };
      httpService.put.mockResolvedValue({ data: updatedProduct });

      const result = await productService.update(1, productData);

      expect(result).toEqual(updatedProduct);
      expect(httpService.put).toHaveBeenCalledWith('/api/products/1/', productData);
    });

    test('should throw error on update failure', async () => {
      httpService.put.mockRejectedValue({
        response: { status: 404, data: { message: 'Not found' } },
      });

      await expect(productService.update(999, {})).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('delete', () => {
    test('should delete product and return success', async () => {
      httpService.delete.mockResolvedValue({});

      const result = await productService.delete(1);

      expect(result).toEqual({ success: true });
      expect(httpService.delete).toHaveBeenCalledWith('/api/products/products/1/');
    });

    test('should throw error on deletion failure', async () => {
      httpService.delete.mockRejectedValue({
        response: { status: 403, data: { message: 'Forbidden' } },
      });

      await expect(productService.delete(1)).rejects.toMatchObject({
        message: 'Forbidden',
        status: 403,
      });
    });
  });

  describe('bulkImport', () => {
    test('should bulk import products', async () => {
      const productsData = [{ name: 'Product 1' }, { name: 'Product 2' }];
      const importResult = { imported: 2, errors: [] };
      httpService.post.mockResolvedValue({ data: importResult });

      const result = await productService.bulkImport(productsData);

      expect(result).toEqual(importResult);
      expect(httpService.post).toHaveBeenCalledWith(
        '/api/products/products/bulk-import/',
        { products: productsData }
      );
    });

    test('should throw error on bulk import failure', async () => {
      httpService.post.mockRejectedValue({
        response: { status: 400, data: { message: 'Invalid data' } },
      });

      await expect(productService.bulkImport([])).rejects.toMatchObject({
        message: 'Invalid data',
      });
    });
  });

  describe('getMarkingDeadlines', () => {
    test('should return marking deadlines for essp', async () => {
      const mockDeadlines = { deadline: '2025-01-01' };
      httpService.get.mockResolvedValue({ data: mockDeadlines });

      const result = await productService.getMarkingDeadlines(123);

      expect(result).toEqual(mockDeadlines);
      expect(httpService.get).toHaveBeenCalledWith('/api/marking/papers/deadlines/?essp_id=123');
    });
  });

  describe('getBulkMarkingDeadlines', () => {
    test('should return bulk marking deadlines', async () => {
      const mockDeadlines = { 1: { deadline: '2025-01-01' } };
      httpService.post.mockResolvedValue({ data: mockDeadlines });

      const result = await productService.getBulkMarkingDeadlines([1, 2, 3]);

      expect(result).toEqual(mockDeadlines);
      expect(httpService.post).toHaveBeenCalledWith(
        '/api/marking/papers/bulk-deadlines/',
        { essp_ids: [1, 2, 3] }
      );
    });
  });

  describe('getDistanceLearningDropdown', () => {
    test('should return distance learning options', async () => {
      const mockOptions = [{ id: 1, name: 'Option 1' }];
      httpService.get.mockResolvedValue({ data: { results: mockOptions } });

      const result = await productService.getDistanceLearningDropdown();

      expect(result).toEqual(mockOptions);
    });

    test('should return empty array if data is not an array', async () => {
      httpService.get.mockResolvedValue({ data: 'invalid' });

      const result = await productService.getDistanceLearningDropdown();

      expect(result).toEqual([]);
    });

    test('should throw error on failure', async () => {
      httpService.get.mockRejectedValue({
        response: { status: 500, data: { message: 'Server error' } },
      });

      await expect(productService.getDistanceLearningDropdown()).rejects.toMatchObject({
        message: 'Server error',
        status: 500,
      });
    });
  });

  describe('getTutorialDropdown', () => {
    test('should return tutorial dropdown options', async () => {
      const mockOptions = [{ id: 1, subject: 'CM2' }];
      httpService.get.mockResolvedValue({ data: { results: mockOptions } });

      const result = await productService.getTutorialDropdown();

      expect(result).toEqual(mockOptions);
    });

    test('should throw error on failure', async () => {
      httpService.get.mockRejectedValue({ message: 'Error' });

      await expect(productService.getTutorialDropdown()).rejects.toMatchObject({
        message: 'Error',
      });
    });
  });

  describe('getBundles', () => {
    test('should return bundles', async () => {
      const mockBundles = [{ id: 1, name: 'Bundle 1' }];
      httpService.get.mockResolvedValue({ data: { results: mockBundles } });

      const result = await productService.getBundles();

      expect(result).toEqual(mockBundles);
      expect(httpService.get).toHaveBeenCalledWith('/api/products/bundles/', { params: {} });
    });

    test('should pass params to API', async () => {
      httpService.get.mockResolvedValue({ data: [] });

      await productService.getBundles({ subject: 'CM2' });

      expect(httpService.get).toHaveBeenCalledWith('/api/products/bundles/', { params: { subject: 'CM2' } });
    });

    test('should throw error on failure', async () => {
      httpService.get.mockRejectedValue({
        response: { status: 500, data: { message: 'Failed to fetch bundles' } },
      });

      await expect(productService.getBundles()).rejects.toMatchObject({
        message: 'Failed to fetch bundles',
        status: 500,
      });
    });
  });

  describe('getProductsAndBundles', () => {
    test('should return combined products and bundles', async () => {
      const mockResponse = {
        results: [{ id: 1 }],
        count: 1,
        products_count: 1,
        bundles_count: 0,
        page: 1,
        has_next: false,
        has_previous: false,
      };
      httpService.get.mockResolvedValue({ data: mockResponse });

      const result = await productService.getProductsAndBundles({}, 1, 50);

      expect(result.results).toEqual([{ id: 1 }]);
      expect(result.count).toBe(1);
    });

    test('should provide defaults for missing fields', async () => {
      httpService.get.mockResolvedValue({ data: {} });

      const result = await productService.getProductsAndBundles();

      expect(result.results).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.has_next).toBe(false);
    });

    test('should throw error on failure', async () => {
      httpService.get.mockRejectedValue({
        response: { status: 500, data: { message: 'Failed to fetch' } },
      });

      // Note: getProductsAndBundles calls getAvailableProducts which processes the error,
      // so the original response structure is lost - status defaults to 0
      await expect(productService.getProductsAndBundles()).rejects.toMatchObject({
        message: 'Failed to fetch',
      });
    });
  });

  describe('getBundleContents', () => {
    test('should return bundle contents', async () => {
      const mockContents = [{ id: 1, product: 'Product 1' }];
      httpService.get.mockResolvedValue({ data: mockContents });

      const result = await productService.getBundleContents(123);

      expect(result).toEqual(mockContents);
      expect(httpService.get).toHaveBeenCalledWith('/api/products/products/123/bundle-contents/');
    });

    test('should throw error on failure', async () => {
      httpService.get.mockRejectedValue({
        response: { status: 404, data: { message: 'Bundle not found' } },
      });

      await expect(productService.getBundleContents(999)).rejects.toMatchObject({
        message: 'Bundle not found',
        status: 404,
      });
    });
  });

  describe('getFilterConfiguration', () => {
    test('should return filter configuration', async () => {
      const mockConfig = { filters: [] };
      httpService.get.mockResolvedValue({ data: mockConfig });

      const result = await productService.getFilterConfiguration();

      expect(result).toEqual(mockConfig);
      expect(httpService.get).toHaveBeenCalledWith('/api/products/filter-configuration/', { params: {} });
    });

    test('should pass filter types as params', async () => {
      httpService.get.mockResolvedValue({ data: {} });

      await productService.getFilterConfiguration(['subject', 'category']);

      expect(httpService.get).toHaveBeenCalledWith(
        '/api/products/filter-configuration/',
        { params: { types: ['subject', 'category'] } }
      );
    });

    test('should throw error on failure', async () => {
      httpService.get.mockRejectedValue({
        response: { status: 500, data: { message: 'Configuration unavailable' } },
      });

      await expect(productService.getFilterConfiguration()).rejects.toMatchObject({
        message: 'Configuration unavailable',
        status: 500,
      });
    });
  });

  describe('getMarkingVouchers', () => {
    test('should return marking vouchers', async () => {
      const mockVouchers = [{ id: 1, code: 'VOUCHER1' }];
      httpService.get.mockResolvedValue({ data: { results: mockVouchers } });

      const result = await productService.getMarkingVouchers();

      expect(result).toEqual(mockVouchers);
    });

    test('should pass params to API', async () => {
      httpService.get.mockResolvedValue({ data: [] });

      await productService.getMarkingVouchers({ status: 'active' });

      expect(httpService.get).toHaveBeenCalledWith('/api/api/marking-vouchers/', { params: { status: 'active' } });
    });

    test('should throw error on failure', async () => {
      httpService.get.mockRejectedValue({
        response: { status: 500, data: { message: 'Failed to fetch vouchers' } },
      });

      await expect(productService.getMarkingVouchers()).rejects.toMatchObject({
        message: 'Failed to fetch vouchers',
        status: 500,
      });
    });
  });

  describe('getMarkingVoucherById', () => {
    test('should return voucher by ID', async () => {
      const mockVoucher = { id: 1, code: 'VOUCHER1' };
      httpService.get.mockResolvedValue({ data: mockVoucher });

      const result = await productService.getMarkingVoucherById(1);

      expect(result).toEqual(mockVoucher);
      expect(httpService.get).toHaveBeenCalledWith('/api/api/marking-vouchers/1/');
    });

    test('should throw error on failure', async () => {
      httpService.get.mockRejectedValue({
        response: { status: 404, data: { message: 'Voucher not found' } },
      });

      await expect(productService.getMarkingVoucherById(999)).rejects.toMatchObject({
        message: 'Voucher not found',
        status: 404,
      });
    });
  });

  describe('addMarkingVoucherToCart', () => {
    test('should add voucher to cart', async () => {
      const mockResponse = { success: true };
      httpService.post.mockResolvedValue({ data: mockResponse });

      const result = await productService.addMarkingVoucherToCart(1, 2);

      expect(result).toEqual(mockResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        '/api/api/marking-vouchers/add-to-cart/',
        { voucher_id: 1, quantity: 2 }
      );
    });

    test('should default quantity to 1', async () => {
      httpService.post.mockResolvedValue({ data: {} });

      await productService.addMarkingVoucherToCart(1);

      expect(httpService.post).toHaveBeenCalledWith(
        '/api/api/marking-vouchers/add-to-cart/',
        { voucher_id: 1, quantity: 1 }
      );
    });

    test('should throw error on failure', async () => {
      httpService.post.mockRejectedValue({
        response: { status: 400, data: { message: 'Voucher unavailable' } },
      });

      await expect(productService.addMarkingVoucherToCart(1)).rejects.toMatchObject({
        message: 'Voucher unavailable',
        status: 400,
      });
    });
  });

  describe('searchProducts', () => {
    test('should return search results', async () => {
      const mockResults = [{ id: 1, name: 'Found Product' }];
      httpService.get.mockResolvedValue({ data: { results: mockResults } });

      const result = await productService.searchProducts({ q: 'test' });

      expect(result.data).toEqual(mockResults);
      expect(httpService.get).toHaveBeenCalledWith('/api/products/search/', { params: { q: 'test' } });
    });

    test('should return empty object if no results', async () => {
      httpService.get.mockResolvedValue({ data: {} });

      const result = await productService.searchProducts();

      // searchProducts returns response.data.results || response.data || []
      // When data is {}, it returns {} (truthy), not []
      expect(result.data).toEqual({});
    });

    test('should throw error on search failure', async () => {
      httpService.get.mockRejectedValue({
        response: { status: 500, data: { message: 'Search failed' } },
      });

      await expect(productService.searchProducts()).rejects.toMatchObject({
        message: 'Search failed',
      });
    });
  });
});
