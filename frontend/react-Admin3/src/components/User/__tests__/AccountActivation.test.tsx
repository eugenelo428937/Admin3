import { vi } from 'vitest';
const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams('uid=test-uid&token=test-token');
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => mockNavigate),
  useSearchParams: vi.fn(() => [mockSearchParams]),
}));

const mockActivateAccount = vi.fn();
vi.mock('../../../services/authService.ts', () => ({
  __esModule: true,
  default: { activateAccount: (...args: any[]) => mockActivateAccount(...args) },
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AccountActivation from '../AccountActivation.tsx';

describe('AccountActivation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
