import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import HomeAddressStep from '../User/steps/HomeAddressStep';

vi.mock('../Address/SmartAddressInput', () => {
  return function MockSmartAddressInput({ fieldPrefix }) {
    return <div data-testid={`smart-address-${fieldPrefix}`}>SmartAddressInput</div>;
  };
});

vi.mock('../Address/DynamicAddressForm', () => {
  return function MockDynamicAddressForm({ fieldPrefix, readonly }) {
    return <div data-testid={`dynamic-form-${fieldPrefix}`} data-readonly={readonly}>DynamicAddressForm</div>;
  };
});

const theme = createTheme();
const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('HomeAddressStep', () => {
  const defaultProps = {
    initialData: { home_country: '', home_address: '', home_city: '', home_postal_code: '' },
    onDataChange: vi.fn(),
    errors: {},
    mode: 'registration',
  };

  test('renders home address heading', () => {
    renderWithTheme(<HomeAddressStep {...defaultProps} />);
    expect(screen.getByText(/home address/i)).toBeInTheDocument();
  });

  test('renders SmartAddressInput in registration mode', () => {
    renderWithTheme(<HomeAddressStep {...defaultProps} />);
    expect(screen.getByTestId('smart-address-home')).toBeInTheDocument();
  });

  test('renders readonly DynamicAddressForm when readOnly=true', () => {
    renderWithTheme(
      <HomeAddressStep
        {...defaultProps}
        initialData={{ ...defaultProps.initialData, home_country: 'United Kingdom' }}
        readOnly={true}
      />
    );
    const form = screen.getByTestId('dynamic-form-home');
    expect(form).toHaveAttribute('data-readonly', 'true');
  });
});
