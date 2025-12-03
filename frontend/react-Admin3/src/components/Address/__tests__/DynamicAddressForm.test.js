// src/components/Address/__tests__/DynamicAddressForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DynamicAddressForm from '../DynamicAddressForm';

// Mock data
const ukMetadata = {
  fields: {
    address: { label: 'Address', type: 'text', placeholder: 'Enter address' },
    city: { label: 'City', type: 'text', placeholder: 'Enter city' },
    postcode: { label: 'Postcode', type: 'text', placeholder: 'Enter postcode' },
    county: { label: 'County', type: 'text', placeholder: 'Enter county' },
  },
  required: ['address', 'city', 'postcode'],
  layout: [
    [{ field: 'address', span: 12 }],
    [{ field: 'city', span: 6 }, { field: 'county', span: 6 }],
    [{ field: 'postcode', span: 6 }],
  ],
};

const usMetadata = {
  fields: {
    address: { label: 'Street Address', type: 'text', placeholder: 'Enter street' },
    city: { label: 'City', type: 'text', placeholder: 'Enter city' },
    state: { label: 'State', type: 'select', options: [
      { value: 'NY', label: 'New York' },
      { value: 'CA', label: 'California' },
    ]},
    zipcode: { label: 'ZIP Code', type: 'text', placeholder: 'Enter ZIP' },
  },
  required: ['address', 'city', 'state', 'zipcode'],
  layout: [
    [{ field: 'address', span: 12 }],
    [{ field: 'city', span: 6 }, { field: 'state', span: 6 }],
    [{ field: 'zipcode', span: 6 }],
  ],
};

// Mock addressMetadataService
jest.mock('../../../services/addressMetadataService', () => ({
  __esModule: true,
  default: {
    getCountryCode: jest.fn(),
    getAddressMetadata: jest.fn(),
    fetchAddressMetadata: jest.fn(),
    transformFieldValue: jest.fn(),
    validateAddressField: jest.fn(),
  },
}));

import addressMetadataService from '../../../services/addressMetadataService';

const theme = createTheme({
  liftkit: {
    spacing: { sm: 8, md: 16 },
  },
});

const renderComponent = async (props = {}) => {
  const defaultProps = {
    country: 'United Kingdom',
    values: {},
    onChange: jest.fn(),
    errors: {},
  };

  let result;
  await act(async () => {
    result = render(
      <ThemeProvider theme={theme}>
        <DynamicAddressForm {...defaultProps} {...props} />
      </ThemeProvider>
    );
  });

  // Wait for useEffect to complete
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  return result;
};

