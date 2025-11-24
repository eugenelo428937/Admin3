/**
 * ForgotPasswordForm Component Tests (T016)
 * User Story: US1 - Component Coverage Achievement
 *
 * Tests: Email input, validation, submission, success/error states
 */

// Mock react-router-dom before importing
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock react-google-recaptcha-v3
const mockExecuteRecaptcha = jest.fn();
jest.mock('react-google-recaptcha-v3', () => ({
  useGoogleReCaptcha: () => ({ executeRecaptcha: mockExecuteRecaptcha }),
}));

// Mock authService
const mockRequestPasswordReset = jest.fn();
jest.mock('../../../services/authService', () => ({
  __esModule: true,
  default: {
    requestPasswordReset: (...args) => mockRequestPasswordReset(...args),
  },
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ForgotPasswordForm from '../ForgotPasswordForm';

describe('ForgotPasswordForm', () => {
  const renderWithTheme = (component) => {
    const theme = createTheme({
      palette: {
        bpp: {
          granite: {
            '010': '#f5f5f5',
            '080': '#424242',
            '090': '#212121',
          },
        },
      },
      liftkit: {
        spacing: {
          md: 16,
          lg: 24,
        },
      },
    });
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteRecaptcha.mockResolvedValue('test-recaptcha-token');
    process.env.NODE_ENV = 'development';
    process.env.REACT_APP_DISABLE_RECAPTCHA = 'true';
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

      const submitButton = screen.getByRole('button', { name: /send reset email/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    test('shows error for empty email', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithTheme(<ForgotPasswordForm />);

      const submitButton = screen.getByRole('button', { name: /send reset email/i });
      await user.click(submitButton);

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
});
