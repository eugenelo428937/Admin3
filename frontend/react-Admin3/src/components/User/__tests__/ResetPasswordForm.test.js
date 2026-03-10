import { vi } from 'vitest';
const mockNavigate = vi.fn();
const mockLocation = { search: '?uid=test-uid&token=test-token' };
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

const mockConfirmPasswordReset = vi.fn();
vi.mock('../../../services/authService', () => ({
  __esModule: true,
  default: { confirmPasswordReset: (...args) => mockConfirmPasswordReset(...args) },
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ResetPasswordForm from '../ResetPasswordForm';

describe('ResetPasswordForm', () => {
  const renderWithTheme = (component) => {
    return render(<ThemeProvider theme={createTheme({ palette: { bpp: { granite: { '030': '#e0e0e0', '090': '#212121' } } } })}>{component}</ThemeProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '?uid=test-uid&token=test-token';
  });

  test('renders form', () => {
    renderWithTheme(<ResetPasswordForm />);
    expect(screen.getByText(/set new password/i)).toBeInTheDocument();
  });

  test('validates matching passwords', async () => {
    const user = userEvent.setup({ delay: null });
    mockConfirmPasswordReset.mockResolvedValue({ status: 'success' });
    renderWithTheme(<ResetPasswordForm />);
    await user.type(screen.getByPlaceholderText(/enter new password/i), 'ValidPass123');
    await user.type(screen.getByPlaceholderText(/confirm new password/i), 'ValidPass123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));
    await waitFor(() => expect(mockConfirmPasswordReset).toHaveBeenCalled());
  });
});
