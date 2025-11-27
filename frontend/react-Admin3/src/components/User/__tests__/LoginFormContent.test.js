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
import { expectNoA11yViolations, wcag21AAConfig } from '../../../test-utils/accessibilityHelpers';

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

  describe('Email Validation (T054)', () => {
    test('allows valid email format input', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'valid@example.com');

      // Input should accept valid email format
      expect(mockProps.handleInputChange).toHaveBeenCalled();
    });

    test('allows invalid email format to be entered (validation handled by parent)', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');

      // Component accepts input, parent handles validation
      expect(mockProps.handleInputChange).toHaveBeenCalled();
    });

    test('handles empty email field', () => {
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('');
      expect(emailInput).toBeRequired();
    });

    test('email field has correct type attribute', () => {
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    test('email field has autocomplete attribute for browsers', () => {
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });
  });

  describe('Password Validation (T055)', () => {
    test('allows password input', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'password123');

      expect(mockProps.handleInputChange).toHaveBeenCalled();
    });

    test('handles empty password field', () => {
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveValue('');
      expect(passwordInput).toBeRequired();
    });

    test('password field has correct type attribute for masking', () => {
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('password field has autocomplete attribute for browsers', () => {
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    test('handles special characters in password', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'P@ssw0rd!#$%');

      expect(mockProps.handleInputChange).toHaveBeenCalled();
    });

    test('handles very long password input', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const passwordInput = screen.getByLabelText(/password/i);
      const longPassword = 'a'.repeat(100);
      await user.type(passwordInput, longPassword);

      expect(mockProps.handleInputChange).toHaveBeenCalled();
    });
  });

  describe('Form Submission Validation (T059)', () => {
    test('submits form when both fields have valid data', async () => {
      const user = userEvent.setup();
      const propsWithData = {
        ...mockProps,
        formData: { email: 'valid@example.com', password: 'password123' },
      };
      renderWithTheme(<LoginFormContent {...propsWithData} />);

      const loginButton = screen.getByRole('button', { name: /^login$/i });
      await user.click(loginButton);

      expect(mockProps.handleLogin).toHaveBeenCalled();
    });

    test('allows submission with empty fields (validation is parent responsibility)', async () => {
      const user = userEvent.setup();
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const loginButton = screen.getByRole('button', { name: /^login$/i });
      await user.click(loginButton);

      // Component allows submission, parent handles validation
      expect(mockProps.handleLogin).toHaveBeenCalled();
    });

    test('form uses noValidate to defer validation to parent', () => {
      const { container } = renderWithTheme(<LoginFormContent {...mockProps} />);

      const form = container.querySelector('form');
      expect(form).toHaveAttribute('noValidate');
    });
  });

  describe('Accessibility (T077 - WCAG 2.1 AA)', () => {
    test('has no accessibility violations', async () => {
      const { container } = renderWithTheme(<LoginFormContent {...mockProps} />);
      await expectNoA11yViolations(container, wcag21AAConfig);
    });

    test('has no accessibility violations when error is displayed', async () => {
      const propsWithError = {
        ...mockProps,
        loginError: 'Invalid email or password',
      };
      const { container } = renderWithTheme(<LoginFormContent {...propsWithError} />);
      await expectNoA11yViolations(container, wcag21AAConfig);
    });

    test('has no accessibility violations when loading', async () => {
      const propsLoading = {
        ...mockProps,
        isLoading: true,
      };
      const { container } = renderWithTheme(<LoginFormContent {...propsLoading} />);
      await expectNoA11yViolations(container, wcag21AAConfig);
    });

    test('form inputs have proper labels', () => {
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('submit button has accessible name', () => {
      renderWithTheme(<LoginFormContent {...mockProps} />);

      const loginButton = screen.getByRole('button', { name: /^login$/i });
      expect(loginButton).toBeInTheDocument();
    });

    test('error message is announced to screen readers', () => {
      const propsWithError = {
        ...mockProps,
        loginError: 'Invalid email or password',
      };
      renderWithTheme(<LoginFormContent {...propsWithError} />);

      // Error should be in an element with role="alert" for screen readers
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toBeInTheDocument();
    });
  });
});
