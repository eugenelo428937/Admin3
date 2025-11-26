/**
 * Contract Test: /api/cart/clear/
 *
 * Tests the API contract for clearing all cart items
 * Validates request schema, response schema, and idempotent behavior
 *
 * Contract Specification:
 * - Endpoint: POST /api/cart/clear/
 * - Request Body: {} (empty)
 * - Success Response (200): { id, items: [], total: 0.00, item_count: 0 }
 * - Error Response (401): { error: string }
 */

// Remove global mocks from setupTests.js so we can test the real cartService
jest.unmock('../../services/cartService');

// Mock config before cartService tries to use it
jest.mock('../../config', () => ({
  __esModule: true,
  default: {
    cartUrl: '/api/cart'
  }
}));

// Mock httpService with our test-specific implementation
jest.mock('../../services/httpService', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  }
}));

// Import the REAL cartService (after unmocking)
import cartService from '../../services/cartService';
// Import the mocked httpService
import httpService from '../../services/httpService';

describe('Contract Test: /api/cart/clear/', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test Scenario 1: Clear cart with items
   *
   * Given: Cart has 3 items (2 tutorials + 1 book)
   * When: POST /api/cart/clear/
   * Then: Returns 200 with empty cart
   * And: Response contains id, items: [], total: 0, item_count: 0
   * And: items array is empty
   */
  it('should clear cart with multiple items and return empty cart (200)', async () => {
    // Arrange: Mock successful clear response
    const mockResponse = {
      data: {
        id: 1,
        items: [],  // ✅ Empty after clearing
        total: '0.00',
        item_count: 0
      }
    };

    httpService.post.mockResolvedValue(mockResponse);

    // Act: Clear cart
    const result = await cartService.clearCart();

    // Assert: Request schema validation
    expect(httpService.post).toHaveBeenCalledWith(
      expect.stringContaining('/clear/')
    );

    // Assert: Response schema validation
    expect(result.data).toHaveProperty('id');
    expect(result.data).toHaveProperty('items');
    expect(result.data).toHaveProperty('total');
    expect(result.data).toHaveProperty('item_count');

    // Assert: Response structure validation
    expect(typeof result.data.id).toBe('number');
    expect(Array.isArray(result.data.items)).toBe(true);
    expect(typeof result.data.total).toBe('string');
    expect(typeof result.data.item_count).toBe('number');

    // Assert: Cart is empty
    expect(result.data.items).toHaveLength(0);
    expect(result.data.total).toBe('0.00');
    expect(result.data.item_count).toBe(0);
  });

  /**
   * Test Scenario 2: Clear already empty cart (idempotent)
   *
   * Given: Cart already has 0 items
   * When: POST /api/cart/clear/
   * Then: Returns 200 with empty cart (no error)
   * And: Operation is idempotent (safe to call multiple times)
   */
  it('should clear already empty cart successfully (idempotent)', async () => {
    // Arrange: Mock response for already empty cart
    const mockResponse = {
      data: {
        id: 1,
        items: [],
        total: '0.00',
        item_count: 0
      }
    };

    httpService.post.mockResolvedValue(mockResponse);

    // Act: Clear empty cart
    const result = await cartService.clearCart();

    // Assert: Request made successfully
    expect(httpService.post).toHaveBeenCalledWith(
      expect.stringContaining('/clear/')
    );

    // Assert: Returns success (idempotent)
    expect(result.data.items).toHaveLength(0);
    expect(result.data.item_count).toBe(0);

    // Act: Clear again (idempotent test)
    await cartService.clearCart();

    // Assert: Can be called multiple times safely
    expect(httpService.post).toHaveBeenCalledTimes(2);
  });

  /**
   * Test Scenario 3: Unauthorized request
   *
   * Given: User is not authenticated
   * When: POST /api/cart/clear/
   * Then: Returns 401 with error message
   * And: Error indicates authentication failure
   */
  it('should return 401 error when user is not authenticated', async () => {
    // Arrange: Mock 401 unauthorized response
    const mockError = {
      response: {
        status: 401,
        data: {
          error: 'Authentication credentials were not provided'
        }
      }
    };

    httpService.post.mockRejectedValue(mockError);

    // Act & Assert: Attempt to clear cart without authentication
    await expect(cartService.clearCart()).rejects.toMatchObject({
      response: {
        status: 401,
        data: {
          error: expect.any(String)  // ✅ Error must be a string
        }
      }
    });

    // Assert: Request was attempted
    expect(httpService.post).toHaveBeenCalledWith(
      expect.stringContaining('/clear/')
    );
  });

  /**
   * Additional Contract Validation: No request body required
   *
   * Ensures clear cart does not require any request parameters
   */
  it('should not require request body parameters', async () => {
    // Arrange: Mock successful response
    const mockResponse = {
      data: {
        id: 1,
        items: [],
        total: '0.00',
        item_count: 0
      }
    };

    httpService.post.mockResolvedValue(mockResponse);

    // Act: Clear cart (no parameters)
    await cartService.clearCart();

    // Assert: Request made with only URL (no body/params needed)
    expect(httpService.post).toHaveBeenCalledWith(
      expect.stringContaining('/clear/')
    );

    // The cartService.clearCart() method takes no parameters
    // This validates the contract: POST /api/cart/clear/ with empty body
    expect(httpService.post).toHaveBeenCalledTimes(1);
  });
});
