import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import useAttendanceVM from '../useAttendanceVM';
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

const PAYLOAD = {
  session: {
    id: 1, title: 'S1', start_date: '', end_date: '', venue: null,
    tutorial_event: { id: 10, code: 'EV' },
  },
  attendance_enabled: true,
  registrations: [
    {
      registration_id: 100,
      student: { student_ref: 5001, first_name: 'Alice', last_name: 'Smith' },
      current_status: null, current_reason: '',
    },
    {
      registration_id: 101,
      student: { student_ref: 5002, first_name: 'Bob', last_name: 'Lee' },
      current_status: 'ATTENDED' as const, current_reason: '',
    },
  ],
};

beforeEach(() => {
  mock.getAttendance.mockResolvedValue(PAYLOAD);
  mock.saveAttendance.mockResolvedValue(PAYLOAD);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useAttendanceVM', () => {
  it('fetches on mount and populates roster', async () => {
    const { result } = renderHook(() => useAttendanceVM(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roster).toHaveLength(2);
    expect(result.current.attendanceEnabled).toBe(true);
  });

  it('setStatus marks row dirty when changed', async () => {
    const { result } = renderHook(() => useAttendanceVM(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Bob already ATTENDED — setting same value is not dirty
    act(() => result.current.setStatus(101, 'ATTENDED'));
    expect(result.current.roster.find(r => r.registration_id === 101)!.dirty).toBe(false);

    act(() => result.current.setStatus(101, 'ABSENT'));
    expect(result.current.roster.find(r => r.registration_id === 101)!.dirty).toBe(true);
  });

  it('save() POSTs all items and refreshes state', async () => {
    const { result } = renderHook(() => useAttendanceVM(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setStatus(100, 'ATTENDED'));
    await act(async () => { await result.current.save(); });
    expect(mock.saveAttendance).toHaveBeenCalledWith(1, expect.arrayContaining([
      expect.objectContaining({ registration_id: 100, status: 'ATTENDED' }),
      expect.objectContaining({ registration_id: 101, status: 'ATTENDED' }),
    ]));
  });

  it('save() does not clear local state on failure', async () => {
    mock.saveAttendance.mockRejectedValueOnce({ response: { status: 500 } });
    const { result } = renderHook(() => useAttendanceVM(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setStatus(100, 'ATTENDED'));
    await act(async () => { try { await result.current.save(); } catch {} });
    expect(result.current.roster.find(r => r.registration_id === 100)!.status).toBe('ATTENDED');
    expect(result.current.error).toBeTruthy();
  });
});
