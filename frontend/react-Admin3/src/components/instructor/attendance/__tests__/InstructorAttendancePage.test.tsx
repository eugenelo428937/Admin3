import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InstructorAttendancePage from '../InstructorAttendancePage';
import httpService from '../../../../services/httpService';

vi.mock('../../../../services/httpService', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const mockedHttp = httpService as unknown as { get: any; post: any };

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/instructor/attendance/:token"
          element={<InstructorAttendancePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InstructorAttendancePage', () => {
  beforeEach(() => {
    mockedHttp.get.mockReset();
    mockedHttp.post.mockReset();
  });

  it('renders the roster on a valid token', async () => {
    mockedHttp.get.mockResolvedValue({
      data: {
        session: {
          id: 1,
          title: 'My Session',
          start_date: '2026-05-12T09:00:00Z',
          end_date: '2026-05-12T11:00:00Z',
          venue: { id: 1, name: 'BPP London' },
          tutorial_event: { id: 1, code: 'X' },
        },
        attendance_enabled: true,
        instructor: { id: 7, name: 'Tina Tutor' },
        registrations: [
          {
            registration_id: 10,
            student: { student_ref: 1, first_name: 'A', last_name: 'B' },
            current_status: null,
            current_reason: null,
          },
        ],
      },
    });
    renderAt('/instructor/attendance/THE-TOKEN');
    await waitFor(() => screen.getByText(/My Session/));
    expect(screen.getByText(/B, A \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Tina Tutor/)).toBeInTheDocument();
  });

  it('shows the expired-link screen on 410', async () => {
    mockedHttp.get.mockRejectedValue({
      response: { status: 410, data: { code: 'token_expired' } },
    });
    renderAt('/instructor/attendance/EXPIRED');
    await waitFor(() => screen.getByText(/link has expired/i));
  });

  it('shows the invalid-link screen on 400', async () => {
    mockedHttp.get.mockRejectedValue({
      response: { status: 400, data: { code: 'invalid_token' } },
    });
    renderAt('/instructor/attendance/BAD');
    await waitFor(() => screen.getByText(/invalid link/i));
  });
});
