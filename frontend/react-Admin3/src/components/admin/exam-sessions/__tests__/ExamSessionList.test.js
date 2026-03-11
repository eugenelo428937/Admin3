import { vi } from 'vitest';
// src/components/admin/exam-sessions/__tests__/ExamSessionList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminExamSessionList from '../ExamSessionList.js';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.js', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.js';

// Mock examSessionService
vi.mock('../../../../services/examSessionService.js', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  },
}));

import examSessionService from '../../../../services/examSessionService.js';

import appTheme from '../../../../theme';
const theme = appTheme;

const mockExamSessions = [
  {
    id: '1',
    session_code: 'SEPT2024',
    start_date: '2024-09-01T00:00:00Z',
    end_date: '2024-09-30T23:59:59Z',
  },
  {
    id: '2',
    session_code: 'DEC2024',
    start_date: '2024-12-01T00:00:00Z',
    end_date: '2024-12-31T23:59:59Z',
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AdminExamSessionList />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AdminExamSessionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    examSessionService.list.mockResolvedValue({ results: mockExamSessions, count: mockExamSessions.length });
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /exam sessions/i })).toBeInTheDocument();
      });
    });

    test('renders create new button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /create new exam session/i })).toBeInTheDocument();
      });
    });

    test('renders table headers', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Session Code')).toBeInTheDocument();
        expect(screen.getByText('Start Date')).toBeInTheDocument();
        expect(screen.getByText('End Date')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });
  });

  describe('data display', () => {
    test('fetches and displays exam sessions', async () => {
      renderComponent();

      await waitFor(() => {
        expect(examSessionService.list).toHaveBeenCalled();
        expect(screen.getByText('SEPT2024')).toBeInTheDocument();
        expect(screen.getByText('DEC2024')).toBeInTheDocument();
      });
    });

    test('displays edit buttons for each session', async () => {
      renderComponent();

      await waitFor(() => {
        const editButtons = screen.getAllByRole('link', { name: /edit/i });
        expect(editButtons).toHaveLength(2);
      });
    });

    test('displays delete buttons for each session', async () => {
      renderComponent();

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        expect(deleteButtons).toHaveLength(2);
      });
    });
  });

  describe('delete functionality', () => {
    test('calls delete when delete button clicked and confirmed', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      examSessionService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('SEPT2024')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this exam session?');
        expect(examSessionService.delete).toHaveBeenCalledWith('1');
      });
    });

    test('does not delete when cancelled', async () => {
      window.confirm = vi.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('SEPT2024')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(examSessionService.delete).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      examSessionService.list.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch exam sessions/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      examSessionService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('SEPT2024')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete exam session/i)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    test('renders empty table when no sessions', async () => {
      examSessionService.list.mockResolvedValueOnce({ results: [], count: 0 });

      renderComponent();

      await waitFor(() => {
        expect(screen.queryByText('SEPT2024')).not.toBeInTheDocument();
      });
    });
  });
});
