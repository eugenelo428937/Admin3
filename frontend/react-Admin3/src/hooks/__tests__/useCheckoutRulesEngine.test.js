/**
 * Tests for useCheckoutRulesEngine hook
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import useCheckoutRulesEngine from '../useCheckoutRulesEngine';

// Mock dependencies
jest.mock('../../utils/rulesEngineUtils', () => ({
  rulesEngineHelpers: {
    executeCheckoutTerms: jest.fn()
  },
  buildRulesContext: jest.fn()
}));

jest.mock('../../services/rulesEngineService', () => ({
  __esModule: true,
  default: {}
}));

const { rulesEngineHelpers } = require('../../utils/rulesEngineUtils');

describe('useCheckoutRulesEngine', () => {
  const mockCartData = { id: 1, total: 100 };
  const mockCartItems = [{ id: 1, product_id: 72, quantity: 1 }];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial state', () => {
    test('should return initial state with null result', () => {
      const { result } = renderHook(() => useCheckoutRulesEngine(null, null));

      expect(result.current.rulesResult).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('should not execute rules when cartData is null', () => {
      renderHook(() => useCheckoutRulesEngine(null, mockCartItems));

      expect(rulesEngineHelpers.executeCheckoutTerms).not.toHaveBeenCalled();
    });

    test('should not execute rules when cartItems is empty', () => {
      renderHook(() => useCheckoutRulesEngine(mockCartData, []));

      expect(rulesEngineHelpers.executeCheckoutTerms).not.toHaveBeenCalled();
    });

    test('should not execute rules when cartItems is null', () => {
      renderHook(() => useCheckoutRulesEngine(mockCartData, null));

      expect(rulesEngineHelpers.executeCheckoutTerms).not.toHaveBeenCalled();
    });
  });

  describe('rule execution', () => {
    test('should execute rules when cart has items', async () => {
      const mockResult = {
        messages: { classified: { acknowledgments: { inline: [], modal: [] }, displays: { all: [] } } },
        blocked: false,
        requires_acknowledgment: false
      };
      rulesEngineHelpers.executeCheckoutTerms.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCheckoutRulesEngine(mockCartData, mockCartItems));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(rulesEngineHelpers.executeCheckoutTerms).toHaveBeenCalledTimes(1);
      expect(result.current.rulesResult).toEqual(mockResult);
    });

    test('should set loading state during execution', async () => {
      let resolvePromise;
      rulesEngineHelpers.executeCheckoutTerms.mockImplementation(
        () => new Promise(resolve => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useCheckoutRulesEngine(mockCartData, mockCartItems));

      // Should be loading initially
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise({ messages: {} });
      });

      expect(result.current.loading).toBe(false);
    });

    test('should handle errors', async () => {
      const errorMessage = 'Rules execution failed';
      rulesEngineHelpers.executeCheckoutTerms.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useCheckoutRulesEngine(mockCartData, mockCartItems));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(console.error).toHaveBeenCalled();
    });

    test('should re-execute when cartData changes', async () => {
      rulesEngineHelpers.executeCheckoutTerms.mockResolvedValue({ messages: {} });

      const { result, rerender } = renderHook(
        ({ cartData, cartItems }) => useCheckoutRulesEngine(cartData, cartItems),
        { initialProps: { cartData: mockCartData, cartItems: mockCartItems } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(rulesEngineHelpers.executeCheckoutTerms).toHaveBeenCalledTimes(1);

      // Change cartData
      rerender({ cartData: { id: 2, total: 200 }, cartItems: mockCartItems });

      await waitFor(() => {
        expect(rulesEngineHelpers.executeCheckoutTerms).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('helper functions', () => {
    test('getInlineAcknowledgments should return inline acknowledgments', async () => {
      const mockResult = {
        messages: { classified: { acknowledgments: { inline: [{ id: 1 }], modal: [] }, displays: { all: [] } } }
      };
      rulesEngineHelpers.executeCheckoutTerms.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCheckoutRulesEngine(mockCartData, mockCartItems));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getInlineAcknowledgments()).toEqual([{ id: 1 }]);
    });

    test('getInlineAcknowledgments should return empty array when no result', () => {
      const { result } = renderHook(() => useCheckoutRulesEngine(null, null));

      expect(result.current.getInlineAcknowledgments()).toEqual([]);
    });

    test('getModalAcknowledgments should return modal acknowledgments', async () => {
      const mockResult = {
        messages: { classified: { acknowledgments: { inline: [], modal: [{ id: 2 }] }, displays: { all: [] } } }
      };
      rulesEngineHelpers.executeCheckoutTerms.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCheckoutRulesEngine(mockCartData, mockCartItems));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getModalAcknowledgments()).toEqual([{ id: 2 }]);
    });

    test('getModalAcknowledgments should return empty array when no result', () => {
      const { result } = renderHook(() => useCheckoutRulesEngine(null, null));

      expect(result.current.getModalAcknowledgments()).toEqual([]);
    });

    test('getDisplayMessages should return display messages', async () => {
      const mockResult = {
        messages: { classified: { acknowledgments: { inline: [], modal: [] }, displays: { all: [{ id: 3 }] } } }
      };
      rulesEngineHelpers.executeCheckoutTerms.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCheckoutRulesEngine(mockCartData, mockCartItems));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getDisplayMessages()).toEqual([{ id: 3 }]);
    });

    test('getDisplayMessages should return empty array when no result', () => {
      const { result } = renderHook(() => useCheckoutRulesEngine(null, null));

      expect(result.current.getDisplayMessages()).toEqual([]);
    });

    test('hasBlockingMessages should return blocked status', async () => {
      const mockResult = { messages: {}, blocked: true };
      rulesEngineHelpers.executeCheckoutTerms.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCheckoutRulesEngine(mockCartData, mockCartItems));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasBlockingMessages()).toBe(true);
    });

    test('hasBlockingMessages should return false when no result', () => {
      const { result } = renderHook(() => useCheckoutRulesEngine(null, null));

      expect(result.current.hasBlockingMessages()).toBe(false);
    });

    test('requiresAcknowledgment should return acknowledgment requirement', async () => {
      const mockResult = { messages: {}, requires_acknowledgment: true };
      rulesEngineHelpers.executeCheckoutTerms.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCheckoutRulesEngine(mockCartData, mockCartItems));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.requiresAcknowledgment()).toBe(true);
    });

    test('requiresAcknowledgment should return false when no result', () => {
      const { result } = renderHook(() => useCheckoutRulesEngine(null, null));

      expect(result.current.requiresAcknowledgment()).toBe(false);
    });
  });
});
