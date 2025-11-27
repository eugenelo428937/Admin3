// src/components/User/__tests__/CountryAutocomplete.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CountryAutocomplete from '../CountryAutocomplete';

// Mock config
jest.mock('../../../config', () => ({
  __esModule: true,
  default: { apiBaseUrl: 'http://localhost:8888' },
}));

const mockCountries = [
  { name: 'United Kingdom', phone_code: '+44', iso_code: 'GB' },
  { name: 'United States', phone_code: '+1', iso_code: 'US' },
  { name: 'India', phone_code: '+91', iso_code: 'IN' },
  { name: 'South Africa', phone_code: '+27', iso_code: 'ZA' },
  { name: 'Germany', phone_code: '+49', iso_code: 'DE' },
];

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const theme = createTheme();

const renderComponent = (props = {}) => {
  const defaultProps = {
    onChange: jest.fn(),
  };

  return render(
    <ThemeProvider theme={theme}>
      <CountryAutocomplete {...defaultProps} {...props} />
    </ThemeProvider>
  );
};

describe('CountryAutocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockCountries),
    });
  });

  describe('rendering', () => {
    test('renders text input', async () => {
      renderComponent();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    test('renders with custom placeholder', () => {
      renderComponent({ placeholder: 'Select a country' });
      expect(screen.getByPlaceholderText('Select a country')).toBeInTheDocument();
    });

    test('renders with initial value', () => {
      renderComponent({ value: 'United Kingdom' });
      expect(screen.getByDisplayValue('United Kingdom')).toBeInTheDocument();
    });

    test('renders with label', () => {
      renderComponent({ label: 'Country' });
      expect(screen.getByLabelText('Country')).toBeInTheDocument();
    });
  });

  describe('API fetching', () => {
    test('fetches countries on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:8888/api/countries/');
      });
    });

    test('handles array response', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockCountries),
      });

      renderComponent();

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.getByText('United Kingdom')).toBeInTheDocument();
      });
    });

    test('handles paginated response with results array', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ results: mockCountries }),
      });

      renderComponent();

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.getByText('United Kingdom')).toBeInTheDocument();
      });
    });
  });

  describe('dropdown behavior', () => {
    test('shows dropdown on focus', async () => {
      renderComponent();

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(() => {
        // Frequent countries should appear at top
        expect(screen.getByText('United Kingdom')).toBeInTheDocument();
      });
    });

    test('shows frequent countries first', async () => {
      renderComponent();

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(() => {
        // UK, India, South Africa are frequent countries
        expect(screen.getByText('United Kingdom')).toBeInTheDocument();
        expect(screen.getByText('India')).toBeInTheDocument();
        expect(screen.getByText('South Africa')).toBeInTheDocument();
      });
    });

    test('shows "No countries found" when no matches', async () => {
      renderComponent();

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'xyz123' } });

      await waitFor(() => {
        expect(screen.getByText('No countries found')).toBeInTheDocument();
      });
    });
  });

  describe('filtering', () => {
    test('filters countries by name prefix', async () => {
      renderComponent();

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.getByText('United Kingdom')).toBeInTheDocument();
      });

      fireEvent.change(input, { target: { value: 'Ger' } });

      await waitFor(() => {
        expect(screen.getByText('Germany')).toBeInTheDocument();
        expect(screen.queryByText('United Kingdom')).not.toBeInTheDocument();
      });
    });
  });

  describe('selection', () => {
    test('calls onChange when country is selected', async () => {
      const mockOnChange = jest.fn();
      renderComponent({ onChange: mockOnChange, name: 'country' });

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.getByText('United Kingdom')).toBeInTheDocument();
      });

      // Click on the country option
      fireEvent.mouseDown(screen.getByText('United Kingdom'));

      expect(mockOnChange).toHaveBeenCalledWith({
        target: { value: 'United Kingdom', name: 'country' },
      });
    });

    test('updates input value on selection', async () => {
      renderComponent();

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(() => {
        expect(screen.getByText('India')).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByText('India'));

      expect(input).toHaveValue('India');
    });
  });

  describe('validation', () => {
    test('shows error state when isInvalid is true', () => {
      renderComponent({ isInvalid: true, feedback: 'Country is required' });

      expect(screen.getByText('Country is required')).toBeInTheDocument();
    });

    test('does not show feedback when valid', () => {
      renderComponent({ isInvalid: false, feedback: 'Error message' });

      expect(screen.queryByText('Error message')).not.toBeInTheDocument();
    });
  });
});
