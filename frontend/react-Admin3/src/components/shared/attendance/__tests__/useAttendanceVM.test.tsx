import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import useAttendanceVM from '../useAttendanceVM';
import type { AttendanceService, AttendancePayload } from '../types';

const samplePayload: AttendancePayload = {
  session: {
    id: 1,
    title: 'S',
    start_date: '2026-05-12T09:00:00Z',
    end_date: '2026-05-12T11:00:00Z',
    venue: null,
    tutorial_event: { id: 1, code: 'X' },
  },
  attendance_enabled: true,
  registrations: [
    {
      registration_id: 10,
      student: { student_ref: 1, first_name: 'A', last_name: 'B' },
      current_status: null,
      current_reason: null,
    },
  ],
};

function makeService(overrides: Partial<AttendanceService> = {}): AttendanceService {
  return {
    get: vi.fn().mockResolvedValue(samplePayload),
    save: vi.fn().mockResolvedValue(samplePayload),
    ...overrides,
  };
}

describe('useAttendanceVM', () => {
  it('calls service.get on mount and exposes roster', async () => {
    const service = makeService();
    const { result } = renderHook(() => useAttendanceVM(service));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(service.get).toHaveBeenCalledTimes(1);
    expect(result.current.roster).toHaveLength(1);
  });

  it('save() forwards items to service.save', async () => {
    const service = makeService();
    const { result } = renderHook(() => useAttendanceVM(service));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => { result.current.setStatus(10, 'ATTENDED'); });
    await act(async () => { await result.current.save(); });
    expect(service.save).toHaveBeenCalledWith([
      { registration_id: 10, status: 'ATTENDED', reason: '' },
    ]);
  });
});
