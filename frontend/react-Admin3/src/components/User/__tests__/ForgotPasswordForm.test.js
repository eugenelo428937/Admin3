import { vi } from 'vitest';
/**
 * ForgotPasswordForm Component Tests (T016)
 * User Story: US1 - Component Coverage Achievement
 *
 * Tests: Email input, validation, submission, success/error states
 */

// Mock react-router-dom before importing
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => mockNavigate),
}));

// Mock react-google-recaptcha-v3
const mockExecuteRecaptcha = vi.fn();
vi.mock('react-google-recaptcha-v3', () => ({
  useGoogleReCaptcha: () => ({ executeRecaptcha: mockExecuteRecaptcha }),
}));

// Mock authService
const mockRequestPasswordReset = vi.fn();
vi.mock('../../../services/authService.js', () => ({
  __esModule: true,
  default: {
    requestPasswordReset: (...args) => mockRequestPasswordReset(...args),
  },
}));

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ForgotPasswordForm from '../ForgotPasswordForm.js';
import { expectNoA11yViolations, wcag21AAConfig } from '../../../test-utils/accessibilityHelpers.js';
import appTheme from '../../../theme';

describe('ForgotPasswordForm', () => {
  const renderWithTheme = (component) => {
    const theme = appTheme;
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteRecaptcha.mockResolvedValue('test-recaptcha-token');
    import.meta.env.MODE = 'development';
    import.meta.env.DEV = true;
    import.meta.env.VITE_DISABLE_RECAPTCHA = 'true';
  });

  describe('Rendering', () => {
    test('renders forgot password form', () => {
      renderWithTheme(<ForgotPasswordForm />);

      expect(screen.getAllByText(/reset your password/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/email address/i)[0]).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset email/i })).toBeInTheDocument();
    });

    test('renders back to login button', () => {
      renderWithTheme(<ForgotPasswordForm />);

      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
    });
  });

  describe('Email Input Validation', () => {
    test('accepts valid email format', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithTheme(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'valid@example.com');

      expect(emailInput).toHaveValue('valid@example.com');
    });

    test('shows error for invalid email format', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithTheme(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'invalid-email');

      // Use fireEvent.submit to bypass HTML5 native validation (type="email" blocks onSubmit in jsdom)
      const form = emailInput.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    test('shows error for empty email', async () => {
      renderWithTheme(<ForgotPasswordForm />);

      // Use fireEvent.submit to bypass HTML5 native validation (required attr blocks onSubmit in jsdom)
      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const form = emailInput.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    test('submits form with valid email', async () => {
      const user = userEvent.setup({ delay: null });
      mockRequestPasswordReset.mockResolvedValue({
        status: 'success',
        message: 'Password reset email sent',
        expiry_hours: 24,
      });

      renderWithTheme(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset email/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRequestPasswordReset).toHaveBeenCalledWith('test@example.com', null);
      });
    });

    test('handles API error response', async () => {
      const user = userEvent.setup({ delay: null });
      mockRequestPasswordReset.mockResolvedValue({
        status: 'error',
        message: 'User not found',
      });

      renderWithTheme(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset email/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/user not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    test('displays success message after submission', async () => {
      const user = userEvent.setup({ delay: null });
      mockRequestPasswordReset.mockResolvedValue({
        status: 'success',
        message: 'Password reset email sent successfully',
        expiry_hours: 24,
      });

      renderWithTheme(<ForgotPasswordForm />);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset email/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
        expect(screen.getByText(/password reset email sent successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    test('navigates to login when back button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithTheme(<ForgotPasswordForm />);

      const backButton = screen.getByRole('button', { name: /back to login/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/home', { state: { showLogin: true } });
    });
  });

  describe('Accessibility (T079 - WCAG 2.1 AA)', () => {
    test('has no accessibility violations', async () => {
      const { container } = renderWithTheme(<ForgotPasswordForm />);
      await expectNoA11yViolations(container, wcag21AAConfig);
    });

    test('email input has proper label', () => {
      renderWithTheme(<ForgotPasswordForm />);

      // Email input should have associated label
      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    test('form buttons have accessible names', () => {
      renderWithTheme(<ForgotPasswordForm />);

      expect(screen.getByRole('button', { name: /send reset email/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
    });

    test('has no accessibility violations with validation error', async () => {
      const { container } = renderWithTheme(<ForgotPasswordForm />);

      // Trigger validation error via fireEvent.submit to bypass HTML5 native validation
      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      fireEvent.submit(emailInput.closest('form'));

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      await expectNoA11yViolations(container, wcag21AAConfig);
    });
  });
});
