import { vi } from 'vitest';
// src/components/admin/exam-session-subjects/__tests__/ExamSessionSubjectList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminExamSessionSubjectList from '../ExamSessionSubjectList.js';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.js', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.js';

// Mock examSessionSubjectService
vi.mock('../../../../services/examSessionSubjectService.js', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock examSessionService
vi.mock('../../../../services/examSessionService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
  },
}));

import examSessionSubjectService from '../../../../services/examSessionSubjectService.js';
import examSessionService from '../../../../services/examSessionService';

import appTheme from '../../../../theme';
const theme = appTheme;

const mockExamSessionSubjects = [
  {
    id: '1',
    exam_session: { session_code: '2025-04' },
    subject: { code: 'CM2' },
    is_active: true,
  },
  {
    id: '2',
    exam_session: { session_code: '2025-09' },
    subject: { code: 'SA1' },
    is_active: false,
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AdminExamSessionSubjectList />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AdminExamSessionSubjectList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    examSessionSubjectService.getAll.mockResolvedValue(mockExamSessionSubjects);
    examSessionService.getAll.mockResolvedValue([
      { id: 1, session_code: '2025-04' },
      { id: 2, session_code: '2025-09' },
    ]);
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /exam session subjects/i })).toBeInTheDocument();
      });
    });

    test('renders create new button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /create new exam session subject/i })).toBeInTheDocument();
      });
    });

    test('renders table headers', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Exam Session' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Subject' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Active' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
      });
    });

    test('shows loading state initially', () => {
      examSessionSubjectService.getAll.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('data display', () => {
    test('fetches and displays exam session subjects', async () => {
      renderComponent();

      await waitFor(() => {
        expect(examSessionSubjectService.getAll).toHaveBeenCalled();
        expect(screen.getByText('2025-04')).toBeInTheDocument();
        expect(screen.getByText('CM2')).toBeInTheDocument();
        expect(screen.getByText('2025-09')).toBeInTheDocument();
        expect(screen.getByText('SA1')).toBeInTheDocument();
      });
    });

    test('displays edit buttons for each item', async () => {
      renderComponent();

      await waitFor(() => {
        const editButtons = screen.getAllByRole('link', { name: /edit/i });
        expect(editButtons).toHaveLength(2);
      });
    });

    test('displays delete buttons for each item', async () => {
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
      examSessionSubjectService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('2025-04')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this exam session subject?');
        expect(examSessionSubjectService.delete).toHaveBeenCalledWith('1');
      });
    });

    test('does not delete when cancelled', async () => {
      window.confirm = vi.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('2025-04')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(examSessionSubjectService.delete).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      examSessionSubjectService.getAll.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch exam session subjects/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      examSessionSubjectService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('2025-04')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete exam session subject/i)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    test('renders empty state when no data', async () => {
      examSessionSubjectService.getAll.mockResolvedValueOnce([]);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no exam session subjects found/i)).toBeInTheDocument();
      });
    });
  });

  describe('superuser check', () => {
    test('redirects non-superuser away from page', async () => {
      useAuth.mockReturnValue({
        isSuperuser: false,
        isApprentice: false,
        isStudyPlus: false,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /exam session subjects/i })).not.toBeInTheDocument();
      });
    });
  });
});