describe('DynamicAddressForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock implementations
    addressMetadataService.getCountryCode.mockImplementation((country) =>
      country === 'United Kingdom' ? 'GB' : 'US'
    );

    addressMetadataService.getAddressMetadata.mockImplementation((countryCode) =>
      countryCode === 'GB' ? ukMetadata : usMetadata
    );

    // fetchAddressMetadata returns a Promise with the same metadata
    addressMetadataService.fetchAddressMetadata.mockImplementation((countryCode) =>
      Promise.resolve(countryCode === 'GB' ? ukMetadata : usMetadata)
    );

    addressMetadataService.transformFieldValue.mockImplementation((countryCode, fieldName, value) => {
      if (countryCode === 'GB' && fieldName === 'postcode') {
        return value.toUpperCase();
      }
      return value;
    });

    addressMetadataService.validateAddressField.mockImplementation((countryCode, fieldName, value) => {
      if (!value && ['address', 'city', 'postcode', 'zipcode', 'state'].includes(fieldName)) {
        return { isValid: false, error: `${fieldName} is required` };
      }
      return { isValid: true, error: null };
    });
  });

  describe('rendering', () => {
    test('renders address format info for UK', async () => {
      await renderComponent({ country: 'United Kingdom' });
      expect(screen.getByText(/Address format for United Kingdom/i)).toBeInTheDocument();
    });

    test('renders required fields message', async () => {
      await renderComponent({ country: 'United Kingdom' });
      expect(screen.getByText(/Required:/i)).toBeInTheDocument();
    });

    test('renders all UK address fields', async () => {
      await renderComponent({ country: 'United Kingdom' });
      expect(screen.getByRole('textbox', { name: /Address/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /City/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Postcode/i })).toBeInTheDocument();
    });

    test('renders optional County field for UK', async () => {
      await renderComponent({ country: 'United Kingdom' });
      expect(screen.getByRole('textbox', { name: /County/i })).toBeInTheDocument();
    });

    test('renders US address fields with state dropdown', async () => {
      await renderComponent({ country: 'United States' });
      expect(screen.getByRole('textbox', { name: /Street Address/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /City/i })).toBeInTheDocument();
      // State is a select field (combobox), not textbox
      expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
      expect(screen.getByRole('textbox', { name: /ZIP Code/i })).toBeInTheDocument();
    });
  });

  describe('no country selected', () => {
    test('shows info alert when no metadata available', async () => {
      addressMetadataService.getAddressMetadata.mockReturnValueOnce(null);
      addressMetadataService.fetchAddressMetadata.mockResolvedValueOnce(null);
      await renderComponent({ country: 'Unknown' });
      expect(screen.getByText(/Please select a country to configure address fields/i)).toBeInTheDocument();
    });
  });

  describe('field values', () => {
    test('displays provided values in fields', async () => {
      await renderComponent({
        country: 'United Kingdom',
        values: {
          address: '123 Test Street',
          city: 'London',
          postcode: 'SW1A 1AA',
        },
      });

      expect(screen.getByDisplayValue('123 Test Street')).toBeInTheDocument();
      expect(screen.getByDisplayValue('London')).toBeInTheDocument();
      expect(screen.getByDisplayValue('SW1A 1AA')).toBeInTheDocument();
    });

    test('displays values with field prefix', async () => {
      await renderComponent({
        country: 'United Kingdom',
        fieldPrefix: 'billing',
        values: {
          billing_address: '456 Billing Road',
          billing_city: 'Manchester',
        },
      });

      expect(screen.getByDisplayValue('456 Billing Road')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Manchester')).toBeInTheDocument();
    });
  });

  describe('field interactions', () => {
    test('calls onChange when field value changes', async () => {
      const mockOnChange = jest.fn();
      await renderComponent({ country: 'United Kingdom', onChange: mockOnChange });

      const addressInput = screen.getByRole('textbox', { name: /Address/i });
      await act(async () => {
        fireEvent.change(addressInput, { target: { name: 'address', value: 'New Address' } });
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({
            name: 'address',
            value: 'New Address',
          }),
        })
      );
    });

    test('transforms postcode to uppercase for UK', async () => {
      const mockOnChange = jest.fn();
      await renderComponent({ country: 'United Kingdom', onChange: mockOnChange });

      const postcodeInput = screen.getByRole('textbox', { name: /Postcode/i });
      await act(async () => {
        fireEvent.change(postcodeInput, { target: { name: 'postcode', value: 'sw1a 1aa' } });
      });

      expect(addressMetadataService.transformFieldValue).toHaveBeenCalledWith('GB', 'postcode', 'sw1a 1aa');
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({
            value: 'SW1A 1AA', // Should be uppercase
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    test('displays external errors passed via props', async () => {
      await renderComponent({
        country: 'United Kingdom',
        errors: {
          address: 'Address is required',
          city: 'City is required',
        },
      });

      expect(screen.getByText('Address is required')).toBeInTheDocument();
      expect(screen.getByText('City is required')).toBeInTheDocument();
    });

    test('validates field on change and shows validation errors', async () => {
      addressMetadataService.validateAddressField.mockReturnValueOnce({
        isValid: false,
        error: 'Invalid postcode format',
      });

      await renderComponent({ country: 'United Kingdom' });

      const postcodeInput = screen.getByRole('textbox', { name: /Postcode/i });
      await act(async () => {
        fireEvent.change(postcodeInput, { target: { name: 'postcode', value: 'invalid' } });
      });

      expect(addressMetadataService.validateAddressField).toHaveBeenCalled();
    });
  });

  describe('readonly mode', () => {
    test('makes fields readonly when readonly prop is true', async () => {
      await renderComponent({
        country: 'United Kingdom',
        readonly: true,
        values: { address: '123 Test Street' },
      });

      const addressInput = screen.getByRole('textbox', { name: /Address/i });
      expect(addressInput).toHaveAttribute('readonly');
    });
  });

  describe('optional fields', () => {
    test('hides optional fields when showOptionalFields is false', async () => {
      await renderComponent({
        country: 'United Kingdom',
        showOptionalFields: false,
      });

      // County is optional, should be hidden
      expect(screen.queryByRole('textbox', { name: /County/i })).not.toBeInTheDocument();
    });

    test('shows message when optional fields are hidden', async () => {
      await renderComponent({
        country: 'United Kingdom',
        showOptionalFields: false,
      });

      expect(screen.getByText(/Some optional fields are hidden/i)).toBeInTheDocument();
    });
  });

  describe('custom metadata', () => {
    test('uses passed metadata instead of service metadata', async () => {
      const customMetadata = {
        fields: {
          custom_field: { label: 'Custom Field', type: 'text', placeholder: 'Enter custom' },
        },
        required: ['custom_field'],
        layout: [[{ field: 'custom_field', span: 12 }]],
      };

      await renderComponent({
        country: 'Custom Country',
        metadata: customMetadata,
      });

      expect(screen.getByRole('textbox', { name: /Custom Field/i })).toBeInTheDocument();
      // Should not call getAddressMetadata when custom metadata is provided
      expect(addressMetadataService.getAddressMetadata).not.toHaveBeenCalled();
    });
  });

  describe('select fields', () => {
    test('renders select field for state in US', async () => {
      await renderComponent({ country: 'United States' });

      // MUI Select renders with combobox role
      const selectElements = screen.getAllByRole('combobox');
      expect(selectElements.length).toBeGreaterThan(0);
    });

    test('handles select field changes', async () => {
      const mockOnChange = jest.fn();
      await renderComponent({ country: 'United States', onChange: mockOnChange });

      // Get the select element (MUI Select has combobox role)
      const selectElements = screen.getAllByRole('combobox');
      const stateSelect = selectElements[0];

      await act(async () => {
        fireEvent.mouseDown(stateSelect);
      });

      // Wait for options to appear and select one
      await waitFor(() => {
        expect(screen.getByText('New York')).toBeInTheDocument();
      });

      const option = screen.getByText('New York');
      await act(async () => {
        fireEvent.click(option);
      });

      expect(mockOnChange).toHaveBeenCalled();
    });
  });
});
