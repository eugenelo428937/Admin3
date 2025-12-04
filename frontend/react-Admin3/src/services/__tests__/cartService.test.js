/**
 * Tests for cartService
 *
 * @module services/__tests__/cartService.test
 *
 * Tests cart operations including:
 * - fetchCart: Fetch current cart
 * - addToCart: Add product to cart
 * - updateItem: Update cart item
 * - removeItem: Remove cart item
 * - clearCart: Clear all cart items
 * - checkout: Complete checkout
 * - fetchOrders: Fetch user orders
 */

// Unmock cartService to test the actual implementation (global mock in setupTests.js)
jest.unmock('../cartService');

describe('cartService', () => {
  let cartService;
  let httpService;

  beforeEach(() => {
    // Reset modules to get fresh instances
    jest.resetModules();

    // Mock config
    jest.doMock('../../config', () => ({
      __esModule: true,
      default: {
        cartUrl: 'http://test-api/cart',
      },
    }));

    // Mock httpService with controllable mocks
    jest.doMock('../httpService', () => ({
      __esModule: true,
      default: {
        get: jest.fn(),
        post: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
      },
    }));

    // Import after mocks are set up
    cartService = require('../cartService').default;
    httpService = require('../httpService').default;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchCart', () => {
    test('should fetch current cart', async () => {
      const mockCartResponse = {
        data: {
          id: 1,
          items: [
            { id: 101, product_id: 1, quantity: 1, price: 50.00 },
            { id: 102, product_id: 2, quantity: 2, price: 30.00 },
          ],
          total: 110.00,
        },
      };
      httpService.get.mockResolvedValue(mockCartResponse);

      const result = await cartService.fetchCart();

      expect(result).toEqual(mockCartResponse);
      expect(httpService.get).toHaveBeenCalledWith('http://test-api/cart');
    });

    test('should handle empty cart', async () => {
      const mockEmptyCart = {
        data: { id: 1, items: [], total: 0 },
      };
      httpService.get.mockResolvedValue(mockEmptyCart);

      const result = await cartService.fetchCart();

      expect(result.data.items).toHaveLength(0);
      expect(result.data.total).toBe(0);
    });

    test('should propagate API errors', async () => {
      const mockError = new Error('Network error');
      httpService.get.mockRejectedValue(mockError);

      await expect(cartService.fetchCart()).rejects.toThrow('Network error');
    });
  });

  describe('addToCart', () => {
    const mockProduct = {
      id: 1,
      essp_id: 101,
      name: 'Test Product',
    };

    test('should add product to cart with default quantity', async () => {
      const mockResponse = { data: { success: true, item_id: 1 } };
      httpService.post.mockResolvedValue(mockResponse);

      const result = await cartService.addToCart(mockProduct);

      expect(result).toEqual(mockResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/cart/add/',
        {
          current_product: 101,
          quantity: 1,
          price_type: 'standard',
          actual_price: undefined,
          metadata: {
            variationId: undefined,
            variationName: undefined,
            variationType: undefined,
            is_digital: false,
            is_marking: false,
            is_material: false,
            is_tutorial: false,
          },
        }
      );
    });

    test('should add product with specific quantity', async () => {
      const mockResponse = { data: { success: true } };
      httpService.post.mockResolvedValue(mockResponse);

      await cartService.addToCart(mockProduct, 3);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/cart/add/',
        expect.objectContaining({ quantity: 3 })
      );
    });

    test('should add product with price info', async () => {
      const mockResponse = { data: { success: true } };
      httpService.post.mockResolvedValue(mockResponse);

      const priceInfo = {
        priceType: 'retaker',
        actualPrice: 40.00,
        metadata: { source: 'bundle' },
      };

      await cartService.addToCart(mockProduct, 1, priceInfo);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/cart/add/',
        {
          current_product: 101,
          quantity: 1,
          price_type: 'retaker',
          actual_price: 40.00,
          metadata: {
            source: 'bundle',
            variationId: undefined,
            variationName: undefined,
            variationType: undefined,
            is_digital: false,
            is_marking: false,
            is_material: false,
            is_tutorial: false,
          },
        }
      );
    });

    test('should auto-promote top-level variation fields to metadata and derive flags', async () => {
      const mockResponse = { data: { success: true } };
      httpService.post.mockResolvedValue(mockResponse);

      // This is how MaterialProductCard currently passes variation info (at top level)
      const priceInfo = {
        variationId: 123,
        variationName: 'eBook',
        variationType: 'eBook',
        priceType: 'standard',
        actualPrice: 49.99,
      };

      await cartService.addToCart(mockProduct, 1, priceInfo);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/cart/add/',
        {
          current_product: 101,
          quantity: 1,
          price_type: 'standard',
          actual_price: 49.99,
          metadata: {
            variationId: 123,
            variationName: 'eBook',
            variationType: 'eBook',
            is_digital: true,  // Derived from variationType 'eBook'
            is_marking: false,
            is_material: true, // Derived from variationType 'eBook'
            is_tutorial: false,
          },
        }
      );
    });

    test('should preserve metadata flags over derived flags', async () => {
      const mockResponse = { data: { success: true } };
      httpService.post.mockResolvedValue(mockResponse);

      // When flags are in BOTH places, metadata should take precedence
      const priceInfo = {
        variationId: 999, // Top-level (should be ignored)
        variationName: 'Printed', // Top-level (should be ignored)
        priceType: 'standard',
        actualPrice: 79.99,
        metadata: {
          variationId: 123, // In metadata (should be used)
          variationName: 'eBook', // In metadata (should be used)
          variationType: 'eBook',
          is_digital: true, // Explicit flag takes precedence
        },
      };

      await cartService.addToCart(mockProduct, 1, priceInfo);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/cart/add/',
        {
          current_product: 101,
          quantity: 1,
          price_type: 'standard',
          actual_price: 79.99,
          metadata: {
            variationId: 123, // From metadata, not top-level
            variationName: 'eBook', // From metadata, not top-level
            variationType: 'eBook',
            is_digital: true, // From metadata (explicit)
            is_marking: false, // Derived
            is_material: true, // Derived from variationType
            is_tutorial: false, // Derived
          },
        }
      );
    });

    test('should derive is_marking flag from product type', async () => {
      const mockResponse = { data: { success: true } };
      httpService.post.mockResolvedValue(mockResponse);

      const markingProduct = {
        id: 200,
        essp_id: 200,
        type: 'Markings',
        name: 'CM2 Marking',
      };

      await cartService.addToCart(markingProduct, 1, {});

      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/cart/add/',
        expect.objectContaining({
          metadata: expect.objectContaining({
            is_marking: true,
            is_digital: false,
            is_material: false,
            is_tutorial: false,
          }),
        })
      );
    });

    test('should derive is_tutorial flag from product type', async () => {
      const mockResponse = { data: { success: true } };
      httpService.post.mockResolvedValue(mockResponse);

      const tutorialProduct = {
        id: 300,
        essp_id: 300,
        type: 'Tutorial',
        name: 'CM2 Tutorial - London',
      };

      await cartService.addToCart(tutorialProduct, 1, {});

      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/cart/add/',
        expect.objectContaining({
          metadata: expect.objectContaining({
            is_tutorial: true,
            is_marking: false,
          }),
        })
      );
    });

    test('should derive is_digital flag from online classroom product name', async () => {
      const mockResponse = { data: { success: true } };
      httpService.post.mockResolvedValue(mockResponse);

      const onlineClassroomProduct = {
        id: 400,
        essp_id: 400,
        type: 'Materials',
        product_name: 'CM2 Online Classroom',
      };

      await cartService.addToCart(onlineClassroomProduct, 1, {});

      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/cart/add/',
        expect.objectContaining({
          metadata: expect.objectContaining({
            is_digital: true,
          }),
        })
      );
    });

    test('should use product id when essp_id not available', async () => {
      const productWithoutEssp = { id: 1, name: 'Test Product' };
      const mockResponse = { data: { success: true } };
      httpService.post.mockResolvedValue(mockResponse);

      await cartService.addToCart(productWithoutEssp);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/cart/add/',
        expect.objectContaining({ current_product: 1 })
      );
    });

    test('should handle API errors', async () => {
      const mockError = new Error('Product unavailable');
      httpService.post.mockRejectedValue(mockError);

      await expect(cartService.addToCart(mockProduct)).rejects.toThrow('Product unavailable');
    });
  });

  describe('updateItem', () => {
    test('should update cart item with default values', async () => {
      const mockResponse = { data: { success: true } };
      httpService.patch.mockResolvedValue(mockResponse);

      const result = await cartService.updateItem(101);

      expect(result).toEqual(mockResponse);
      expect(httpService.patch).toHaveBeenCalledWith(
        'http://test-api/cart/update_item/',
        {
          item_id: 101,
          quantity: 1,
          price_type: 'standard',
          actual_price: undefined,
          metadata: {
            variationId: undefined,
            variationName: undefined,
            variationType: undefined,
            is_digital: false,
            is_marking: false,
            is_material: false,
            is_tutorial: false,
          },
        }
      );
    });

    test('should update cart item with product quantity', async () => {
      const mockResponse = { data: { success: true } };
      httpService.patch.mockResolvedValue(mockResponse);

      const product = { quantity: 5 };
      await cartService.updateItem(101, product);

      expect(httpService.patch).toHaveBeenCalledWith(
        'http://test-api/cart/update_item/',
        expect.objectContaining({ quantity: 5 })
      );
    });

    test('should update cart item with price info', async () => {
      const mockResponse = { data: { success: true } };
      httpService.patch.mockResolvedValue(mockResponse);

      const priceInfo = {
        priceType: 'additional',
        actualPrice: 25.00,
        metadata: { updated: true },
      };
      await cartService.updateItem(101, null, priceInfo);

      expect(httpService.patch).toHaveBeenCalledWith(
        'http://test-api/cart/update_item/',
        {
          item_id: 101,
          quantity: 1,
          price_type: 'additional',
          actual_price: 25.00,
          metadata: {
            updated: true,
            variationId: undefined,
            variationName: undefined,
            variationType: undefined,
            is_digital: false,
            is_marking: false,
            is_material: false,
            is_tutorial: false,
          },
        }
      );
    });

    test('should auto-promote top-level variation fields and derive flags in updateItem', async () => {
      const mockResponse = { data: { success: true } };
      httpService.patch.mockResolvedValue(mockResponse);

      const priceInfo = {
        variationId: 456,
        variationName: 'Hub',
        variationType: 'Hub',
        priceType: 'standard',
        actualPrice: 99.99,
      };
      await cartService.updateItem(101, { quantity: 2 }, priceInfo);

      expect(httpService.patch).toHaveBeenCalledWith(
        'http://test-api/cart/update_item/',
        {
          item_id: 101,
          quantity: 2,
          price_type: 'standard',
          actual_price: 99.99,
          metadata: {
            variationId: 456,
            variationName: 'Hub',
            variationType: 'Hub',
            is_digital: true,  // Hub is digital
            is_marking: false,
            is_material: false, // Hub is not material (no printed/ebook)
            is_tutorial: false,
          },
        }
      );
    });

    test('should handle API errors', async () => {
      const mockError = new Error('Item not found');
      httpService.patch.mockRejectedValue(mockError);

      await expect(cartService.updateItem(999)).rejects.toThrow('Item not found');
    });
  });

  describe('removeItem', () => {
    test('should remove item from cart', async () => {
      const mockResponse = { data: { success: true } };
      httpService.delete.mockResolvedValue(mockResponse);

      const result = await cartService.removeItem(101);

      expect(result).toEqual(mockResponse);
      expect(httpService.delete).toHaveBeenCalledWith(
        'http://test-api/cart/remove/',
        { data: { item_id: 101 } }
      );
    });

    test('should handle API errors', async () => {
      const mockError = new Error('Item not found');
      httpService.delete.mockRejectedValue(mockError);

      await expect(cartService.removeItem(999)).rejects.toThrow('Item not found');
    });
  });

  describe('clearCart', () => {
    test('should clear all cart items', async () => {
      const mockResponse = { data: { success: true, items_removed: 5 } };
      httpService.post.mockResolvedValue(mockResponse);

      const result = await cartService.clearCart();

      expect(result).toEqual(mockResponse);
      expect(httpService.post).toHaveBeenCalledWith('http://test-api/cart/clear/');
    });

    test('should handle API errors', async () => {
      const mockError = new Error('Clear cart failed');
      httpService.post.mockRejectedValue(mockError);

      await expect(cartService.clearCart()).rejects.toThrow('Clear cart failed');
    });
  });

  describe('checkout', () => {
    test('should complete checkout without payment data', async () => {
      const mockResponse = { data: { success: true, order_id: 12345 } };
      httpService.post.mockResolvedValue(mockResponse);

      const result = await cartService.checkout();

      expect(result).toEqual(mockResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/cart/checkout/',
        {}
      );
    });

    test('should complete checkout with payment data', async () => {
      const mockResponse = { data: { success: true, order_id: 12345 } };
      httpService.post.mockResolvedValue(mockResponse);

      const paymentData = {
        payment_method: 'card',
        token: 'tok_test_123',
      };
      const result = await cartService.checkout(paymentData);

      expect(result).toEqual(mockResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/cart/checkout/',
        paymentData
      );
    });

    test('should handle payment errors', async () => {
      const mockError = new Error('Payment declined');
      httpService.post.mockRejectedValue(mockError);

      await expect(cartService.checkout({ token: 'invalid' })).rejects.toThrow('Payment declined');
    });
  });

  describe('fetchOrders', () => {
    test('should fetch user orders', async () => {
      const mockOrdersResponse = {
        data: [
          { id: 1, status: 'completed', total: 100.00 },
          { id: 2, status: 'pending', total: 50.00 },
        ],
      };
      httpService.get.mockResolvedValue(mockOrdersResponse);

      const result = await cartService.fetchOrders();

      expect(result).toEqual(mockOrdersResponse);
      expect(httpService.get).toHaveBeenCalledWith('http://test-api/cart/orders/');
    });

    test('should handle empty orders list', async () => {
      const mockEmptyOrders = { data: [] };
      httpService.get.mockResolvedValue(mockEmptyOrders);

      const result = await cartService.fetchOrders();

      expect(result.data).toHaveLength(0);
    });

    test('should handle API errors', async () => {
      const mockError = new Error('Orders fetch failed');
      httpService.get.mockRejectedValue(mockError);

      await expect(cartService.fetchOrders()).rejects.toThrow('Orders fetch failed');
    });
  });
});
