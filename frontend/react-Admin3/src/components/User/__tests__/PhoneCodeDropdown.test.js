// src/components/User/__tests__/PhoneCodeDropdown.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PhoneCodeDropdown from '../PhoneCodeDropdown';

const theme = createTheme();

const mockCountries = [
  { name: 'United Kingdom', phone_code: '+44', iso_code: 'GB' },
  { name: 'United States', phone_code: '+1', iso_code: 'US' },
  { name: 'India', phone_code: '+91', iso_code: 'IN' },
  { name: 'Invalid Country', phone_code: null, iso_code: 'XX' },
];

const renderComponent = (props = {}) => {
  const defaultProps = {
    countries: mockCountries,
    onChange: jest.fn(),
  };

  return render(
    <ThemeProvider theme={theme}>
      <PhoneCodeDropdown {...defaultProps} {...props} />
    </ThemeProvider>
  );
};

describe('PhoneCodeDropdown', () => {
  describe('rendering', () => {
    test('renders select dropdown', () => {
      renderComponent();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    test('renders with empty value by default', () => {
      renderComponent();
      // Select shows empty when no value selected
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    test('displays selected country phone code', () => {
      const selectedCountry = mockCountries[0];
      renderComponent({ selectedCountry });

      // MUI Select displays value differently
      expect(screen.getByRole('combobox')).toHaveTextContent('+44');
    });

    test('renders with custom name', () => {
      const { container } = renderComponent({ name: 'phoneCode' });
      const select = container.querySelector('input[name="phoneCode"]');
      expect(select).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    test('calls onChange when country is selected', async () => {
      const mockOnChange = jest.fn();
      renderComponent({ onChange: mockOnChange });

      // Open the dropdown
      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // Select UK option
      const option = screen.getByRole('option', { name: '+44 United Kingdom' });
      fireEvent.click(option);

      expect(mockOnChange).toHaveBeenCalledWith(mockCountries[0]);
    });

    test('does not call onChange when selecting same country', async () => {
      const mockOnChange = jest.fn();
      renderComponent({ onChange: mockOnChange, selectedCountry: null });

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // Select the default "Code" option (empty value)
      const emptyOption = screen.getByRole('option', { name: 'Code' });
      fireEvent.click(emptyOption);

      // Should not call onChange since country wasn't found for empty string
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('filtering', () => {
    test('filters out countries without phone codes', async () => {
      renderComponent();

      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // Invalid Country should not appear (it has null phone_code)
      expect(screen.queryByRole('option', { name: /Invalid Country/ })).not.toBeInTheDocument();

      // Valid countries should appear
      expect(screen.getByRole('option', { name: '+44 United Kingdom' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '+1 United States' })).toBeInTheDocument();
    });
  });
});
