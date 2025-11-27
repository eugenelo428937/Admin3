/**
 * Tests for bundleService
 *
 * @module services/__tests__/bundleService.test
 *
 * Tests bundle operations including:
 * - getAllBundles: Fetch bundles with optional filters
 * - getBundleContents: Fetch bundle contents by ID
 * - processBundleForCart: Process bundle for cart addition
 * - getBundleMetadata: Get bundle metadata
 * - validateBundle: Validate bundle before cart
 * - determineProductType: Determine product type from component
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

import bundleService from '../bundleService';
import httpService from '../httpService';

describe('bundleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllBundles', () => {
    const mockBundlesResponse = {
      data: [
        { id: 1, name: 'Bundle 1', subject: 'CM1' },
        { id: 2, name: 'Bundle 2', subject: 'CM2' },
      ],
    };

    test('should fetch all bundles without filters', async () => {
      httpService.get.mockResolvedValue(mockBundlesResponse);

      const result = await bundleService.getAllBundles();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBundlesResponse.data);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api/products/bundles/',
        { params: {} }
      );
    });

    test('should fetch bundles with examSession filter', async () => {
      httpService.get.mockResolvedValue(mockBundlesResponse);

      const result = await bundleService.getAllBundles({ examSession: 'MAR24' });

      expect(result.success).toBe(true);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api/products/bundles/',
        { params: { exam_session: 'MAR24' } }
      );
    });

    test('should fetch bundles with subject filter', async () => {
      httpService.get.mockResolvedValue(mockBundlesResponse);

      const result = await bundleService.getAllBundles({ subject: 'CM1' });

      expect(result.success).toBe(true);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api/products/bundles/',
        { params: { subject: 'CM1' } }
      );
    });

    test('should fetch bundles with multiple filters', async () => {
      httpService.get.mockResolvedValue(mockBundlesResponse);

      const result = await bundleService.getAllBundles({
        examSession: 'MAR24',
        subject: 'CM1',
      });

      expect(result.success).toBe(true);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api/products/bundles/',
        { params: { exam_session: 'MAR24', subject: 'CM1' } }
      );
    });

    test('should return error on API failure', async () => {
      const mockError = new Error('Network error');
      httpService.get.mockRejectedValue(mockError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await bundleService.getAllBundles();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching bundles:', mockError);
      consoleSpy.mockRestore();
    });
  });

  describe('getBundleContents', () => {
    const mockBundleContents = {
      data: {
        bundle_product: { id: 1, name: 'Test Bundle' },
        components: [
          { id: 101, product_name: 'Product 1' },
          { id: 102, product_name: 'Product 2' },
        ],
        total_components: 2,
      },
    };

    test('should fetch bundle contents by ID', async () => {
      httpService.get.mockResolvedValue(mockBundleContents);

      const result = await bundleService.getBundleContents(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBundleContents.data);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api/products/bundles/1/'
      );
    });

    test('should return error on API failure', async () => {
      const mockError = new Error('Bundle not found');
      httpService.get.mockRejectedValue(mockError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await bundleService.getBundleContents(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bundle not found');
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching bundle contents:', mockError);
      consoleSpy.mockRestore();
    });
  });

  describe('processBundleForCart', () => {
    const mockBundleProduct = {
      id: 1,
      subject_code: 'CM1',
      exam_session_code: 'MAR24',
      shortname: 'Test Bundle',
    };

    const mockBundleContentsResponse = {
      data: {
        bundle_product: {
          id: 1,
          exam_session_code: 'MAR24',
          metadata: { savings: 10 },
        },
        components: [
          {
            exam_session_product_id: 101,
            exam_session_product_code: 'ESSP-101',
            quantity: 1,
            product: { id: 1001, fullname: 'Study Materials' },
            product_variation: { id: 2001, name: 'Printed', variation_type: 'print' },
            prices: [
              { price_type: 'standard', amount: 50.00 },
              { price_type: 'retaker', amount: 40.00 },
            ],
          },
          {
            exam_session_product_id: 102,
            exam_session_product_code: 'ESSP-102',
            quantity: 2,
            product: { id: 1002, fullname: 'Marking Script' },
            product_variation: { id: 2002, name: 'Online', variation_type: 'marking' },
            prices: [
              { price_type: 'standard', amount: 30.00 },
            ],
          },
        ],
      },
    };

    test('should process bundle for cart with standard price type', async () => {
      httpService.get.mockResolvedValue(mockBundleContentsResponse);

      const result = await bundleService.processBundleForCart(mockBundleProduct);

      expect(result.success).toBe(true);
      expect(result.cartItems).toHaveLength(2);
      expect(result.cartItems[0].product.essp_id).toBe(101);
      expect(result.cartItems[0].priceInfo.priceType).toBe('standard');
      expect(result.cartItems[0].priceInfo.actualPrice).toBe(50.00);
      expect(result.cartItems[0].quantity).toBe(1);
      expect(result.cartItems[1].quantity).toBe(2);
    });

    test('should process bundle with retaker price type', async () => {
      httpService.get.mockResolvedValue(mockBundleContentsResponse);

      const result = await bundleService.processBundleForCart(mockBundleProduct, 'retaker');

      expect(result.success).toBe(true);
      expect(result.cartItems[0].priceInfo.priceType).toBe('retaker');
      expect(result.cartItems[0].priceInfo.actualPrice).toBe(40.00);
      // Second component has no retaker price, should fallback to standard
      expect(result.cartItems[1].priceInfo.priceType).toBe('retaker');
      expect(result.cartItems[1].priceInfo.actualPrice).toBe(30.00);
    });

    test('should include bundle metadata in cart items', async () => {
      httpService.get.mockResolvedValue(mockBundleContentsResponse);

      const result = await bundleService.processBundleForCart(mockBundleProduct);

      expect(result.cartItems[0].priceInfo.metadata.addedViaBundle).toBeDefined();
      expect(result.cartItems[0].priceInfo.metadata.addedViaBundle.bundleId).toBe(1);
      expect(result.cartItems[0].priceInfo.metadata.addedViaBundle.bundleName).toBe('Test Bundle');
    });

    test('should return summary information', async () => {
      httpService.get.mockResolvedValue(mockBundleContentsResponse);

      const result = await bundleService.processBundleForCart(mockBundleProduct);

      expect(result.summary).toBeDefined();
      expect(result.summary.totalItems).toBe(2);
      expect(result.summary.uniqueProducts).toBe(2);
      expect(result.summary.bundleMetadata).toEqual({ savings: 10 });
    });

    test('should return error when getBundleContents fails', async () => {
      const mockError = new Error('Bundle fetch failed');
      httpService.get.mockRejectedValue(mockError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await bundleService.processBundleForCart(mockBundleProduct);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      consoleSpy.mockRestore();
    });

    test('should handle component without prices array', async () => {
      const responseWithoutPrices = {
        data: {
          bundle_product: { id: 1, exam_session_code: 'MAR24', metadata: {} },
          components: [
            {
              exam_session_product_id: 101,
              quantity: 1,
              product: { id: 1001, fullname: 'Product' },
              product_variation: { id: 2001, name: 'Variant' },
              prices: null,
            },
          ],
        },
      };
      httpService.get.mockResolvedValue(responseWithoutPrices);

      const result = await bundleService.processBundleForCart(mockBundleProduct);

      expect(result.success).toBe(true);
      expect(result.cartItems[0].priceInfo.actualPrice).toBeNull();
    });
  });

  describe('getBundleMetadata', () => {
    const mockBundleContentsResponse = {
      data: {
        bundle_product: {
          id: 1,
          metadata: { savings: 15, description: 'Save 15%' },
        },
        total_components: 3,
      },
    };

    test('should fetch bundle metadata', async () => {
      httpService.get.mockResolvedValue(mockBundleContentsResponse);

      const result = await bundleService.getBundleMetadata(1);

      expect(result.success).toBe(true);
      expect(result.metadata).toEqual({ savings: 15, description: 'Save 15%' });
      expect(result.componentCount).toBe(3);
    });

    test('should return error on API failure', async () => {
      const mockError = new Error('Metadata fetch failed');
      httpService.get.mockRejectedValue(mockError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await bundleService.getBundleMetadata(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Metadata fetch failed');
      consoleSpy.mockRestore();
    });
  });

  describe('validateBundle', () => {
    const mockBundleProduct = { id: 1, name: 'Test Bundle' };

    test('should validate bundle with valid components', async () => {
      const validResponse = {
        data: {
          components: [
            {
              product_name: 'Product 1',
              variations: [
                { id: 1, prices: [{ price_type: 'standard', amount: 50 }] },
              ],
            },
          ],
        },
      };
      httpService.get.mockResolvedValue(validResponse);

      const result = await bundleService.validateBundle(mockBundleProduct);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.componentCount).toBe(1);
    });

    test('should warn when component has no variations', async () => {
      const noVariationsResponse = {
        data: {
          components: [
            { product_name: 'Product 1', variations: [] },
          ],
        },
      };
      httpService.get.mockResolvedValue(noVariationsResponse);

      const result = await bundleService.validateBundle(mockBundleProduct);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Product 1 has no available variations');
    });

    test('should error when component has no valid prices', async () => {
      const noPricesResponse = {
        data: {
          components: [
            {
              product_name: 'Product 1',
              variations: [{ id: 1, prices: [] }],
            },
          ],
        },
      };
      httpService.get.mockResolvedValue(noPricesResponse);

      const result = await bundleService.validateBundle(mockBundleProduct);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Product 1 has no valid pricing information');
    });

    test('should return error when getBundleContents fails', async () => {
      const mockError = new Error('Validation failed');
      httpService.get.mockRejectedValue(mockError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await bundleService.validateBundle(mockBundleProduct);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Validation failed');
      consoleSpy.mockRestore();
    });
  });

  describe('determineProductType', () => {
    test('should return Markings for marking variation type', () => {
      const component = {
        product_variation: { variation_type: 'Marking' },
        product: { fullname: 'Some Product' },
      };

      expect(bundleService.determineProductType(component)).toBe('Markings');
    });

    test('should return Markings for product name containing marking', () => {
      const component = {
        product_variation: { variation_type: 'other' },
        product: { fullname: 'Marking Script CM1' },
      };

      expect(bundleService.determineProductType(component)).toBe('Markings');
    });

    test('should return Tutorial for tutorial products', () => {
      const component = {
        product_variation: { variation_type: 'other' },
        product: { fullname: 'Online Tutorial CM1' },
      };

      expect(bundleService.determineProductType(component)).toBe('Tutorial');
    });

    test('should return OnlineClassroom for online classroom products', () => {
      const component = {
        product_variation: { variation_type: 'other' },
        product: { fullname: 'Online Classroom Session' },
      };

      expect(bundleService.determineProductType(component)).toBe('OnlineClassroom');
    });

    test('should return OnlineClassroom for recording products', () => {
      const component = {
        product_variation: { variation_type: 'other' },
        product: { fullname: 'Lecture Recording CM2' },
      };

      expect(bundleService.determineProductType(component)).toBe('OnlineClassroom');
    });

    test('should return Materials as default type', () => {
      const component = {
        product_variation: { variation_type: 'print' },
        product: { fullname: 'Study Notes CM1' },
      };

      expect(bundleService.determineProductType(component)).toBe('Materials');
    });

    test('should handle missing product variation', () => {
      const component = {
        product: { fullname: 'Some Product' },
      };

      expect(bundleService.determineProductType(component)).toBe('Materials');
    });

    test('should handle missing product fullname', () => {
      const component = {
        product_variation: { variation_type: 'print' },
        product: {},
      };

      expect(bundleService.determineProductType(component)).toBe('Materials');
    });
  });
});
