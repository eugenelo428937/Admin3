import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import WorkAddressStep from '../User/steps/WorkAddressStep';

vi.mock('../Address/SmartAddressInput', () => {
  return function MockSmartAddressInput({ fieldPrefix }) {
    return <div data-testid={`smart-address-${fieldPrefix}`}>SmartAddressInput</div>;
  };
});

vi.mock('../Address/DynamicAddressForm', () => {
  return function MockDynamicAddressForm({ fieldPrefix }) {
    return <div data-testid={`dynamic-form-${fieldPrefix}`}>DynamicAddressForm</div>;
  };
});

vi.mock('../User/ValidatedPhoneInput', () => {
  return function MockValidatedPhoneInput({ name, label }) {
    return <input data-testid={`phone-${name}`} aria-label={label} />;
  };
});

const theme = createTheme();
const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('WorkAddressStep', () => {
  const defaultProps = {
    initialData: { showWorkSection: false },
    onDataChange: vi.fn(),
    errors: {},
    mode: 'registration',
  };

  test('renders Add Work Address button', () => {
    renderWithTheme(<WorkAddressStep {...defaultProps} />);
    expect(screen.getByText(/add work address/i)).toBeInTheDocument();
  });

  test('shows work fields after clicking Add Work Address', () => {
    renderWithTheme(<WorkAddressStep {...defaultProps} />);
    fireEvent.click(screen.getByText(/add work address/i));
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
  });

  test('renders work address fields when initialData has showWorkSection=true', () => {
    renderWithTheme(
      <WorkAddressStep
        {...defaultProps}
        initialData={{ showWorkSection: true, work_company: 'Acme Corp' }}
      />
    );
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
  });
});
