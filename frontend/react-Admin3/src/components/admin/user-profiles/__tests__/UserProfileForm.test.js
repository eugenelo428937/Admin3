import { vi } from 'vitest';
// src/components/admin/user-profiles/__tests__/UserProfileForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdminUserProfileForm from '../UserProfileForm';

// Mock useAuth
vi.mock('../../../../hooks/useAuth', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth';

// Mock navigate function
const mockNavigate = vi.fn();

// Create mock for react-router-dom
vi.mock('react-router-dom', () => {
  return {
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
    Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  };
});

// Mock userProfileService
vi.mock('../../../../services/userProfileService', () => ({
  __esModule: true,
  default: {
    getById: vi.fn(),
    update: vi.fn(),
    getAddresses: vi.fn(),
    getContacts: vi.fn(),
  },
}));

// Mock ValidatedPhoneInput to avoid country API fetch
vi.mock('../../../User/ValidatedPhoneInput', () => {
  return function MockValidatedPhoneInput({ label, name, value, onChange }) {
    return <input aria-label={label} name={name} value={value || ''} onChange={onChange} />;
  };
});

import userProfileService from '../../../../services/userProfileService';

const theme = createTheme();

// Helper to set mock useParams
const setMockParams = (params) => {
  require('react-router-dom').useParams = vi.fn().mockReturnValue(params);
};

const renderComponent = () => {
  setMockParams({ id: '1' });

  return render(
    <ThemeProvider theme={theme}>
      <AdminUserProfileForm />
    </ThemeProvider>
  );
};

describe('AdminUserProfileForm', () => {
  const mockProfileData = {
    id: '1',
    title: 'Mr',
    user: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
    send_invoices_to: 'HOME',
    send_study_material_to: 'HOME',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    userProfileService.getById.mockResolvedValue(mockProfileData);
    userProfileService.getAddresses.mockResolvedValue([]);
    userProfileService.getContacts.mockResolvedValue([]);
  });

  describe('rendering', () => {
    test('renders edit form title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit user profile/i })).toBeInTheDocument();
      });
    });

    test('renders stepper with 4 steps', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeInTheDocument();
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Work')).toBeInTheDocument();
        expect(screen.getByText('Preferences')).toBeInTheDocument();
      });
    });

    test('renders personal info step by default', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/personal & contact information/i)).toBeInTheDocument();
      });
    });
  });

  describe('data loading', () => {
    test('fetches profile, addresses, and contacts on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(userProfileService.getById).toHaveBeenCalledWith('1');
        expect(userProfileService.getAddresses).toHaveBeenCalledWith('1');
        expect(userProfileService.getContacts).toHaveBeenCalledWith('1');
      });
    });

    test('displays fetched first name', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      });
    });

    test('displays fetched last name', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      });
    });

    test('displays fetched email', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    test('navigates to list on cancel', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/personal & contact information/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/user-profiles');
    });

    test('renders save and next buttons', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    test('shows error when fetch fails', async () => {
      userProfileService.getById.mockRejectedValueOnce(new Error('Fetch error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch user profile/i)).toBeInTheDocument();
      });
    });
  });
});
