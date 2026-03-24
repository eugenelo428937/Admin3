import { vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AdminSubjectList from '../SubjectList.tsx';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.tsx', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.tsx';

// Mock subjectService
vi.mock('../../../../services/subjectService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  },
}));

import subjectService from '../../../../services/subjectService';

const mockSubjects = [
  {
    id: '1',
    code: 'CM2',
    description: 'Financial Mathematics and Communication',
    active: true,
  },
  {
    id: '2',
    code: 'SA1',
    description: 'Actuarial Statistics',
    active: false,
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AdminSubjectList />
    </BrowserRouter>
  );
};

describe('AdminSubjectList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    (subjectService.list as any).mockResolvedValue({ results: mockSubjects, count: mockSubjects.length });
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /subjects/i })).toBeInTheDocument();
      });
    });

    test('renders loading state initially', () => {
      (subjectService.list as any).mockReturnValue(new Promise(() => {}));
      renderComponent();

      // AdminDataTable shows Skeleton loading state instead of data
      expect(screen.queryByText('CM2')).not.toBeInTheDocument();
    });

    test('renders add new subject button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add new subject/i })).toBeInTheDocument();
      });
    });

    test('renders upload subject button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload subject/i })).toBeInTheDocument();
      });
    });

    test('renders table headers', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Code')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });
  });

  describe('data display', () => {
    test('fetches and displays subjects', async () => {
      renderComponent();

      await waitFor(() => {
        expect(subjectService.list).toHaveBeenCalled();
        expect(screen.getByText('CM2')).toBeInTheDocument();
        expect(screen.getByText('SA1')).toBeInTheDocument();
      });
    });

    test('displays subject descriptions', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Financial Mathematics and Communication')).toBeInTheDocument();
        expect(screen.getByText('Actuarial Statistics')).toBeInTheDocument();
      });
    });

    test('displays action menus for each subject', async () => {
      renderComponent();

      await waitFor(() => {
        const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
        expect(menuButtons).toHaveLength(2);
      });
    });

    test('displays action items in dropdown menu', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });

      // Open the first row's dropdown menu
      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /view/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });
    });
  });

  describe('delete functionality', () => {
    test('calls delete when delete menu item clicked and confirmed', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(true);
      (subjectService.delete as any).mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });

      // Open dropdown menu for first row
      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete/i }));

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this subject?');
        expect(subjectService.delete).toHaveBeenCalledWith('1');
      });
    });

    test('does not delete when cancelled', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });

      // Open dropdown menu for first row
      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete/i }));

      expect(subjectService.delete).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      (subjectService.list as any).mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch subjects/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(true);
      (subjectService.delete as any).mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });

      // Open dropdown menu for first row
      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to delete subject/i)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    test('displays empty message when no subjects', async () => {
      (subjectService.list as any).mockResolvedValueOnce({ results: [], count: 0 });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no subjects found/i)).toBeInTheDocument();
      });
    });
  });
});
