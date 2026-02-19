// src/components/admin/user-profiles/__tests__/UserProfileList.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminUserProfileList from '../UserProfileList';

// Mock useAuth
jest.mock('../../../../hooks/useAuth', () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth';

// Mock userProfileService
jest.mock('../../../../services/userProfileService', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    list: jest.fn(),
  },
}));

import userProfileService from '../../../../services/userProfileService';

const theme = createTheme();

const mockProfiles = [
  {
    id: '1',
    user: { email: 'john@example.com', first_name: 'John', last_name: 'Doe' },
    title: 'Mr',
  },
  {
    id: '2',
    user: { email: 'jane@example.com', first_name: 'Jane', last_name: 'Smith' },
    title: 'Ms',
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AdminUserProfileList />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AdminUserProfileList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    userProfileService.list.mockResolvedValue({ results: mockProfiles, count: mockProfiles.length });
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /user profiles/i })).toBeInTheDocument();
      });
    });

    test('renders loading state initially', () => {
      userProfileService.list.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('does not render a create button (read-only list)', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /user profiles/i })).toBeInTheDocument();
      });

      expect(screen.queryByRole('link', { name: /add new/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /create/i })).not.toBeInTheDocument();
    });
  });

  describe('data display', () => {
    test('fetches and displays user profiles', async () => {
      renderComponent();

      await waitFor(() => {
        expect(userProfileService.list).toHaveBeenCalled();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });

    test('displays profile names', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('Jane')).toBeInTheDocument();
        expect(screen.getByText('Doe')).toBeInTheDocument();
        expect(screen.getByText('Smith')).toBeInTheDocument();
      });
    });

    test('displays edit buttons for each profile', async () => {
      renderComponent();

      await waitFor(() => {
        const editButtons = screen.getAllByRole('link', { name: /edit/i });
        expect(editButtons).toHaveLength(2);
      });
    });

    test('does not display delete buttons', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      expect(screen.queryAllByRole('button', { name: /delete/i })).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      userProfileService.list.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch user profiles/i)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    test('displays empty message when no user profiles', async () => {
      userProfileService.list.mockResolvedValueOnce({ results: [], count: 0 });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no user profiles found/i)).toBeInTheDocument();
      });
    });
  });

});
