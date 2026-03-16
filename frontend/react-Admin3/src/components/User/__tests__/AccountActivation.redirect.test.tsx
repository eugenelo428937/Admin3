import { vi } from 'vitest';
/**
 * Unit Tests for AccountActivation Redirect to Products
 * Tests that successful account activation redirects to /products page
 */

// Mock react-router-dom before importing
const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => mockNavigate),
  useSearchParams: vi.fn(() => [mockSearchParams]),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children
}));

// Mock authService
const mockActivateAccount = vi.fn();
vi.mock('../../../services/authService', () => ({
  __esModule: true,
  default: {
    activateAccount: (...args: any[]) => mockActivateAccount(...args)
  }
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AccountActivation from '../AccountActivation.tsx';

describe('AccountActivation Redirect to Products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.set('uid', 'test-uid-123');
    mockSearchParams.set('token', 'test-token-456');
  });

  afterEach(() => {
    mockSearchParams.delete('uid');
    mockSearchParams.delete('token');
  });

  it('should redirect to /products after successful account activation', async () => {
    vi.useFakeTimers();
    // Mock successful activation
    mockActivateAccount.mockResolvedValue({
      status: 'success',
      message: 'Account activated successfully! You can now log in.'
    });

    const { act } = await import('react');

    await act(async () => {
      render(
        <BrowserRouter>
          <AccountActivation />
        </BrowserRouter>
      );
    });

    // Wait for activation to complete - flush microtasks and timers
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Verify authService.activateAccount was called with correct params
    expect(mockActivateAccount).toHaveBeenCalledWith('test-uid-123', 'test-token-456');

    // Advance past the 10-second countdown timer
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/products');
    vi.useRealTimers();
  });

  it('should not redirect on activation failure', async () => {
    // Mock failed activation
    mockActivateAccount.mockResolvedValue({
      status: 'error',
      message: 'Activation link has expired'
    });

    const { act } = await import('react');

    await act(async () => {
      render(
        <BrowserRouter>
          <AccountActivation />
        </BrowserRouter>
      );
    });

    // Wait for error state to be set
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByText(/Account Activation Failed/i)).toBeInTheDocument();

    // Should NOT navigate on error
    expect(mockNavigate).not.toHaveBeenCalledWith('/products');
  });
});
