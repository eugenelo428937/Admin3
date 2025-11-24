/**
 * LoginFormContent Component Tests (T015)
 * User Story: US1 - Component Coverage Achievement
 *
 * Tests: Rendering, validation, submission, error handling
 */

// Mock react-router-dom before importing
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  BrowserRouter: ({ children }) => children
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LoginFormContent from '../LoginFormContent';

describe('LoginFormContent', () => {
  const mockProps = {
    onHide: jest.fn(),
    formData: { email: '', password: '' },
    handleInputChange: jest.fn(),
    handleLogin: jest.fn(),
    loginError: null,
    isLoading: false,
    switchToRegister: jest.fn(),
  };

  const renderWithTheme = (component) => {
    const theme = createTheme({
      liftkit: {
        spacing: {
          xs2: 8,
          md: 16,
        },
      },
      palette: {
        secondary: {
          main: '#1976d2',
        },
      },
    });
    return render(
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders login form with all fields', () => {
      renderWithTheme(<LoginFormContent {...mockProps} />);

      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    test('renders "Forgot Password?" link', () => {
      renderWithTheme(<LoginFormContent {...mockProps} />);

      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    });

    test('renders create account button', () => {
      renderWithTheme(<LoginFormContent {...mockProps} />);

      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('calls handleInputChange when email is entered', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      expect(mockProps.handleInputChange).toHaveBeenCalled();
    });

    test('calls handleInputChange when password is entered', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'password123');

      expect(mockProps.handleInputChange).toHaveBeenCalled();
    });

    test('calls handleLogin when login button is clicked', async () => {
      const user = userEvent.setup();
      const propsWithData = {
        ...mockProps,
        formData: { email: 'test@example.com', password: 'password123' },
      };
      renderWithTheme(<LoginFormContent {...propsWithData} />);

      const loginButton = screen.getByRole('button', { name: /^login$/i });
      await user.click(loginButton);

      expect(mockProps.handleLogin).toHaveBeenCalled();
    });

    test('navigates to forgot password when link is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const forgotLink = screen.getByText(/forgot password/i);
      await user.click(forgotLink);

      expect(mockProps.onHide).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/auth/forgot-password');
    });

    test('navigates to register when create account button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const createButton = screen.getByRole('button', { name: /create account/i });
      await user.click(createButton);

      expect(mockProps.onHide).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/register');
    });
  });

  describe('Error Handling', () => {
    test('displays error message when loginError is provided', () => {
      const propsWithError = {
        ...mockProps,
        loginError: 'Invalid email or password',
      };
      renderWithTheme(<LoginFormContent {...propsWithError} />);

      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });

    test('does not display error when loginError is null', () => {
      renderWithTheme(<LoginFormContent {...mockProps} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    test('disables submit button when isLoading is true', () => {
      const propsLoading = {
        ...mockProps,
        isLoading: true,
      };
      renderWithTheme(<LoginFormContent {...propsLoading} />);

      const loginButton = screen.getByRole('button', { name: /logging in/i });
      expect(loginButton).toBeDisabled();
    });

    test('enables submit button when isLoading is false', () => {
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const loginButton = screen.getByRole('button', { name: /^login$/i });
      expect(loginButton).not.toBeDisabled();
    });

    test('disables input fields when isLoading is true', () => {
      const propsLoading = {
        ...mockProps,
        isLoading: true,
      };
      renderWithTheme(<LoginFormContent {...propsLoading} />);

      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty form data', () => {
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
    });

    test('handles pre-filled form data', () => {
      const propsWithData = {
        ...mockProps,
        formData: { email: 'prefilled@example.com', password: 'prefilled123' },
      };
      renderWithTheme(<LoginFormContent {...propsWithData} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveValue('prefilled@example.com');
      expect(passwordInput).toHaveValue('prefilled123');
    });
  });
});
