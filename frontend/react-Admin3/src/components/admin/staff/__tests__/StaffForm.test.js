import { vi } from 'vitest';
// src/components/admin/staff/__tests__/StaffForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import AdminStaffForm from '../StaffForm.js';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.tsx', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.tsx';

// Mock navigate function
const mockNavigate = vi.fn();

// Create mock for react-router-dom
vi.mock('react-router-dom', () => {
  return {
    useNavigate: vi.fn(() => mockNavigate),
    useParams: vi.fn(() => ({})),
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
  };
});

// Mock staffService
vi.mock('../../../../services/staffService.js', () => ({
  __esModule: true,
  default: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

import staffService from '../../../../services/staffService.js';

const theme = appTheme;

// import gets the mocked version since vi.mock is hoisted
import { useParams } from 'react-router-dom';
import appTheme from '../../../../theme';
const setMockParams = (params) => {
  useParams.mockReturnValue(params);
};

const renderComponent = (isEditMode = false) => {
  if (isEditMode) {
    setMockParams({ id: '1' });
  } else {
    setMockParams({});
  }

  return render(
    <ThemeProvider theme={theme}>
      <AdminStaffForm />
    </ThemeProvider>
  );
};

describe('AdminStaffForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
  });

  describe('create mode', () => {
    test('renders create form title', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /add new staff member/i })).toBeInTheDocument();
    });

    test('renders user field label', () => {
      renderComponent();
      expect(screen.getByText(/user \(id or email\)/i)).toBeInTheDocument();
    });

    test('renders active checkbox', () => {
      renderComponent();
      expect(screen.getByRole('checkbox', { name: /active/i })).toBeInTheDocument();
    });

    test('active checkbox is checked by default', () => {
      renderComponent();
      expect(screen.getByRole('checkbox', { name: /active/i })).toBeChecked();
    });

    test('renders create button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /create staff member/i })).toBeInTheDocument();
    });

    test('renders cancel button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('shows validation error when user is empty on submit', async () => {
      renderComponent();

      const submitButton = screen.getByRole('button', { name: /create staff member/i });
      fireEvent.submit(submitButton.closest('form'));

      await waitFor(() => {
        const matches = screen.getAllByText(/please provide a user/i);
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('edit mode', () => {
    const mockStaffData = {
      id: '1',
      user: 'admin@example.com',
      is_active: true,
    };

    beforeEach(() => {
      staffService.getById.mockResolvedValue(mockStaffData);
    });

    test('renders edit form title', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit staff member/i })).toBeInTheDocument();
      });
    });

    test('fetches staff data on mount', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(staffService.getById).toHaveBeenCalledWith('1');
      });
    });

    test('displays fetched user email', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('admin@example.com')).toBeInTheDocument();
      });
    });

    test('shows update button in edit mode', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update staff member/i })).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    test('navigates to list on cancel', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/staff');
    });
  });

  describe('error handling', () => {
    test('shows error when fetch fails in edit mode', async () => {
      staffService.getById.mockRejectedValueOnce(new Error('Fetch error'));

      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch staff/i)).toBeInTheDocument();
      });
    });
  });
});
