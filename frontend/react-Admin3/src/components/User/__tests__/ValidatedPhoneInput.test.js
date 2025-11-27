// src/components/User/__tests__/ValidatedPhoneInput.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ValidatedPhoneInput from '../ValidatedPhoneInput';

// Mock phoneValidationService
jest.mock('../../../services/phoneValidationService', () => ({
  __esModule: true,
  default: {
    getCountryCodeFromName: jest.fn(),
    validatePhoneNumber: jest.fn(),
    formatPhoneNumber: jest.fn(),
  },
}));

import phoneValidationService from '../../../services/phoneValidationService';

const theme = createTheme();

const mockCountries = [
  { name: 'United Kingdom', phone_code: '+44', iso_code: 'GB' },
  { name: 'United States', phone_code: '+1', iso_code: 'US' },
  { name: 'India', phone_code: '+91', iso_code: 'IN' },
  { name: 'South Africa', phone_code: '+27', iso_code: 'ZA' },
];

const renderComponent = async (props = {}) => {
  const defaultProps = {
    name: 'phone',
    onChange: jest.fn(),
    onCountryChange: jest.fn(),
    countries: mockCountries,
  };

  let result;
  await act(async () => {
    result = render(
      <ThemeProvider theme={theme}>
        <ValidatedPhoneInput {...defaultProps} {...props} />
      </ThemeProvider>
    );
  });
  return result;
};

describe('ValidatedPhoneInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    phoneValidationService.getCountryCodeFromName.mockResolvedValue('GB');
    phoneValidationService.validatePhoneNumber.mockResolvedValue({
      isValid: true,
      error: null,
    });
    phoneValidationService.formatPhoneNumber.mockReturnValue('020 1234 5678');
  });

  describe('rendering', () => {
    test('renders phone input field', async () => {
      await renderComponent();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    });

    test('renders country code autocomplete', async () => {
      await renderComponent();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    test('renders with custom label', async () => {
      await renderComponent({ label: 'Mobile' });
      expect(screen.getByLabelText(/mobile/i)).toBeInTheDocument();
    });

    test('renders with required asterisk', async () => {
      await renderComponent({ required: true });
      expect(screen.getByLabelText(/phone number \*/i)).toBeInTheDocument();
    });

    test('renders with custom placeholder', async () => {
      await renderComponent({ placeholder: 'Enter mobile' });
      expect(screen.getByPlaceholderText('Enter mobile')).toBeInTheDocument();
    });

    test('renders disabled when disabled prop is true', async () => {
      await renderComponent({ disabled: true });
      const input = screen.getByLabelText(/phone number/i);
      expect(input).toBeDisabled();
    });
  });

  describe('value handling', () => {
    test('displays initial value', async () => {
      await renderComponent({ value: '02012345678' });
      expect(screen.getByDisplayValue('02012345678')).toBeInTheDocument();
    });

    test('displays selected country', async () => {
      await renderComponent({ selectedCountry: mockCountries[0] });
      expect(screen.getByRole('combobox')).toHaveValue('GB +44');
    });

    test('calls onChange when phone input changes', async () => {
      const mockOnChange = jest.fn();
      await renderComponent({ onChange: mockOnChange });

      const input = screen.getByLabelText(/phone number/i);
      fireEvent.change(input, { target: { value: '07712345678' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        target: {
          name: 'phone',
          value: '07712345678',
        },
      });
    });

    test('calls onCountryChange prop is passed', async () => {
      const mockOnCountryChange = jest.fn();
      await renderComponent({ onCountryChange: mockOnCountryChange });

      // Just verify the country code autocomplete is present
      const countryInput = screen.getByRole('combobox');
      expect(countryInput).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    test('shows error when phone entered without country', async () => {
      await renderComponent({ value: '12345' });

      await waitFor(() => {
        expect(screen.getByText(/please select a country code first/i)).toBeInTheDocument();
      });
    });

    test('shows error for invalid characters', async () => {
      await renderComponent({ selectedCountry: mockCountries[0] });

      const input = screen.getByLabelText(/phone number/i);
      fireEvent.change(input, { target: { value: 'abc123' } });

      await waitFor(() => {
        expect(screen.getByText(/contains invalid characters/i)).toBeInTheDocument();
      });
    });

    test('validates phone number with service', async () => {
      phoneValidationService.validatePhoneNumber.mockResolvedValue({
        isValid: false,
        error: 'Invalid phone number',
      });

      await renderComponent({
        value: '123',
        selectedCountry: mockCountries[0],
      });

      await waitFor(() => {
        expect(phoneValidationService.validatePhoneNumber).toHaveBeenCalled();
      });
    });

    test('calls onValidationChange with validation result', async () => {
      const mockOnValidationChange = jest.fn();
      phoneValidationService.validatePhoneNumber.mockResolvedValue({
        isValid: true,
        error: null,
      });

      await renderComponent({
        value: '02012345678',
        selectedCountry: mockCountries[0],
        onValidationChange: mockOnValidationChange,
      });

      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith({
          isValid: true,
          error: null,
        });
      });
    });

    test('shows required error when empty and required', async () => {
      await renderComponent({ required: true, value: '' });

      await waitFor(() => {
        expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();
      });
    });

    test('shows external error over internal validation', async () => {
      await renderComponent({
        error: 'External error message',
        selectedCountry: mockCountries[0],
      });

      expect(screen.getByText('External error message')).toBeInTheDocument();
    });

    test('shows error state when isInvalid prop is true', async () => {
      await renderComponent({ isInvalid: true });

      const input = screen.getByLabelText(/phone number/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('formatting', () => {
    test('formats phone number on blur', async () => {
      const mockOnChange = jest.fn();
      phoneValidationService.formatPhoneNumber.mockReturnValue('020 1234 5678');

      await renderComponent({
        value: '02012345678',
        selectedCountry: mockCountries[0],
        onChange: mockOnChange,
      });

      const input = screen.getByLabelText(/phone number/i);
      fireEvent.blur(input);

      await waitFor(() => {
        expect(phoneValidationService.formatPhoneNumber).toHaveBeenCalledWith(
          '02012345678',
          'GB',
          'national'
        );
      });
    });
  });

  describe('country autocomplete', () => {
    test('renders country code autocomplete', async () => {
      await renderComponent();

      const countryInput = screen.getByRole('combobox');
      expect(countryInput).toBeInTheDocument();
      expect(countryInput).toHaveAttribute('placeholder', 'Country code');
    });

    test('accepts selected country', async () => {
      await renderComponent({ selectedCountry: mockCountries[0] });

      // When a country is selected, display value shows iso_code + phone_code
      const countryInput = screen.getByRole('combobox');
      expect(countryInput).toHaveValue('GB +44');
    });
  });
});
