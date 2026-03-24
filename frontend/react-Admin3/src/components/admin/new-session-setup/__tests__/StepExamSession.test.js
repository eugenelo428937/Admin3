import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StepExamSession from '../StepExamSession.tsx';

// Mock examSessionService
vi.mock('../../../../services/examSessionService', () => ({
  __esModule: true,
  default: {
    create: vi.fn(),
    getAll: vi.fn(),
  },
}));

import examSessionService from '../../../../services/examSessionService';

const mockSessions = [
  { id: 42, session_code: '2026-09', start_date: '2026-09-01T00:00:00Z', end_date: '2026-12-31T23:59:00Z' },
  { id: 41, session_code: '2026-04', start_date: '2026-04-01T00:00:00Z', end_date: '2026-06-30T23:59:00Z' },
];

describe('StepExamSession', () => {
  const mockOnSessionCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    examSessionService.getAll.mockResolvedValue(mockSessions);
  });

  it('renders the form with both search and create sections', async () => {
    render(<StepExamSession onSessionCreated={mockOnSessionCreated} />);

    expect(screen.getByText('Step 1: Exam Session')).toBeInTheDocument();
    expect(screen.getByText('Select Existing Session')).toBeInTheDocument();
    expect(screen.getByText('Create New Session')).toBeInTheDocument();
    expect(screen.getByText('Session Code')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create & continue/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(examSessionService.getAll).toHaveBeenCalled();
    });
  });

  it('renders search input that fetches existing sessions', async () => {
    render(<StepExamSession onSessionCreated={mockOnSessionCreated} />);

    await waitFor(() => {
      expect(examSessionService.getAll).toHaveBeenCalled();
    });

    expect(screen.getByLabelText(/search by session code/i)).toBeInTheDocument();
  });

  it('validates end date must be after start date', async () => {
    render(<StepExamSession onSessionCreated={mockOnSessionCreated} />);

    await waitFor(() => {
      expect(examSessionService.getAll).toHaveBeenCalled();
    });

    const sessionCodeInput = document.querySelector('input[name="session_code"]');
    const startDate = document.querySelector('input[name="start_date"]');
    const endDate = document.querySelector('input[name="end_date"]');

    fireEvent.change(sessionCodeInput, { target: { name: 'session_code', value: '2026-09' } });
    fireEvent.change(startDate, { target: { name: 'start_date', value: '2026-09-01T00:00' } });
    fireEvent.change(endDate, { target: { name: 'end_date', value: '2026-08-01T00:00' } });

    fireEvent.click(screen.getByRole('button', { name: /create & continue/i }));

    await waitFor(() => {
      expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
    });
    expect(examSessionService.create).not.toHaveBeenCalled();
  });

  it('calls onSessionCreated with isExisting:false on create success', async () => {
    const mockSession = { id: 43, session_code: '2026-09' };
    examSessionService.create.mockResolvedValue(mockSession);

    render(<StepExamSession onSessionCreated={mockOnSessionCreated} />);

    await waitFor(() => {
      expect(examSessionService.getAll).toHaveBeenCalled();
    });

    const sessionCodeInput = document.querySelector('input[name="session_code"]');
    const startDate = document.querySelector('input[name="start_date"]');
    const endDate = document.querySelector('input[name="end_date"]');

    fireEvent.change(sessionCodeInput, { target: { name: 'session_code', value: '2026-09' } });
    fireEvent.change(startDate, { target: { name: 'start_date', value: '2026-09-01T00:00' } });
    fireEvent.change(endDate, { target: { name: 'end_date', value: '2026-12-31T23:59' } });

    fireEvent.click(screen.getByRole('button', { name: /create & continue/i }));

    await waitFor(() => {
      expect(mockOnSessionCreated).toHaveBeenCalledWith(mockSession, { isExisting: false });
    });
  });

  it('displays error message on create API failure', async () => {
    examSessionService.create.mockRejectedValue({
      response: { data: { session_code: ['This session code already exists.'] } },
    });

    render(<StepExamSession onSessionCreated={mockOnSessionCreated} />);

    await waitFor(() => {
      expect(examSessionService.getAll).toHaveBeenCalled();
    });

    const sessionCodeInput = document.querySelector('input[name="session_code"]');
    const startDate = document.querySelector('input[name="start_date"]');
    const endDate = document.querySelector('input[name="end_date"]');

    fireEvent.change(sessionCodeInput, { target: { name: 'session_code', value: '2026-09' } });
    fireEvent.change(startDate, { target: { name: 'start_date', value: '2026-09-01T00:00' } });
    fireEvent.change(endDate, { target: { name: 'end_date', value: '2026-12-31T23:59' } });

    fireEvent.click(screen.getByRole('button', { name: /create & continue/i }));

    await waitFor(() => {
      expect(screen.getByText('This session code already exists.')).toBeInTheDocument();
    });
  });

  it('shows session details when a session is selected from dropdown', async () => {
    render(<StepExamSession onSessionCreated={mockOnSessionCreated} />);

    await waitFor(() => {
      expect(examSessionService.getAll).toHaveBeenCalled();
    });

    // Type in search to open dropdown
    const input = screen.getByLabelText(/search by session code/i);
    fireEvent.change(input, { target: { value: '2026-04' } });

    // Select the option from dropdown
    await waitFor(() => {
      expect(screen.getByText('2026-04')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('2026-04'));

    // Should show the "Use This Session" button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /use this session/i })).toBeInTheDocument();
    });
  });

  it('calls onSessionCreated with isExisting:true when selecting existing session', async () => {
    render(<StepExamSession onSessionCreated={mockOnSessionCreated} />);

    await waitFor(() => {
      expect(examSessionService.getAll).toHaveBeenCalled();
    });

    // Type in search to open dropdown
    const input = screen.getByLabelText(/search by session code/i);
    fireEvent.change(input, { target: { value: '2026-04' } });

    await waitFor(() => {
      expect(screen.getByText('2026-04')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('2026-04'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /use this session/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /use this session/i }));

    expect(mockOnSessionCreated).toHaveBeenCalledWith(
      mockSessions[1],
      { isExisting: true }
    );
  });
});
