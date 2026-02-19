import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PreferencesStep from '../User/steps/PreferencesStep';

const theme = createTheme();
const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('PreferencesStep', () => {
  const defaultProps = {
    initialData: { send_invoices_to: 'HOME', send_study_material_to: 'HOME' },
    onDataChange: jest.fn(),
    errors: {},
    mode: 'registration',
    hasWorkAddress: false,
  };

  test('renders delivery preferences', () => {
    renderWithTheme(<PreferencesStep {...defaultProps} />);
    expect(screen.getByText(/send invoices to/i)).toBeInTheDocument();
    expect(screen.getByText(/send study materials to/i)).toBeInTheDocument();
  });

  test('disables WORK option when no work address', () => {
    renderWithTheme(<PreferencesStep {...defaultProps} />);
    const workRadios = screen.getAllByLabelText(/work address/i);
    workRadios.forEach(radio => {
      expect(radio).toBeDisabled();
    });
  });

  test('enables WORK option when hasWorkAddress is true', () => {
    renderWithTheme(<PreferencesStep {...defaultProps} hasWorkAddress={true} />);
    const workRadios = screen.getAllByLabelText(/work address/i);
    workRadios.forEach(radio => {
      expect(radio).not.toBeDisabled();
    });
  });
});
