import { vi } from 'vitest';
// src/components/admin/exam-session-subjects/__tests__/ExamSessionSubjectList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AdminExamSessionSubjectList from '../ExamSessionSubjectList.tsx';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.tsx', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.tsx';

// Mock examSessionSubjectService
vi.mock('../../../../services/examSessionSubjectService', () => ({
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

import examSessionSubjectService from '../../../../services/examSessionSubjectService';
import examSessionService from '../../../../services/examSessionService';

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
      <AdminExamSessionSubjectList />
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
        expect(screen.getByRole('button', { name: /create new ess link/i })).toBeInTheDocument();
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

      // AdminDataTable shows skeleton loaders while loading
      expect(screen.getByText(/exam session subjects/i)).toBeInTheDocument();
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

    test('displays action menu buttons for each item', async () => {
      renderComponent();

      await waitFor(() => {
        const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
        expect(menuButtons).toHaveLength(2);
      });
    });

    test('displays edit option in action menu', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('2025-04')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
      });
    });

    test('displays delete option in action menu', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('2025-04')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });
    });
  });

  describe('delete functionality', () => {
    test('calls delete when delete menu item clicked and confirmed', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(true);
      examSessionSubjectService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('2025-04')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete/i }));

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this exam session subject?');
        expect(examSessionSubjectService.delete).toHaveBeenCalledWith('1');
      });
    });

    test('does not delete when cancelled', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('2025-04')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete/i }));

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
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(true);
      examSessionSubjectService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('2025-04')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete/i }));

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
