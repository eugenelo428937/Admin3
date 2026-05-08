import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import useTutorialEventListVM from '../useTutorialEventListVM';
import service from '../../../../services/admin/tutorialEventsAdminService';

vi.mock('../../../../services/admin/tutorialEventsAdminService', () => ({
  default: {
    listEvents: vi.fn(),
    filterOptions: vi.fn(),
    getAttendance: vi.fn(),
    saveAttendance: vi.fn(),
  },
}));

const mock = vi.mocked(service);

beforeEach(() => {
  vi.useFakeTimers();
  mock.listEvents.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  mock.filterOptions.mockResolvedValue({
    subjects: [], locations: [], venues: [], instructors: [], sittings: [],
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useTutorialEventListVM', () => {
  it('fetches filter-options and events on mount', async () => {
    renderHook(() => useTutorialEventListVM());
    await act(async () => { vi.runAllTimers(); await Promise.resolve(); });
    expect(mock.filterOptions).toHaveBeenCalled();
    expect(mock.listEvents).toHaveBeenCalled();
  });

  it('debounces text filter changes by 300ms', async () => {
    const { result } = renderHook(() => useTutorialEventListVM());
    await act(async () => { vi.runAllTimers(); await Promise.resolve(); });
    mock.listEvents.mockClear();

    act(() => result.current.setFilter('code', 'CP1'));
    expect(mock.listEvents).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve(); });
    expect(mock.listEvents).toHaveBeenCalledTimes(1);
  });

  it('non-text filters fire immediately', async () => {
    const { result } = renderHook(() => useTutorialEventListVM());
    await act(async () => { vi.runAllTimers(); await Promise.resolve(); });
    mock.listEvents.mockClear();

    act(() => result.current.setFilter('subject_codes', ['CM2']));
    await act(async () => { await Promise.resolve(); });
    expect(mock.listEvents).toHaveBeenCalledTimes(1);
  });

  it('resets pagination to 1 when a filter changes', async () => {
    const { result } = renderHook(() => useTutorialEventListVM());
    await act(async () => { vi.runAllTimers(); await Promise.resolve(); });
    act(() => result.current.setPagination({ page: 5, pageSize: 20 }));
    expect(result.current.pagination.page).toBe(5);

    act(() => result.current.setFilter('subject_codes', ['CM2']));
    expect(result.current.pagination.page).toBe(1);
  });

  it('toggleExpanded adds and removes ids', async () => {
    const { result } = renderHook(() => useTutorialEventListVM());
    await act(async () => { vi.runAllTimers(); await Promise.resolve(); });
    act(() => result.current.toggleExpanded(42));
    expect(result.current.isExpanded(42)).toBe(true);
    act(() => result.current.toggleExpanded(42));
    expect(result.current.isExpanded(42)).toBe(false);
  });

  it('openAttendance / closeAttendance set and clear target', async () => {
    const { result } = renderHook(() => useTutorialEventListVM());
    await act(async () => { vi.runAllTimers(); await Promise.resolve(); });
    const session = { id: 99, title: 'S', start_date: '', end_date: '', venue: null,
                      tutorial_event: { id: 1, code: 'EV' } } as any;
    act(() => result.current.openAttendance(session));
    expect(result.current.attendanceTarget?.id).toBe(99);
    act(() => result.current.closeAttendance());
    expect(result.current.attendanceTarget).toBeNull();
  });
});
