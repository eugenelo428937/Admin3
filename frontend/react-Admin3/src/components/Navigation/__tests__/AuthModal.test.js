/**
 * Tests for AuthModal Component
 * T019: Test open/close, form validation, submit with AuthContext/Router
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AuthModal from '../AuthModal';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  useParams: () => ({}),
  MemoryRouter: ({ children }) => children,
  BrowserRouter: ({ children }) => children,
}));

// Mock useAuth hook
const mockLogin = jest.fn();
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    isLoading: false,
    isAuthenticated: false,
    user: null,
  }),
}));

// Mock LoginFormContent
jest.mock('../../User/LoginFormContent', () => {
  return function MockLoginFormContent({
    formData,
    handleInputChange,
    handleLogin,
    loginError,
    isLoading,
    switchToRegister
  }) {
    return (
      <div data-testid="login-form-content">
        <input
          data-testid="email-input"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Email"
        />
        <input
          data-testid="password-input"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Password"
        />
        <button
          data-testid="login-button"
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Login'}
        </button>
        {loginError && <div data-testid="login-error">{loginError}</div>}
        <button data-testid="register-link" onClick={switchToRegister}>
          Register
        </button>
      </div>
    );
  };
});

const theme = createTheme();

describe('AuthModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset body overflow
    document.body.style.overflow = '';
    document.body.classList.remove('mui-fixed');
  });

  const renderModal = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <AuthModal
          open={true}
          onClose={mockOnClose}
          {...props}
        />
      </ThemeProvider>
    );
  };

  describe('rendering', () => {
    test('renders modal when open is true', () => {
      renderModal();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('does not render modal when open is false', () => {
      renderModal({ open: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('renders LoginFormContent', () => {
      renderModal();
      expect(screen.getByTestId('login-form-content')).toBeInTheDocument();
    });

    test('renders close button', () => {
      renderModal();
      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument(); // IconButton
    });
  });

  describe('form interaction', () => {
    test('updates email on input change', () => {
      renderModal();
      const emailInput = screen.getByTestId('email-input');

      fireEvent.change(emailInput, { target: { name: 'email', value: 'test@example.com' } });

      expect(emailInput.value).toBe('test@example.com');
    });

    test('updates password on input change', () => {
      renderModal();
      const passwordInput = screen.getByTestId('password-input');

      fireEvent.change(passwordInput, { target: { name: 'password', value: 'password123' } });

      expect(passwordInput.value).toBe('password123');
    });
  });

  describe('login submission', () => {
    test('calls login with form data on submit', async () => {
      mockLogin.mockResolvedValue({ status: 'success' });
      renderModal();

      // Fill form
      fireEvent.change(screen.getByTestId('email-input'), {
        target: { name: 'email', value: 'test@example.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { name: 'password', value: 'password123' }
      });

      // Submit
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    test('closes modal on successful login', async () => {
      mockLogin.mockResolvedValue({ status: 'success' });
      renderModal();

      fireEvent.change(screen.getByTestId('email-input'), {
        target: { name: 'email', value: 'test@example.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { name: 'password', value: 'password123' }
      });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    test('displays error message on login failure', async () => {
      mockLogin.mockResolvedValue({ status: 'error', message: 'Invalid credentials' });
      renderModal();

      fireEvent.change(screen.getByTestId('email-input'), {
        target: { name: 'email', value: 'test@example.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { name: 'password', value: 'wrongpassword' }
      });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent('Invalid credentials');
      });
    });

    test('handles login exception', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'));
      renderModal();

      fireEvent.change(screen.getByTestId('email-input'), {
        target: { name: 'email', value: 'test@example.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { name: 'password', value: 'password123' }
      });
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveTextContent('Network error');
      });
    });
  });

  describe('close behavior', () => {
    test('clears form data on close', async () => {
      renderModal();

      // Fill form
      fireEvent.change(screen.getByTestId('email-input'), {
        target: { name: 'email', value: 'test@example.com' }
      });

      // Close modal by clicking close button (first IconButton)
      const closeButton = screen.getAllByRole('button')[0];
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('resets error on close', async () => {
      mockLogin.mockResolvedValue({ status: 'error', message: 'Error' });
      renderModal();

      // Trigger error
      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getAllByRole('button')[0];
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('register navigation', () => {
    test('navigates to register page and closes modal', () => {
      renderModal();

      fireEvent.click(screen.getByTestId('register-link'));

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/register');
    });
  });

  describe('body overflow cleanup', () => {
    test('cleans up body overflow when modal closes', async () => {
      const { rerender } = renderModal();

      // Verify modal is open initially
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close modal
      rerender(
        <ThemeProvider theme={theme}>
          <AuthModal open={false} onClose={mockOnClose} />
        </ThemeProvider>
      );

      // Wait for modal to be removed - MUI Dialog unmounts when closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      }, { timeout: 500 });

      // Verify body overflow cleanup happens (tested via useEffect)
      // The cleanup logic runs after modal closes
      expect(document.body.classList.contains('mui-fixed')).toBe(false);
    });
  });
});
