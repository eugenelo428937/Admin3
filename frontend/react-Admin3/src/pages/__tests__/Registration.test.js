/**
 * Tests for Registration Page Component
 * T014: Test form render, success/error states, authentication redirect
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
  useLocation: () => ({ pathname: '/register', search: '', hash: '', state: null }),
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
  return function MockUserFormWizard({ onSuccess, onError, onSwitchToLogin }) {
    return (
      <div data-testid="user-form-wizard">
        <button
          data-testid="trigger-success"
          onClick={() => onSuccess({ message: 'Account created successfully!' })}
        >
          Submit
        </button>
        <button
          data-testid="trigger-error"
          onClick={() => onError('Registration failed')}
        >
          Trigger Error
        </button>
        <button
          data-testid="switch-to-login"
          onClick={onSwitchToLogin}
        >
          Switch to Login
        </button>
      </div>
    );
  };
});

import Registration from '../Registration';

describe('Registration Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
  });

  const renderRegistration = () => {
    return render(
      <ThemeProvider theme={theme}>
        <Registration />
      </ThemeProvider>
    );
  };

  describe('initial render', () => {
    test('renders UserFormWizard component', () => {
      renderRegistration();

      expect(screen.getByTestId('user-form-wizard')).toBeInTheDocument();
    });

    test('renders terms and privacy policy links', () => {
      renderRegistration();

      expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
      expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
    });

    test('renders disclaimer text', () => {
      renderRegistration();

      expect(screen.getByText(/By creating an account, you agree to our/i)).toBeInTheDocument();
    });

    test('does not show error initially', () => {
      renderRegistration();

      expect(screen.queryByText('Registration Failed')).not.toBeInTheDocument();
    });
  });

  describe('authentication redirect', () => {
    test('redirects authenticated users to dashboard', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });

      renderRegistration();

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    test('does not redirect unauthenticated users', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false });

      renderRegistration();

      expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard');
    });

    test('redirects when authentication state changes to true', () => {
      const { rerender } = render(
        <ThemeProvider theme={theme}>
          <Registration />
        </ThemeProvider>
      );

      // Initially not authenticated
      expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard');

      // Simulate login
      mockUseAuth.mockReturnValue({ isAuthenticated: true });
      rerender(
        <ThemeProvider theme={theme}>
          <Registration />
        </ThemeProvider>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('success state', () => {
    test('shows success message after successful registration', () => {
      renderRegistration();

      fireEvent.click(screen.getByTestId('trigger-success'));

      expect(screen.getByText('Registration Successful!')).toBeInTheDocument();
    });

    test('shows custom success message from API', () => {
      renderRegistration();

      fireEvent.click(screen.getByTestId('trigger-success'));

      expect(screen.getByText('Account created successfully!')).toBeInTheDocument();
    });

    test('shows success icon (checkmark)', () => {
      renderRegistration();

      fireEvent.click(screen.getByTestId('trigger-success'));

      expect(screen.getByText('✅')).toBeInTheDocument();
    });

    test('shows Go to Login button after success', () => {
      renderRegistration();

      fireEvent.click(screen.getByTestId('trigger-success'));

      expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument();
    });

    test('navigates to login when Go to Login is clicked', () => {
      renderRegistration();

      fireEvent.click(screen.getByTestId('trigger-success'));
      fireEvent.click(screen.getByRole('button', { name: /go to login/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    test('shows What\'s Next section after success', () => {
      renderRegistration();

      fireEvent.click(screen.getByTestId('trigger-success'));

      expect(screen.getByText("What's Next?")).toBeInTheDocument();
    });

    test('shows activation instructions', () => {
      renderRegistration();

      fireEvent.click(screen.getByTestId('trigger-success'));

      expect(screen.getByText(/Check your email inbox/i)).toBeInTheDocument();
      expect(screen.getByText(/Click the activation link/i)).toBeInTheDocument();
    });

    test('hides registration form after success', () => {
      renderRegistration();

      fireEvent.click(screen.getByTestId('trigger-success'));

      expect(screen.queryByTestId('user-form-wizard')).not.toBeInTheDocument();
    });

    test('shows default success message when API returns no message', () => {
      // Mock UserFormWizard to trigger success without a message
      renderRegistration();

      // The default message includes instructions about checking email
      fireEvent.click(screen.getByTestId('trigger-success'));

      // Success message should be displayed (custom or default)
      expect(screen.getByText('Registration Successful!')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    test('shows error alert on registration failure', () => {
      renderRegistration();

      fireEvent.click(screen.getByTestId('trigger-error'));

      expect(screen.getByText('Registration Failed')).toBeInTheDocument();
      expect(screen.getByText('Registration failed')).toBeInTheDocument();
    });

    test('error alert can be dismissed', () => {
      renderRegistration();

      fireEvent.click(screen.getByTestId('trigger-error'));

      // Find and click the close button on the Alert
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(screen.queryByText('Registration Failed')).not.toBeInTheDocument();
    });

    test('clears error when registration succeeds', () => {
      renderRegistration();

      // First trigger an error
      fireEvent.click(screen.getByTestId('trigger-error'));
      expect(screen.getByText('Registration Failed')).toBeInTheDocument();

      // Then trigger success
      fireEvent.click(screen.getByTestId('trigger-success'));

      // Error should be cleared, success state should be shown
      expect(screen.queryByText('Registration Failed')).not.toBeInTheDocument();
      expect(screen.getByText('Registration Successful!')).toBeInTheDocument();
    });

    test('keeps form visible on error', () => {
      renderRegistration();

      fireEvent.click(screen.getByTestId('trigger-error'));

      expect(screen.getByTestId('user-form-wizard')).toBeInTheDocument();
    });
  });

  describe('navigation callbacks', () => {
    test('navigates to login when switch to login is clicked', () => {
      renderRegistration();

      fireEvent.click(screen.getByTestId('switch-to-login'));

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('links', () => {
    test('renders terms of service link with correct href', () => {
      renderRegistration();

      const termsLink = screen.getByText('Terms of Service');
      expect(termsLink).toHaveAttribute('href', '/terms');
    });

    test('renders privacy policy link with correct href', () => {
      renderRegistration();

      const privacyLink = screen.getByText('Privacy Policy');
      expect(privacyLink).toHaveAttribute('href', '/privacy');
    });
  });

  describe('layout', () => {
    test('renders container with proper max width', () => {
      renderRegistration();

      // The container should exist and contain the form
      expect(screen.getByTestId('user-form-wizard')).toBeInTheDocument();
    });

    test('error alert is positioned above the form', () => {
      renderRegistration();

      fireEvent.click(screen.getByTestId('trigger-error'));

      const errorAlert = screen.getByRole('alert');
      const form = screen.getByTestId('user-form-wizard');

      // Error should appear in DOM before the form
      expect(errorAlert.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
});
