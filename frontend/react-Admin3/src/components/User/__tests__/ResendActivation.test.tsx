import { vi } from 'vitest';
// src/components/User/__tests__/ResendActivation.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import ResendActivation from '../ResendActivation.tsx';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => mockNavigate),
}));

// Mock authService
vi.mock('../../../services/authService.js', () => ({
  __esModule: true,
  default: {
    resendActivationEmail: vi.fn(),
  },
}));

import authService from '../../../services/authService.js';

import appTheme from '../../../theme';
const theme = appTheme;

const renderComponent = () => {
  return render(
    <ThemeProvider theme={theme}>
      <ResendActivation />
    </ThemeProvider>
  );
};

describe('ResendActivation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    test('renders title and description', () => {
      renderComponent();
      expect(screen.getByText('Resend Activation Email')).toBeInTheDocument();
      expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
    });

    test('renders email input field', () => {
      renderComponent();
      expect(screen.getByPlaceholderText(/enter your email address/i)).toBeInTheDocument();
    });

    test('renders submit button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /send activation email/i })).toBeInTheDocument();
    });

    test('renders back to login button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    test('shows error for empty email', async () => {
      renderComponent();

      // Use fireEvent.submit to bypass HTML5 native validation
      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText(/please enter your email address/i)).toBeInTheDocument();
      });
    });

    test('shows error for invalid email format', async () => {
      renderComponent();

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      fireEvent.change(emailInput, {
        target: { value: 'invalid-email' },
      });
      // Use fireEvent.submit to bypass HTML5 native validation
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    test('shows success message on successful submission', async () => {
      (authService.resendActivationEmail as any).mockResolvedValueOnce({
        status: 'success',
        message: 'Activation email sent successfully!',
      });

      renderComponent();

      fireEvent.change(screen.getByPlaceholderText(/enter your email address/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /send activation email/i }));

      await waitFor(() => {
        expect(screen.getByText(/activation email sent successfully/i)).toBeInTheDocument();
      });
    });

    test('shows error message on failed submission', async () => {
      (authService.resendActivationEmail as any).mockResolvedValueOnce({
        status: 'error',
        message: 'Account not found',
      });

      renderComponent();

      fireEvent.change(screen.getByPlaceholderText(/enter your email address/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /send activation email/i }));

      await waitFor(() => {
        expect(screen.getByText(/account not found/i)).toBeInTheDocument();
      });
    });

    test('shows loading state during submission', async () => {
      (authService.resendActivationEmail as any).mockImplementation(
        () => new Promise((resolve: any) => setTimeout(() => resolve({ status: 'success' }), 100))
      );

      renderComponent();

      fireEvent.change(screen.getByPlaceholderText(/enter your email address/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /send activation email/i }));

      expect(screen.getByText(/sending/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/sending/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    test('navigates to login on back button click', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /back to login/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
    });

    test('shows back to login button after success', async () => {
      (authService.resendActivationEmail as any).mockResolvedValueOnce({
        status: 'success',
        message: 'Email sent!',
      });

      renderComponent();

      fireEvent.change(screen.getByPlaceholderText(/enter your email address/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /send activation email/i }));

      await waitFor(() => {
        const backButtons = screen.getAllByRole('button', { name: /back to login/i });
        expect(backButtons.length).toBeGreaterThan(0);
      });
    });
  });
});
