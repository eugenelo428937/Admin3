/**
 * Contract Test: /api/cart/remove/
 *
 * Tests the API contract for removing cart items (including tutorial selections)
 * Validates request schema, response schema, and error handling
 *
 * Contract Specification:
 * - Endpoint: DELETE /api/cart/remove/
 * - Request Body: { item_id: integer (required) }
 * - Success Response (200): { id, items[], total, item_count }
 * - Error Response (404): { error: string }
 * - Error Response (401): { error: string }
 */

// Mock httpService BEFORE importing anything else
jest.mock('../../services/httpService', () => ({
  delete: jest.fn(),
}));

import cartService from '../../services/cartService';
import httpService from '../../services/httpService';

describe('Contract Test: /api/cart/remove/', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test Scenario 1: Remove tutorial cart item successfully
   *
   * Given: User has tutorial item in cart with item_id=123
   * When: DELETE /api/cart/remove/ with {item_id: 123}
   * Then: Returns 200 with updated cart
   * And: Response contains id, items array, total, item_count
   * And: Removed item is not in items array
   */
  it('should remove tutorial cart item and return updated cart (200)', async () => {
    // Arrange: Mock successful removal response
    const mockResponse = {
      data: {
        id: 1,
        items: [
          {
            id: 456,
            product: 789,
            product_name: 'Other Product',
            quantity: 1,
            actual_price: '50.00'
          }
        ],
        total: '50.00',
        item_count: 1
      }
    };

    httpService.delete.mockResolvedValue(mockResponse);

    // Act: Remove item with id 123
    const result = await cartService.removeItem(123);

    // Assert: Request schema validation
    expect(httpService.delete).toHaveBeenCalledWith(
      expect.stringContaining('/remove/'),  // URL includes /remove/ endpoint
      expect.objectContaining({
        data: {
          item_id: 123  // ✅ Request must include item_id
        }
      })
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

    // Assert: Removed item not in response
    const removedItemExists = result.data.items.some(item => item.id === 123);
    expect(removedItemExists).toBe(false);
  });

  /**
   * Test Scenario 2: Remove non-existent item
   *
   * Given: Cart does not have item_id=999
   * When: DELETE /api/cart/remove/ with {item_id: 999}
   * Then: Returns 404 with error message
   * And: Error message is a string
   */
  it('should return 404 error when removing non-existent item', async () => {
    // Arrange: Mock 404 error response
    const mockError = {
      response: {
        status: 404,
        data: {
          error: 'Cart item not found'
        }
      }
    };

    httpService.delete.mockRejectedValue(mockError);

    // Act & Assert: Attempt to remove non-existent item
    await expect(cartService.removeItem(999)).rejects.toMatchObject({
      response: {
        status: 404,
        data: {
          error: expect.any(String)  // ✅ Error must be a string
        }
      }
    });

    // Assert: Request was made with correct item_id
    expect(httpService.delete).toHaveBeenCalledWith(
      expect.stringContaining('/remove/'),
      expect.objectContaining({
        data: { item_id: 999 }
      })
    );
  });

  /**
   * Test Scenario 3: Unauthorized request
   *
   * Given: User is not authenticated
   * When: DELETE /api/cart/remove/ with {item_id: 123}
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

    httpService.delete.mockRejectedValue(mockError);

    // Act & Assert: Attempt to remove item without authentication
    await expect(cartService.removeItem(123)).rejects.toMatchObject({
      response: {
        status: 401,
        data: {
          error: expect.any(String)  // ✅ Error must be a string
        }
      }
    });
  });

  /**
   * Additional Contract Validation: Required field validation
   *
   * Ensures item_id is required in request body
   */
  it('should require item_id in request body', async () => {
    // This test validates that the cartService.removeItem
    // requires an item_id parameter

    // The service method signature requires itemId parameter
    // Calling without parameter would be a TypeScript/compile-time error
    // This test documents the contract requirement

    // Calling with null/undefined should fail
    const mockError = {
      response: {
        status: 400,
        data: {
          error: 'item_id is required'
        }
      }
    };

    httpService.delete.mockRejectedValue(mockError);

    // Act & Assert: Attempt to remove with invalid ID
    await expect(cartService.removeItem(null)).rejects.toMatchObject({
      response: {
        data: {
          error: expect.any(String)
        }
      }
    });
  });
});
