import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import useOrderListVM from '../useOrderListVM';
import adminOrderService from '../../../../services/adminOrderService';

vi.mock('../../../../services/adminOrderService', () => ({
  default: {
    search: vi.fn(),
    listProductCodes: vi.fn(),
  },
}));

vi.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({ isSuperuser: true }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

const mockService = vi.mocked(adminOrderService);

beforeEach(() => {
  vi.useFakeTimers();
  mockService.search.mockResolvedValue({
    count: 0, next: null, previous: null, results: [],
  });
  mockService.listProductCodes.mockResolvedValue([
    { code: 'CM1/CC/26', name: 'CM1 Core' },
    { code: 'CP2/CPBOR/26', name: 'CP2 BOR' },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useOrderListVM', () => {
  it('fetches orders on mount', async () => {
    renderHook(() => useOrderListVM());
    await act(async () => {
      vi.runAllTimers();
      await Promise.resolve();
    });
    expect(mockService.search).toHaveBeenCalled();
  });

  it('debounces text filter changes by 300ms', async () => {
    const { result } = renderHook(() => useOrderListVM());
    await act(async () => {
      vi.runAllTimers();
      await Promise.resolve();
    });
    mockService.search.mockClear();

    act(() => result.current.setName('Ali'));
    expect(mockService.search).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(299);
      await Promise.resolve();
    });
    expect(mockService.search).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      vi.runAllTimers();
      await Promise.resolve();
    });
    expect(mockService.search).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ali' }),
    );
  });

  it('resets page to 0 when filters change', async () => {
    const { result } = renderHook(() => useOrderListVM());
    await act(async () => {
      vi.runAllTimers();
      await Promise.resolve();
    });
    act(() => result.current.handleChangePage(null, 3));
    expect(result.current.page).toBe(3);
    act(() => result.current.setEmail('x@y.com'));
    expect(result.current.page).toBe(0);
  });

  it('cycles ordering: ascending -> descending -> cleared', async () => {
    const { result } = renderHook(() => useOrderListVM());
    expect(result.current.ordering).toBe('-created_at');
    act(() => result.current.toggleSort('created_at'));
    expect(result.current.ordering).toBe('created_at');
    act(() => result.current.toggleSort('created_at'));
    expect(result.current.ordering).toBe('-created_at');
    act(() => result.current.toggleSort('created_at'));
    expect(result.current.ordering).toBe('');
  });

  it('loads product code options on mount', async () => {
    const { result } = renderHook(() => useOrderListVM());
    await act(async () => {
      vi.runAllTimers();
      await Promise.resolve();
    });
    expect(result.current.productCodeOptions).toEqual([
      { value: 'CM1/CC/26', label: 'CM1/CC/26 — CM1 Core' },
      { value: 'CP2/CPBOR/26', label: 'CP2/CPBOR/26 — CP2 BOR' },
    ]);
  });
});
