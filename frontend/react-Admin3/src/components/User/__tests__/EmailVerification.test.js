// src/components/User/__tests__/EmailVerification.test.js
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EmailVerification from '../EmailVerification';

// Mock react-router-dom
const mockNavigate = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

// Mock authService
jest.mock('../../../services/authService', () => ({
  __esModule: true,
  default: {
    verifyEmailChange: jest.fn(),
  },
}));

// Mock loggerService
jest.mock('../../../services/loggerService', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import authService from '../../../services/authService';

const theme = createTheme();

const renderComponent = () => {
  return render(
    <ThemeProvider theme={theme}>
      <EmailVerification />
    </ThemeProvider>
  );
};

describe('EmailVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe('loading state', () => {
    test('shows loading spinner initially', () => {
      mockSearchParams = new URLSearchParams({
        uid: 'test-uid',
        token: 'test-token',
        email: 'test@example.com',
      });
      authService.verifyEmailChange.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ status: 'success' }), 1000))
      );

      renderComponent();

      expect(screen.getByText(/verifying email/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    test('shows error for missing uid', async () => {
      mockSearchParams = new URLSearchParams({
        token: 'test-token',
        email: 'test@example.com',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/invalid verification link/i)).toBeInTheDocument();
      });
    });

    test('shows error for missing token', async () => {
      mockSearchParams = new URLSearchParams({
        uid: 'test-uid',
        email: 'test@example.com',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/invalid verification link/i)).toBeInTheDocument();
      });
    });

    test('shows error for missing email', async () => {
      mockSearchParams = new URLSearchParams({
        uid: 'test-uid',
        token: 'test-token',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/invalid verification link/i)).toBeInTheDocument();
      });
    });
  });

  describe('successful verification', () => {
    test('shows success message on successful verification', async () => {
      mockSearchParams = new URLSearchParams({
        uid: 'test-uid',
        token: 'test-token',
        email: 'new@example.com',
      });
      authService.verifyEmailChange.mockResolvedValueOnce({ status: 'success' });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/email verified successfully/i)).toBeInTheDocument();
      });
    });

    test('displays the new email address', async () => {
      mockSearchParams = new URLSearchParams({
        uid: 'test-uid',
        token: 'test-token',
        email: 'new@example.com',
      });
      authService.verifyEmailChange.mockResolvedValueOnce({ status: 'success' });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/new@example.com/i)).toBeInTheDocument();
      });
    });

    test('shows next steps information', async () => {
      mockSearchParams = new URLSearchParams({
        uid: 'test-uid',
        token: 'test-token',
        email: 'new@example.com',
      });
      authService.verifyEmailChange.mockResolvedValueOnce({ status: 'success' });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/what's next/i)).toBeInTheDocument();
      });
    });
  });

  describe('failed verification', () => {
    test('shows error message on failed verification', async () => {
      mockSearchParams = new URLSearchParams({
        uid: 'test-uid',
        token: 'test-token',
        email: 'new@example.com',
      });
      authService.verifyEmailChange.mockResolvedValueOnce({
        status: 'error',
        message: 'Token expired',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/token expired/i)).toBeInTheDocument();
      });
    });

    test('shows error on API exception', async () => {
      mockSearchParams = new URLSearchParams({
        uid: 'test-uid',
        token: 'test-token',
        email: 'new@example.com',
      });
      authService.verifyEmailChange.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/an error occurred during email verification/i)).toBeInTheDocument();
      });
    });

    test('shows possible reasons for failure', async () => {
      mockSearchParams = new URLSearchParams({
        uid: 'test-uid',
        token: 'test-token',
        email: 'new@example.com',
      });
      authService.verifyEmailChange.mockResolvedValueOnce({ status: 'error' });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/possible reasons/i)).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    test('navigates to profile on success', async () => {
      mockSearchParams = new URLSearchParams({
        uid: 'test-uid',
        token: 'test-token',
        email: 'new@example.com',
      });
      authService.verifyEmailChange.mockResolvedValueOnce({ status: 'success' });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to profile/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /back to profile/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    test('navigates to login page', async () => {
      mockSearchParams = new URLSearchParams({
        uid: 'test-uid',
        token: 'test-token',
        email: 'new@example.com',
      });
      authService.verifyEmailChange.mockResolvedValueOnce({ status: 'success' });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /login with new email/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /login with new email/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
