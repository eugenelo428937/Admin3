// src/components/admin/exam-sessions/__tests__/ExamSessionList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminExamSessionList from '../ExamSessionList';

// Mock examSessionService
jest.mock('../../../../services/examSessionService', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    delete: jest.fn(),
  },
}));

import examSessionService from '../../../../services/examSessionService';

const theme = createTheme();

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
    jest.clearAllMocks();
    examSessionService.getAll.mockResolvedValue(mockExamSessions);
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
        expect(examSessionService.getAll).toHaveBeenCalled();
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
      window.confirm = jest.fn().mockReturnValue(true);
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
      window.confirm = jest.fn().mockReturnValue(false);

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
      examSessionService.getAll.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch exam sessions/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
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
      examSessionService.getAll.mockResolvedValueOnce([]);

      renderComponent();

      await waitFor(() => {
        expect(screen.queryByText('SEPT2024')).not.toBeInTheDocument();
      });
    });
  });
});
