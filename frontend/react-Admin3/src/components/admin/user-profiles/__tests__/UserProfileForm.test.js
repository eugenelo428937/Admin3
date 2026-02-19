// src/components/admin/user-profiles/__tests__/UserProfileForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdminUserProfileForm from '../UserProfileForm';

// Mock useAuth
jest.mock('../../../../hooks/useAuth', () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth';

// Mock navigate function
const mockNavigate = jest.fn();

// Create mock for react-router-dom
jest.mock('react-router-dom', () => {
  return {
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
    Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  };
});

// Mock userProfileService
jest.mock('../../../../services/userProfileService', () => ({
  __esModule: true,
  default: {
    getById: jest.fn(),
    update: jest.fn(),
    getAddresses: jest.fn(),
    getContacts: jest.fn(),
    getEmails: jest.fn(),
  },
}));

import userProfileService from '../../../../services/userProfileService';

const theme = createTheme();

// Helper to set mock useParams
const setMockParams = (params) => {
  require('react-router-dom').useParams = jest.fn().mockReturnValue(params);
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
    send_invoices_to: 'Home',
    send_study_material_to: 'Office',
    remarks: 'VIP student',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    userProfileService.getById.mockResolvedValue(mockProfileData);
    userProfileService.getAddresses.mockResolvedValue([]);
    userProfileService.getContacts.mockResolvedValue([]);
    userProfileService.getEmails.mockResolvedValue([]);
  });

  describe('rendering', () => {
    test('renders edit form title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit user profile/i })).toBeInTheDocument();
      });
    });

    test('renders title field label', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });
    });

    test('renders send invoices to field label', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Send Invoices To')).toBeInTheDocument();
      });
    });

    test('renders send study material to field label', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Send Study Material To')).toBeInTheDocument();
      });
    });

    test('renders remarks field label', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Remarks')).toBeInTheDocument();
      });
    });
  });

  describe('data loading', () => {
    test('fetches profile data on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(userProfileService.getById).toHaveBeenCalledWith('1');
      });
    });

    test('fetches addresses on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(userProfileService.getAddresses).toHaveBeenCalledWith('1');
      });
    });

    test('fetches contacts on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(userProfileService.getContacts).toHaveBeenCalledWith('1');
      });
    });

    test('fetches emails on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(userProfileService.getEmails).toHaveBeenCalledWith('1');
      });
    });

    test('displays fetched title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Mr')).toBeInTheDocument();
      });
    });

    test('displays fetched send invoices to value', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Home')).toBeInTheDocument();
      });
    });

    test('displays fetched send study material to value', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Office')).toBeInTheDocument();
      });
    });

    test('displays fetched remarks', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByDisplayValue('VIP student')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    test('navigates to list on cancel', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Mr')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/user-profiles');
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
