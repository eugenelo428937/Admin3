/**
 * Tests for ProfilePage Component
 * T013: Test authentication redirect, breadcrumb navigation, UserFormWizard integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme/theme';

// Create mockNavigate at module level
const mockNavigate = jest.fn();

// Override useNavigate from the global mock in setupTests.js
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/profile', search: '', hash: '', state: null }),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  MemoryRouter: ({ children }) => children,
  BrowserRouter: ({ children }) => children,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  NavLink: ({ children, to }) => <a href={to}>{children}</a>,
  Navigate: () => null,
  Routes: ({ children }) => children,
  Route: ({ element }) => element,
  Outlet: () => null,
}));

// Mock useAuth hook
const mockUseAuth = jest.fn();
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock UserFormWizard
jest.mock('../../components/User/UserFormWizard', () => {
  return function MockUserFormWizard({ mode, onSuccess, onError }) {
    return (
      <div data-testid="user-form-wizard" data-mode={mode}>
        <span>Mode: {mode}</span>
        <button
          data-testid="trigger-success"
          onClick={() => onSuccess({ message: 'Profile updated' })}
        >
          Trigger Success
        </button>
        <button
          data-testid="trigger-error"
          onClick={() => onError('Update failed')}
        >
          Trigger Error
        </button>
      </div>
    );
  };
});

import ProfilePage from '../ProfilePage';

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
  });

  const renderProfilePage = () => {
    return render(
      <ThemeProvider theme={theme}>
        <ProfilePage />
      </ThemeProvider>
    );
  };

  describe('authentication', () => {
    test('renders profile page when authenticated', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      renderProfilePage();

      expect(screen.getByTestId('user-form-wizard')).toBeInTheDocument();
    });

    test('redirects to login when not authenticated', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false });

      renderProfilePage();

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    test('does not render content when not authenticated', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false });

      renderProfilePage();

      expect(screen.queryByTestId('user-form-wizard')).not.toBeInTheDocument();
    });

    test('redirects when authentication state changes', () => {
      const { rerender } = render(
        <ThemeProvider theme={theme}>
          <ProfilePage />
        </ThemeProvider>
      );

      // Initially authenticated
      expect(screen.getByTestId('user-form-wizard')).toBeInTheDocument();

      // Simulate logout
      mockUseAuth.mockReturnValue({ isAuthenticated: false });
      rerender(
        <ThemeProvider theme={theme}>
          <ProfilePage />
        </ThemeProvider>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('breadcrumb navigation', () => {
    test('renders breadcrumb component', () => {
      renderProfilePage();

      expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    });

    test('shows Home link in breadcrumb', () => {
      renderProfilePage();

      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    test('shows My Profile in breadcrumb', () => {
      renderProfilePage();

      expect(screen.getByText('My Profile')).toBeInTheDocument();
    });

    test('navigates to home when Home breadcrumb is clicked', () => {
      renderProfilePage();

      const homeLink = screen.getByText('Home');
      fireEvent.click(homeLink);

      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });

    test('renders home icon in breadcrumb', () => {
      renderProfilePage();

      expect(document.querySelector('[data-testid="HomeIcon"]')).toBeInTheDocument();
    });

    test('renders person icon in breadcrumb', () => {
      renderProfilePage();

      expect(document.querySelector('[data-testid="PersonIcon"]')).toBeInTheDocument();
    });
  });

  describe('UserFormWizard integration', () => {
    test('renders UserFormWizard in profile mode', () => {
      renderProfilePage();

      const wizard = screen.getByTestId('user-form-wizard');
      expect(wizard).toHaveAttribute('data-mode', 'profile');
    });

    test('shows mode text', () => {
      renderProfilePage();

      expect(screen.getByText('Mode: profile')).toBeInTheDocument();
    });
  });

  describe('success callback', () => {
    test('handles profile update success', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      renderProfilePage();

      fireEvent.click(screen.getByTestId('trigger-success'));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Profile updated successfully:',
        { message: 'Profile updated' }
      );

      consoleSpy.mockRestore();
    });
  });

  describe('error callback', () => {
    test('handles profile update error', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderProfilePage();

      fireEvent.click(screen.getByTestId('trigger-error'));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Profile update error:',
        'Update failed'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('layout', () => {
    test('renders main container with proper styling', () => {
      renderProfilePage();

      // Check that main content area exists
      const mainBox = screen.getByTestId('user-form-wizard').parentElement;
      expect(mainBox).toBeInTheDocument();
    });

    test('renders breadcrumb container with max-width', () => {
      renderProfilePage();

      const breadcrumbNav = screen.getByRole('navigation', { name: /breadcrumb/i });
      const container = breadcrumbNav.parentElement;
      expect(container).toHaveStyle({ maxWidth: '800px' });
    });
  });
});
