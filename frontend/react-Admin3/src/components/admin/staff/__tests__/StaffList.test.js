import { vi } from 'vitest';
// src/components/admin/staff/__tests__/StaffList.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AdminStaffList from '../StaffList.tsx';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.tsx', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.tsx';

// Mock staffService
vi.mock('../../../../services/staffService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  },
}));

import staffService from '../../../../services/staffService';

const mockStaff = [
  {
    id: '1',
    user_detail: { email: 'admin@example.com', first_name: 'Admin', last_name: 'User' },
  },
  {
    id: '2',
    user_detail: { email: 'staff@example.com', first_name: 'Staff', last_name: 'Member' },
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AdminStaffList />
    </BrowserRouter>
  );
};

describe('AdminStaffList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    staffService.list.mockResolvedValue({ results: mockStaff, count: mockStaff.length });
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /staff/i })).toBeInTheDocument();
      });
    });

    test('renders loading state initially', () => {
      staffService.list.mockReturnValue(new Promise(() => {}));
      renderComponent();

      // AdminDataTable shows Skeleton loading state instead of data
      expect(screen.queryByText('admin@example.com')).not.toBeInTheDocument();
    });

    test('renders add new staff button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add new staff/i })).toBeInTheDocument();
      });
    });
  });

  describe('data display', () => {
    test('fetches and displays staff members', async () => {
      renderComponent();

      await waitFor(() => {
        expect(staffService.list).toHaveBeenCalled();
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
        expect(screen.getByText('staff@example.com')).toBeInTheDocument();
      });
    });

    test('displays staff names', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('User')).toBeInTheDocument();
        expect(screen.getByText('Member')).toBeInTheDocument();
      });
    });

    test('displays action menus for each staff member', async () => {
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
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });
    });
  });

  describe('delete functionality', () => {
    test('calls delete when delete menu item clicked and confirmed', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(true);
      staffService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete/i }));

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this staff member?');
        expect(staffService.delete).toHaveBeenCalledWith('1');
      });
    });

    test('does not delete when cancelled', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete/i }));

      expect(staffService.delete).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      staffService.list.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch staff/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(true);
      staffService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to delete staff member/i)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    test('displays empty message when no staff members', async () => {
      staffService.list.mockResolvedValueOnce({ results: [], count: 0 });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no staff members found/i)).toBeInTheDocument();
      });
    });
  });
});
