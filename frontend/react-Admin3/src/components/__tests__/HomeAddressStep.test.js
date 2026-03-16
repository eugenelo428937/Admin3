import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import HomeAddressStep from '../User/steps/HomeAddressStep.tsx';

import appTheme from '../../theme';
vi.mock('../Address/SmartAddressInput.js', () => ({
  __esModule: true,
  default: function MockSmartAddressInput({ fieldPrefix }) {
    return <div data-testid={`smart-address-${fieldPrefix}`}>SmartAddressInput</div>;
  },
}));

vi.mock('../Address/DynamicAddressForm.js', () => ({
  __esModule: true,
  default: function MockDynamicAddressForm({ fieldPrefix, readonly }) {
    return <div data-testid={`dynamic-form-${fieldPrefix}`} data-readonly={readonly}>DynamicAddressForm</div>;
  },
}));

const theme = appTheme;
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
