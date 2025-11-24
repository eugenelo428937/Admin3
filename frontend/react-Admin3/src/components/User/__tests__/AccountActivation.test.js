const mockNavigate = jest.fn();
const mockSearchParams = new URLSearchParams('uid=test-uid&token=test-token');
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

const mockActivateAccount = jest.fn();
jest.mock('../../../services/authService', () => ({
  __esModule: true,
  default: { activateAccount: (...args) => mockActivateAccount(...args) },
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AccountActivation from '../AccountActivation';

describe('AccountActivation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders processing state', () => {
    mockActivateAccount.mockImplementation(() => new Promise(() => {}));
    render(<AccountActivation />);
    expect(screen.getByText(/activating/i)).toBeInTheDocument();
  });

  test('handles successful activation', async () => {
    mockActivateAccount.mockResolvedValue({ status: 'success', message: 'Account activated' });
    render(<AccountActivation />);
    await waitFor(() => expect(screen.getByText(/success/i)).toBeInTheDocument(), { timeout: 3000 });
  });
});
