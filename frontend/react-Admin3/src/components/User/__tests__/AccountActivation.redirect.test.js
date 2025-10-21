/**
 * Unit Tests for AccountActivation Redirect to Products
 * Tests that successful account activation redirects to /products page
 */

// Mock react-router-dom before importing
const mockNavigate = jest.fn();
const mockSearchParams = new URLSearchParams();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
  BrowserRouter: ({ children }) => children
}));

// Mock authService
const mockActivateAccount = jest.fn();
jest.mock('../../../services/authService', () => ({
  __esModule: true,
  default: {
    activateAccount: (...args) => mockActivateAccount(...args)
  }
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AccountActivation from '../AccountActivation';

describe('AccountActivation Redirect to Products', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.set('uid', 'test-uid-123');
    mockSearchParams.set('token', 'test-token-456');
  });

  afterEach(() => {
    mockSearchParams.delete('uid');
    mockSearchParams.delete('token');
  });

  it('should redirect to /products after successful account activation', async () => {
    // Mock successful activation
    mockActivateAccount.mockResolvedValue({
      status: 'success',
      message: 'Account activated successfully! You can now log in.'
    });

    render(
      <BrowserRouter>
        <AccountActivation />
      </BrowserRouter>
    );

    // Wait for activation to complete and success button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Go to Login/i })).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify authService.activateAccount was called with correct params
    expect(mockActivateAccount).toHaveBeenCalledWith('test-uid-123', 'test-token-456');

    // THIS SHOULD FAIL - we expect navigation to /products but currently goes nowhere
    expect(mockNavigate).toHaveBeenCalledWith('/products');
  });

  it('should not redirect on activation failure', async () => {
    // Mock failed activation
    mockActivateAccount.mockResolvedValue({
      status: 'error',
      message: 'Activation link has expired'
    });

    render(
      <BrowserRouter>
        <AccountActivation />
      </BrowserRouter>
    );

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(/Account Activation Failed/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should NOT navigate on error
    expect(mockNavigate).not.toHaveBeenCalledWith('/products');
  });
});
