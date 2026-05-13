import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AttendanceRosterPanel from '../AttendanceRosterPanel';
import type { RosterRow } from '../useAttendanceVM';

function makeRow(overrides: Partial<RosterRow> = {}): RosterRow {
  return {
    registration_id: 10,
    student: { student_ref: 1, first_name: 'A', last_name: 'B' },
    status: '',
    reason: '',
    current_status: null,
    current_reason: '',
    dirty: false,
    ...overrides,
  };
}

function makeVM(overrides: Partial<ReturnType<typeof makeVMBase>> = {}) {
  return { ...makeVMBase(), ...overrides };
}

function makeVMBase() {
  return {
    session: null,
    instructor: null,
    attendanceEnabled: true,
    roster: [] as RosterRow[],
    isLoading: false,
    isSaving: false,
    error: null as string | null,
    lastErrorCode: null as string | null,
    tokenError: null as 'expired' | 'invalid' | null,
    rowErrors: {} as Record<number, string>,
    hasDirty: false,
    hasInvalidOther: false,
    canSave: false,
    setStatus: vi.fn(),
    setReason: vi.fn(),
    save: vi.fn(),
    reset: vi.fn(),
    replaceFromServer: vi.fn(),
  };
}

describe('AttendanceRosterPanel', () => {
  it('renders one row per registration with student name and ref', () => {
    const vm = makeVM({
      roster: [
        makeRow({ registration_id: 10, student: { student_ref: 1, first_name: 'A', last_name: 'B' } }),
        makeRow({ registration_id: 11, student: { student_ref: 2, first_name: 'C', last_name: 'D' } }),
      ],
    });
    render(<AttendanceRosterPanel vm={vm as any} />);
    expect(screen.getByText(/B, A \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/D, C \(2\)/)).toBeInTheDocument();
  });

  it('shows upload button only when onUploadXlsx prop is provided', () => {
    const vm = makeVM({ roster: [makeRow()] });
    const { rerender } = render(<AttendanceRosterPanel vm={vm as any} />);
    expect(screen.queryByRole('button', { name: /upload/i })).toBeNull();
    rerender(<AttendanceRosterPanel vm={vm as any} onUploadXlsx={async () => {}} />);
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('renders the loading skeleton when vm.isLoading', () => {
    const vm = makeVM({ isLoading: true });
    render(<AttendanceRosterPanel vm={vm as any} />);
    expect(screen.getByTestId('attendance-skeleton')).toBeInTheDocument();
  });

  it('renders the empty-roster message when not loading and roster is empty', () => {
    const vm = makeVM({ roster: [] });
    render(<AttendanceRosterPanel vm={vm as any} />);
    expect(screen.getByText(/no students enrolled/i)).toBeInTheDocument();
  });

  it('shows the reason input when a row status is OTHER', () => {
    const vm = makeVM({
      roster: [makeRow({ status: 'OTHER', reason: 'parental leave' })],
    });
    render(<AttendanceRosterPanel vm={vm as any} />);
    expect(screen.getByPlaceholderText(/reason \(required\)/i)).toBeInTheDocument();
  });

  it('renders row-level errors from vm.rowErrors', () => {
    const vm = makeVM({
      roster: [makeRow({ registration_id: 10 })],
      rowErrors: { 10: 'invalid_status' },
    });
    render(<AttendanceRosterPanel vm={vm as any} />);
    expect(screen.getByText('invalid_status')).toBeInTheDocument();
  });
});
