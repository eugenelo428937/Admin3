// src/components/User/__tests__/PhoneCodeAutocomplete.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PhoneCodeAutocomplete from '../PhoneCodeAutocomplete';

const theme = createTheme();

const mockCountries = [
  { name: 'United Kingdom', phone_code: '+44', iso_code: 'GB' },
  { name: 'United States', phone_code: '+1', iso_code: 'US' },
  { name: 'India', phone_code: '+91', iso_code: 'IN' },
  { name: 'Germany', phone_code: '+49', iso_code: 'DE' },
  { name: 'Invalid Country', phone_code: null, iso_code: 'XX' },
];

const renderComponent = (props = {}) => {
  const defaultProps = {
    countries: mockCountries,
    onSelect: jest.fn(),
  };

  return render(
    <ThemeProvider theme={theme}>
      <PhoneCodeAutocomplete {...defaultProps} {...props} />
    </ThemeProvider>
  );
};

describe('PhoneCodeAutocomplete', () => {
  describe('rendering', () => {
    test('renders autocomplete input', () => {
      renderComponent();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    test('renders with custom placeholder', () => {
      renderComponent({ placeholder: 'Select code' });
      expect(screen.getByPlaceholderText('Select code')).toBeInTheDocument();
    });

    test('renders with default placeholder', () => {
      renderComponent();
      expect(screen.getByPlaceholderText('Code')).toBeInTheDocument();
    });

    test('filters out countries without phone codes', async () => {
      renderComponent();

      // Open dropdown
      const openButton = screen.getByRole('button', { name: 'Open' });
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // Invalid Country should not appear (it has null phone_code)
      expect(screen.queryByText(/Invalid Country/)).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    test('calls onSelect when country is selected', async () => {
      const mockOnSelect = jest.fn();
      renderComponent({ onSelect: mockOnSelect });

      // Click the Open button to open dropdown
      const openButton = screen.getByRole('button', { name: 'Open' });
      fireEvent.click(openButton);

      // Wait for dropdown to open
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // Click an option
      const option = screen.getByText('+44 United Kingdom');
      fireEvent.click(option);

      expect(mockOnSelect).toHaveBeenCalledWith(mockCountries[0]);
    });

    test('displays selected country phone code', () => {
      const selectedCountry = mockCountries[0];
      renderComponent({ selectedCountry });

      expect(screen.getByDisplayValue('+44')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    test('filters by phone code', async () => {
      renderComponent();

      // Open dropdown first
      const openButton = screen.getByRole('button', { name: 'Open' });
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '44' } });

      // Should show UK with +44
      expect(screen.getByText('+44 United Kingdom')).toBeInTheDocument();
    });

    test('filters by country name', async () => {
      renderComponent();

      // Open dropdown first
      const openButton = screen.getByRole('button', { name: 'Open' });
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: 'india' } });

      // Should show India
      expect(screen.getByText('+91 India')).toBeInTheDocument();
    });
  });
});
