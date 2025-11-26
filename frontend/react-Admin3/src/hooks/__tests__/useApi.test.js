/**
 * Tests for useApi hook
 *
 * @module hooks/__tests__/useApi.test
 *
 * Tests generic API hook functionality including:
 * - execute: Execute API function with args
 * - data: Store response data
 * - error: Handle and store errors
 * - loading: Track loading state
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useApi } from '../useApi';

describe('useApi', () => {
  describe('initial state', () => {
    test('should return initial state with null data', () => {
      const mockApiFunc = jest.fn();
      const { result } = renderHook(() => useApi(mockApiFunc));

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(typeof result.current.execute).toBe('function');
    });
  });

  describe('execute', () => {
    test('should set loading to true while executing', async () => {
      let resolvePromise;
      const mockApiFunc = jest.fn(() => new Promise(resolve => {
        resolvePromise = resolve;
      }));

      const { result } = renderHook(() => useApi(mockApiFunc));

      act(() => {
        result.current.execute();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise({ data: 'test' });
      });

      expect(result.current.loading).toBe(false);
    });

    test('should call API function with provided arguments', async () => {
      const mockApiFunc = jest.fn().mockResolvedValue({ data: 'result' });
      const { result } = renderHook(() => useApi(mockApiFunc));

      await act(async () => {
        await result.current.execute('arg1', 'arg2', { option: true });
      });

      expect(mockApiFunc).toHaveBeenCalledWith('arg1', 'arg2', { option: true });
    });

    test('should store response data on success', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockApiFunc = jest.fn().mockResolvedValue({ data: mockData });
      const { result } = renderHook(() => useApi(mockApiFunc));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });

    test('should return response data from execute', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockApiFunc = jest.fn().mockResolvedValue({ data: mockData });
      const { result } = renderHook(() => useApi(mockApiFunc));

      let returnedData;
      await act(async () => {
        returnedData = await result.current.execute();
      });

      expect(returnedData).toEqual(mockData);
    });

    test('should clear previous error on new execution', async () => {
      const mockApiFunc = jest.fn()
        .mockRejectedValueOnce({ response: { data: 'Error 1' } })
        .mockResolvedValueOnce({ data: 'success' });

      const { result } = renderHook(() => useApi(mockApiFunc));

      // First call - error
      await act(async () => {
        try {
          await result.current.execute();
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toBe('Error 1');

      // Second call - success
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data).toBe('success');
    });
  });

  describe('error handling', () => {
    test('should store error from response.data', async () => {
      const errorData = { message: 'Validation failed', code: 'INVALID' };
      const mockApiFunc = jest.fn().mockRejectedValue({
        response: { data: errorData }
      });

      const { result } = renderHook(() => useApi(mockApiFunc));

      await act(async () => {
        try {
          await result.current.execute();
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toEqual(errorData);
      expect(result.current.data).toBeNull();
    });

    test('should fall back to error message if no response data', async () => {
      const mockApiFunc = jest.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useApi(mockApiFunc));

      await act(async () => {
        try {
          await result.current.execute();
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toBe('Network error');
    });

    test('should rethrow error after storing it', async () => {
      const mockError = new Error('API failed');
      const mockApiFunc = jest.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() => useApi(mockApiFunc));

      await expect(
        act(async () => {
          await result.current.execute();
        })
      ).rejects.toThrow('API failed');
    });

    test('should set loading to false after error', async () => {
      const mockApiFunc = jest.fn().mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useApi(mockApiFunc));

      await act(async () => {
        try {
          await result.current.execute();
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('memoization', () => {
    test('should maintain same execute function reference', () => {
      const mockApiFunc = jest.fn();
      const { result, rerender } = renderHook(() => useApi(mockApiFunc));

      const firstExecute = result.current.execute;
      rerender();
      const secondExecute = result.current.execute;

      expect(firstExecute).toBe(secondExecute);
    });

    test('should update execute when apiFunc changes', () => {
      const mockApiFunc1 = jest.fn();
      const mockApiFunc2 = jest.fn();

      const { result, rerender } = renderHook(
        ({ apiFunc }) => useApi(apiFunc),
        { initialProps: { apiFunc: mockApiFunc1 } }
      );

      const firstExecute = result.current.execute;
      rerender({ apiFunc: mockApiFunc2 });
      const secondExecute = result.current.execute;

      expect(firstExecute).not.toBe(secondExecute);
    });
  });

  describe('multiple executions', () => {
    test('should handle sequential executions', async () => {
      const mockApiFunc = jest.fn()
        .mockResolvedValueOnce({ data: 'first' })
        .mockResolvedValueOnce({ data: 'second' });

      const { result } = renderHook(() => useApi(mockApiFunc));

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.data).toBe('first');

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.data).toBe('second');
    });
  });
});
