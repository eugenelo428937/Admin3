import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SecurityStep from '../User/steps/SecurityStep';

const theme = createTheme();
const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('SecurityStep', () => {
  const defaultProps = {
    initialData: { password: '', confirmPassword: '' },
    onDataChange: vi.fn(),
    errors: {},
    mode: 'registration',
  };

  test('renders password fields in registration mode', () => {
    renderWithTheme(<SecurityStep {...defaultProps} />);
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  test('shows Change Password button in profile mode', () => {
    renderWithTheme(<SecurityStep {...defaultProps} mode="profile" />);
    expect(screen.getByText(/change password/i)).toBeInTheDocument();
  });

  test('does not render in admin mode', () => {
    renderWithTheme(<SecurityStep {...defaultProps} mode="admin" />);
    expect(screen.queryByLabelText(/^password/i)).not.toBeInTheDocument();
    expect(screen.getByText(/not available/i)).toBeInTheDocument();
  });
});
