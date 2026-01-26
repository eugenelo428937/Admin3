/**
 * Tests for useProductCardHelpers hook
 *
 * @module hooks/__tests__/useProductCardHelpers.test
 *
 * Tests product card functionality including:
 * - handleAddToCart: Cart addition operations
 * - allEsspIds: Marking product ID extraction
 * - bulkDeadlines: Deadline fetching for marking products
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import useProductCardHelpers from '../useProductCardHelpers';

// Mock CartContext
const mockAddToCart = jest.fn();
jest.mock('../../contexts/CartContext', () => ({
  useCart: () => ({
    addToCart: mockAddToCart,
  }),
}));

// Mock productService
const mockGetBulkMarkingDeadlines = jest.fn();
jest.mock('../../services/productService', () => ({
  __esModule: true,
  default: {
    getBulkMarkingDeadlines: (...args) => mockGetBulkMarkingDeadlines(...args),
  },
}));

describe('useProductCardHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetBulkMarkingDeadlines.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    test('should initialize with empty bulkDeadlines', () => {
      const { result } = renderHook(() => useProductCardHelpers());

      expect(result.current.bulkDeadlines).toEqual({});
    });

    test('should initialize with empty allEsspIds when no products', () => {
      const { result } = renderHook(() => useProductCardHelpers());

      expect(result.current.allEsspIds).toEqual([]);
    });

    test('should initialize with default empty products array', () => {
      const { result } = renderHook(() => useProductCardHelpers());

      expect(result.current.allEsspIds).toEqual([]);
    });
  });

  describe('allStoreProductIds calculation', () => {
    test('should extract store product id from marking products', () => {
      const products = [
        { id: 101, type: 'Markings' },
        { id: 102, type: 'Markings' },
        { id: 103, type: 'Other' },
      ];

      const { result } = renderHook(() => useProductCardHelpers(products));

      // allEsspIds is kept as alias for backward compatibility
      expect(result.current.allEsspIds).toEqual([101, 102]);
      expect(result.current.allStoreProductIds).toEqual([101, 102]);
    });

    test('should use id as primary store product identifier', () => {
      const products = [
        { id: 1, type: 'Markings' },
        { id: 102, type: 'Markings' },
      ];

      const { result } = renderHook(() => useProductCardHelpers(products));

      expect(result.current.allStoreProductIds).toEqual([1, 102]);
    });

    test('should fallback to product_id when id not available', () => {
      const products = [
        { product_id: 201, type: 'Markings' },
        { product_id: 202, type: 'Markings' },
      ];

      const { result } = renderHook(() => useProductCardHelpers(products));

      expect(result.current.allStoreProductIds).toEqual([201, 202]);
    });

    test('should return empty array when no marking products', () => {
      const products = [
        { id: 1, type: 'Materials' },
        { id: 2, type: 'Tutorials' },
      ];

      const { result } = renderHook(() => useProductCardHelpers(products));

      expect(result.current.allStoreProductIds).toEqual([]);
    });

    test('should handle mixed product types', () => {
      const products = [
        { id: 101, type: 'Markings' },
        { id: 102, type: 'Materials' },
        { id: 103, type: 'Markings' },
        { id: 104, type: 'Tutorials' },
      ];

      const { result } = renderHook(() => useProductCardHelpers(products));

      expect(result.current.allStoreProductIds).toEqual([101, 103]);
    });
  });

  describe('handleAddToCart', () => {
    test('should call addToCart from context', () => {
      const { result } = renderHook(() => useProductCardHelpers());

      const product = { id: 1, name: 'Test Product' };
      const priceInfo = { price: 50, priceType: 'standard' };

      act(() => {
        result.current.handleAddToCart(product, priceInfo);
      });

      expect(mockAddToCart).toHaveBeenCalledWith(product, priceInfo);
    });

    test('should handle add to cart without price info', () => {
      const { result } = renderHook(() => useProductCardHelpers());

      const product = { id: 1, name: 'Test Product' };

      act(() => {
        result.current.handleAddToCart(product);
      });

      expect(mockAddToCart).toHaveBeenCalledWith(product, undefined);
    });

    test('should be stable across renders', () => {
      const products = [{ id: 1, type: 'Materials' }];
      const { result, rerender } = renderHook(
        ({ prods }) => useProductCardHelpers(prods),
        { initialProps: { prods: products } }
      );

      const firstHandler = result.current.handleAddToCart;

      rerender({ prods: products });

      expect(result.current.handleAddToCart).toBe(firstHandler);
    });
  });

  describe('bulk deadlines fetching', () => {
    test('should fetch bulk deadlines for marking products', async () => {
      const mockDeadlines = {
        101: '2025-03-15',
        102: '2025-03-20',
      };
      mockGetBulkMarkingDeadlines.mockResolvedValue(mockDeadlines);

      const products = [
        { id: 101, type: 'Markings' },
        { id: 102, type: 'Markings' },
      ];

      const { result } = renderHook(() => useProductCardHelpers(products));

      await waitFor(() => {
        expect(result.current.bulkDeadlines).toEqual(mockDeadlines);
      });

      expect(mockGetBulkMarkingDeadlines).toHaveBeenCalledWith([101, 102]);
    });

    test('should not fetch deadlines when no marking products', async () => {
      const products = [
        { id: 1, type: 'Materials' },
        { id: 2, type: 'Tutorials' },
      ];

      renderHook(() => useProductCardHelpers(products));

      // Wait a tick to ensure effect has run
      await waitFor(() => {
        expect(mockGetBulkMarkingDeadlines).not.toHaveBeenCalled();
      });
    });

    test('should set empty deadlines when no marking products', async () => {
      const products = [{ id: 1, type: 'Materials' }];

      const { result } = renderHook(() => useProductCardHelpers(products));

      await waitFor(() => {
        expect(result.current.bulkDeadlines).toEqual({});
      });
    });

    test('should handle deadline fetch error', async () => {
      const mockError = new Error('Network error');
      mockGetBulkMarkingDeadlines.mockRejectedValue(mockError);

      const products = [{ id: 101, type: 'Markings' }];

      const { result } = renderHook(() => useProductCardHelpers(products));

      await waitFor(() => {
        expect(result.current.bulkDeadlines).toEqual({});
      });

      expect(console.error).toHaveBeenCalledWith(
        'Failed to fetch bulk deadlines:',
        mockError
      );
    });

    test('should refetch deadlines when marking products change', async () => {
      const initialDeadlines = { 101: '2025-03-15' };
      const newDeadlines = { 102: '2025-03-20' };

      mockGetBulkMarkingDeadlines
        .mockResolvedValueOnce(initialDeadlines)
        .mockResolvedValueOnce(newDeadlines);

      const initialProducts = [{ id: 101, type: 'Markings' }];
      const newProducts = [{ id: 102, type: 'Markings' }];

      const { result, rerender } = renderHook(
        ({ prods }) => useProductCardHelpers(prods),
        { initialProps: { prods: initialProducts } }
      );

      await waitFor(() => {
        expect(result.current.bulkDeadlines).toEqual(initialDeadlines);
      });

      rerender({ prods: newProducts });

      await waitFor(() => {
        expect(result.current.bulkDeadlines).toEqual(newDeadlines);
      });
    });

    test('should not refetch when products array reference changes but IDs stay same', async () => {
      const mockDeadlines = { 101: '2025-03-15' };
      mockGetBulkMarkingDeadlines.mockResolvedValue(mockDeadlines);

      const products1 = [{ id: 101, type: 'Markings' }];
      const products2 = [{ id: 101, type: 'Markings' }]; // Same data, different reference

      const { rerender } = renderHook(
        ({ prods }) => useProductCardHelpers(prods),
        { initialProps: { prods: products1 } }
      );

      await waitFor(() => {
        expect(mockGetBulkMarkingDeadlines).toHaveBeenCalledTimes(1);
      });

      rerender({ prods: products2 });

      // Should still be 1 call because idsString didn't change
      await waitFor(() => {
        expect(mockGetBulkMarkingDeadlines).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('memoization', () => {
    test('should memoize allStoreProductIds when products dont change', () => {
      const products = [{ id: 101, type: 'Markings' }];

      const { result, rerender } = renderHook(
        ({ prods }) => useProductCardHelpers(prods),
        { initialProps: { prods: products } }
      );

      const firstIds = result.current.allStoreProductIds;

      rerender({ prods: products });

      expect(result.current.allStoreProductIds).toBe(firstIds);
    });

    test('should recalculate allStoreProductIds when products change', () => {
      const products1 = [{ id: 101, type: 'Markings' }];
      const products2 = [{ id: 102, type: 'Markings' }];

      const { result, rerender } = renderHook(
        ({ prods }) => useProductCardHelpers(prods),
        { initialProps: { prods: products1 } }
      );

      const firstIds = result.current.allStoreProductIds;

      rerender({ prods: products2 });

      expect(result.current.allStoreProductIds).not.toBe(firstIds);
      expect(result.current.allStoreProductIds).toEqual([102]);
    });
  });

  describe('edge cases', () => {
    test('should handle undefined products', () => {
      const { result } = renderHook(() => useProductCardHelpers(undefined));

      expect(result.current.allStoreProductIds).toEqual([]);
      expect(result.current.bulkDeadlines).toEqual({});
    });

    test('should handle empty products array', () => {
      const { result } = renderHook(() => useProductCardHelpers([]));

      expect(result.current.allStoreProductIds).toEqual([]);
      expect(result.current.bulkDeadlines).toEqual({});
    });

    test('should handle products with no type', () => {
      const products = [
        { id: 101 },
        { id: 102, type: 'Markings' },
      ];

      const { result } = renderHook(() => useProductCardHelpers(products));

      expect(result.current.allStoreProductIds).toEqual([102]);
    });

    test('should handle marking products with null id', () => {
      const products = [
        { id: null, type: 'Markings', product_id: 999 },
        { id: 102, type: 'Markings' },
      ];

      const { result } = renderHook(() => useProductCardHelpers(products));

      // null is falsy, so fallback to product_id
      expect(result.current.allStoreProductIds).toEqual([999, 102]);
    });
  });
});
