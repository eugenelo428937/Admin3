import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import SmartAddressInput from '../SmartAddressInput';

// Create mock theme
const theme = createTheme({
  palette: {
    liftkit: {
      light: { background: '#fff' },
      dark: { primary: '#000', onPrimary: '#fff' }
    },
    divider: '#e0e0e0'
  }
});

// Mock data for address metadata
const ukMetadata = {
  fields: {
    address: { label: 'Address', placeholder: 'Enter address' },
    city: { label: 'City', placeholder: 'Enter city' },
    postal_code: { label: 'Postcode', placeholder: 'Enter postcode', transform: 'uppercase' },
    county: { label: 'County', placeholder: 'Enter county' }
  },
  required: ['address', 'city', 'postal_code'],
  hasPostcode: true,
  addressLookupSupported: true,
  requiresPostcodeForLookup: true
};

const hkMetadata = {
  fields: {
    address: { label: 'Address', placeholder: 'Enter address' },
    city: { label: 'City/District', placeholder: 'Enter city' }
  },
  required: ['address', 'city'],
  hasPostcode: false,
  addressLookupSupported: true,
  requiresPostcodeForLookup: false
};

const usMetadata = {
  fields: {
    address: { label: 'Street Address', placeholder: 'Enter street address' },
    city: { label: 'City', placeholder: 'Enter city' },
    state: { label: 'State', placeholder: 'Enter state' },
    postal_code: { label: 'ZIP Code', placeholder: 'Enter ZIP code' }
  },
  required: ['address', 'city', 'state', 'postal_code'],
  hasPostcode: true,
  addressLookupSupported: false
};

// Mock services
jest.mock('../../../services/addressMetadataService', () => ({
  __esModule: true,
  default: {
    getCountryCode: jest.fn(),
    getAddressMetadata: jest.fn(),
    fetchAddressMetadata: jest.fn(),
    getAllFields: jest.fn()
  },
  ADDRESS_METADATA: {
    GB: true,
    HK: true
  }
}));

jest.mock('../../../config', () => ({
  apiBaseUrl: 'http://test-api.com'
}));

// Mock child components
jest.mock('../../User/CountryAutocomplete', () => {
  return function MockCountryAutocomplete({ value, onChange, label, name }) {
    return (
      <div data-testid="country-autocomplete">
        <label htmlFor="country-select">{label}</label>
        <select
          id="country-select"
          data-testid="country-select"
          value={value || ''}
          onChange={(e) => onChange({ target: { name, value: e.target.value } })}
        >
          <option value="">Select country</option>
          <option value="United Kingdom">United Kingdom</option>
          <option value="Hong Kong">Hong Kong</option>
          <option value="United States">United States</option>
        </select>
      </div>
    );
  };
});

jest.mock('../DynamicAddressForm', () => {
  return function MockDynamicAddressForm({ country, values, onChange, fieldPrefix }) {
    return (
      <div data-testid="dynamic-address-form">
        <span data-testid="form-country">{country}</span>
        <input
          data-testid="address-input"
          value={values[fieldPrefix ? `${fieldPrefix}_address` : 'address'] || ''}
          onChange={(e) => onChange({
            target: {
              name: fieldPrefix ? `${fieldPrefix}_address` : 'address',
              value: e.target.value
            }
          })}
        />
      </div>
    );
  };
});

// Import mocked service
import addressMetadataService from '../../../services/addressMetadataService';

// Helper function to render component
const renderComponent = async (props = {}) => {
  const defaultProps = {
    values: {},
    onChange: jest.fn(),
    errors: {},
    fieldPrefix: '',
    className: ''
  };

  let result;
  await act(async () => {
    result = render(
      <ThemeProvider theme={theme}>
        <SmartAddressInput {...defaultProps} {...props} />
      </ThemeProvider>
    );
  });

  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  return result;
};

describe('SmartAddressInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    // Setup default mock implementations
    addressMetadataService.getCountryCode.mockImplementation((country) => {
      if (country === 'United Kingdom') return 'GB';
      if (country === 'Hong Kong') return 'HK';
      if (country === 'United States') return 'US';
      return null;
    });

    addressMetadataService.getAddressMetadata.mockImplementation((code) => {
      if (code === 'GB') return ukMetadata;
      if (code === 'HK') return hkMetadata;
      if (code === 'US') return usMetadata;
      return null;
    });

    addressMetadataService.fetchAddressMetadata.mockImplementation((code) => {
      return Promise.resolve(addressMetadataService.getAddressMetadata(code));
    });

    addressMetadataService.getAllFields.mockImplementation((code) => {
      if (code === 'GB') return ['address', 'city', 'postal_code', 'county'];
      if (code === 'HK') return ['address', 'city'];
      if (code === 'US') return ['address', 'city', 'state', 'postal_code'];
      return [];
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    test('renders country selection with info alert', async () => {
      await renderComponent();

      expect(screen.getByTestId('country-autocomplete')).toBeInTheDocument();
      expect(screen.getByText(/select your country/i)).toBeInTheDocument();
    });

    test('does not show address form before country selection', async () => {
      await renderComponent();

      expect(screen.queryByTestId('dynamic-address-form')).not.toBeInTheDocument();
    });

    test('applies custom className', async () => {
      await renderComponent({ className: 'custom-class' });

      const container = document.querySelector('.smart-address-input');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Country Selection', () => {
    test('calls onChange when country is selected', async () => {
      const onChange = jest.fn();
      await renderComponent({ onChange });

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            target: expect.objectContaining({
              name: 'country',
              value: 'United Kingdom'
            })
          })
        );
      });
    });

    test('shows address lookup for UK', async () => {
      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
      });
    });

    test('shows manual entry form for US (no address lookup)', async () => {
      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United States' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
      });
    });

    test('handles field prefix correctly', async () => {
      const onChange = jest.fn();
      await renderComponent({ onChange, fieldPrefix: 'home' });

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            target: expect.objectContaining({
              name: 'home_country',
              value: 'United Kingdom'
            })
          })
        );
      });
    });
  });

  describe('Address Lookup (UK)', () => {
    test('shows postcode and address fields for UK', async () => {
      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
      });
    });

    test('address field is disabled when postcode is empty (UK)', async () => {
      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        const addressField = screen.getByLabelText(/address/i);
        expect(addressField).toBeDisabled();
      });
    });

    test('address field is enabled when postcode is entered', async () => {
      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
      });

      const postcodeField = screen.getByLabelText(/postcode/i);
      await act(async () => {
        fireEvent.change(postcodeField, { target: { value: 'SW1A 1AA' } });
      });

      await waitFor(() => {
        const addressField = screen.getByLabelText(/address/i);
        expect(addressField).not.toBeDisabled();
      });
    });

    test('triggers API call on Enter key press', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({
          addresses: [
            {
              id: 'addr1',
              line_1: '10 Downing Street',
              town_or_city: 'London',
              postcode: 'SW1A 2AA'
            }
          ]
        })
      });

      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
      });

      const postcodeField = screen.getByLabelText(/postcode/i);
      await act(async () => {
        fireEvent.change(postcodeField, { target: { value: 'SW1A' } });
      });

      const addressField = screen.getByLabelText(/address/i);
      await act(async () => {
        fireEvent.change(addressField, { target: { value: 'Downing' } });
        fireEvent.keyDown(addressField, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/utils/address-lookup/')
        );
      });
    });

    test('displays address suggestions from API', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({
          addresses: [
            {
              id: 'addr1',
              line_1: '10 Downing Street',
              town_or_city: 'London',
              postcode: 'SW1A 2AA'
            },
            {
              id: 'addr2',
              line_1: '11 Downing Street',
              town_or_city: 'London',
              postcode: 'SW1A 2AB'
            }
          ]
        })
      });

      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
      });

      const postcodeField = screen.getByLabelText(/postcode/i);
      await act(async () => {
        fireEvent.change(postcodeField, { target: { value: 'SW1A' } });
      });

      const addressField = screen.getByLabelText(/address/i);
      await act(async () => {
        fireEvent.change(addressField, { target: { value: 'Downing' } });
        fireEvent.keyDown(addressField, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText(/10 Downing Street/)).toBeInTheDocument();
        expect(screen.getByText(/11 Downing Street/)).toBeInTheDocument();
      });
    });

    test('shows manual entry button in suggestions dropdown', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({
          addresses: [{ id: 'addr1', line_1: '10 Downing Street', town_or_city: 'London' }]
        })
      });

      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
      });

      const postcodeField = screen.getByLabelText(/postcode/i);
      await act(async () => {
        fireEvent.change(postcodeField, { target: { value: 'SW1A' } });
      });

      const addressField = screen.getByLabelText(/address/i);
      await act(async () => {
        fireEvent.change(addressField, { target: { value: 'Downing' } });
        fireEvent.keyDown(addressField, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enter address manually/i })).toBeInTheDocument();
      });
    });
  });

  describe('Address Selection', () => {
    test('populates form when suggestion is selected', async () => {
      const onChange = jest.fn();

      // Mock lookup response
      global.fetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({
          addresses: [
            {
              id: 'addr1',
              line_1: '10 Downing Street',
              town_or_city: 'London',
              postcode: 'SW1A 2AA',
              county: 'Westminster'
            }
          ]
        })
      });

      // Mock retrieve response
      global.fetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({
          addresses: [
            {
              line_1: '10 Downing Street',
              town_or_city: 'London',
              postcode: 'SW1A 2AA',
              county: 'Westminster'
            }
          ]
        })
      });

      await renderComponent({ onChange });

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
      });

      const postcodeField = screen.getByLabelText(/postcode/i);
      await act(async () => {
        fireEvent.change(postcodeField, { target: { value: 'SW1A' } });
      });

      const addressField = screen.getByLabelText(/address/i);
      await act(async () => {
        fireEvent.change(addressField, { target: { value: 'Downing' } });
        fireEvent.keyDown(addressField, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText(/10 Downing Street/)).toBeInTheDocument();
      });

      // Click on the suggestion
      await act(async () => {
        fireEvent.click(screen.getByText(/10 Downing Street/));
      });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            target: expect.objectContaining({
              name: 'address'
            })
          })
        );
      });
    });
  });

  describe('Manual Entry Mode', () => {
    test('switches to manual entry when button clicked', async () => {
      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /manual entry/i })).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /manual entry/i }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
      });
    });

    test('shows address lookup button when in manual mode', async () => {
      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /manual entry/i })).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /manual entry/i }));
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /address lookup/i })).toBeInTheDocument();
      });
    });

    test('switches back to lookup mode when address lookup button clicked', async () => {
      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /manual entry/i })).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /manual entry/i }));
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /address lookup/i })).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /address lookup/i }));
      });

      await waitFor(() => {
        expect(screen.queryByTestId('dynamic-address-form')).not.toBeInTheDocument();
        expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
      });
    });
  });

  describe('Hong Kong (No Postcode)', () => {
    test('does not show postcode field for Hong Kong', async () => {
      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'Hong Kong' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/postcode/i)).not.toBeInTheDocument();
      });
    });

    test('address field is enabled without postcode for Hong Kong', async () => {
      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'Hong Kong' } });
      });

      await waitFor(() => {
        const addressField = screen.getByLabelText(/address/i);
        expect(addressField).not.toBeDisabled();
      });
    });
  });

  describe('Postcode Changes', () => {
    test('updates parent form when postcode changes', async () => {
      const onChange = jest.fn();
      await renderComponent({ onChange });

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
      });

      const postcodeField = screen.getByLabelText(/postcode/i);
      await act(async () => {
        fireEvent.change(postcodeField, { target: { value: 'SW1A 1AA' } });
      });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            target: expect.objectContaining({
              name: 'postal_code',
              value: 'SW1A 1AA'
            })
          })
        );
      });
    });

    test('handles postcode with field prefix', async () => {
      const onChange = jest.fn();
      await renderComponent({ onChange, fieldPrefix: 'work' });

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
      });

      const postcodeField = screen.getByLabelText(/postcode/i);
      await act(async () => {
        fireEvent.change(postcodeField, { target: { value: 'EC1A 1BB' } });
      });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            target: expect.objectContaining({
              name: 'work_postal_code',
              value: 'EC1A 1BB'
            })
          })
        );
      });
    });
  });

  describe('Address Line Changes', () => {
    test('updates parent form when address line changes', async () => {
      const onChange = jest.fn();
      await renderComponent({ onChange });

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'Hong Kong' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
      });

      const addressField = screen.getByLabelText(/address/i);
      await act(async () => {
        fireEvent.change(addressField, { target: { value: '123 Test Street' } });
      });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            target: expect.objectContaining({
              name: 'address',
              value: '123 Test Street'
            })
          })
        );
      });
    });
  });

  describe('API Error Handling', () => {
    test('handles API failure gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
      });

      const postcodeField = screen.getByLabelText(/postcode/i);
      await act(async () => {
        fireEvent.change(postcodeField, { target: { value: 'SW1A' } });
      });

      const addressField = screen.getByLabelText(/address/i);
      await act(async () => {
        fireEvent.change(addressField, { target: { value: 'Test' } });
        fireEvent.keyDown(addressField, { key: 'Enter' });
      });

      // Should not crash, suggestions should be empty
      await waitFor(() => {
        expect(screen.queryByText(/10 Downing Street/)).not.toBeInTheDocument();
      });
    });

    test('falls back to sync metadata on fetch failure', async () => {
      addressMetadataService.fetchAddressMetadata.mockRejectedValueOnce(new Error('Fetch failed'));

      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(addressMetadataService.getAddressMetadata).toHaveBeenCalledWith('GB');
      });
    });
  });

  describe('Existing Values', () => {
    test('initializes with existing country value', async () => {
      await renderComponent({
        values: { country: 'United Kingdom' }
      });

      await waitFor(() => {
        expect(screen.getByTestId('country-select')).toHaveValue('United Kingdom');
      });
    });

    test('initializes with existing postcode value', async () => {
      await renderComponent({
        values: { country: 'United Kingdom', postal_code: 'SW1A 1AA' }
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/postcode/i)).toHaveValue('SW1A 1AA');
      });
    });

    test('handles field prefix with existing values', async () => {
      await renderComponent({
        values: { home_country: 'United Kingdom', home_postal_code: 'EC1A 1BB' },
        fieldPrefix: 'home'
      });

      await waitFor(() => {
        expect(screen.getByTestId('country-select')).toHaveValue('United Kingdom');
        expect(screen.getByLabelText(/postcode/i)).toHaveValue('EC1A 1BB');
      });
    });
  });

  describe('Click Outside Handling', () => {
    test('closes suggestions when clicking outside', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({
          addresses: [{ id: 'addr1', line_1: '10 Downing Street', town_or_city: 'London' }]
        })
      });

      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
      });

      const postcodeField = screen.getByLabelText(/postcode/i);
      await act(async () => {
        fireEvent.change(postcodeField, { target: { value: 'SW1A' } });
      });

      const addressField = screen.getByLabelText(/address/i);
      await act(async () => {
        fireEvent.change(addressField, { target: { value: 'Downing' } });
        fireEvent.keyDown(addressField, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(screen.getByText(/10 Downing Street/)).toBeInTheDocument();
      });

      // Click outside
      await act(async () => {
        fireEvent.mouseDown(document.body);
      });

      await waitFor(() => {
        expect(screen.queryByText(/10 Downing Street/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Non-Enter Key Handling', () => {
    test('does not trigger search on regular key press', async () => {
      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
      });

      const postcodeField = screen.getByLabelText(/postcode/i);
      await act(async () => {
        fireEvent.change(postcodeField, { target: { value: 'SW1A' } });
      });

      const addressField = screen.getByLabelText(/address/i);
      await act(async () => {
        fireEvent.change(addressField, { target: { value: 'Test' } });
        fireEvent.keyDown(addressField, { key: 'Tab' });
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Empty Search Query', () => {
    test('does not perform lookup with empty address line', async () => {
      await renderComponent();

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'United Kingdom' } });
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
      });

      const postcodeField = screen.getByLabelText(/postcode/i);
      await act(async () => {
        fireEvent.change(postcodeField, { target: { value: 'SW1A' } });
      });

      const addressField = screen.getByLabelText(/address/i);
      await act(async () => {
        fireEvent.keyDown(addressField, { key: 'Enter' });
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Unsupported Country', () => {
    test('does not perform lookup for unsupported country', async () => {
      await renderComponent();

      // Temporarily modify mock to return unsupported country
      addressMetadataService.getCountryCode.mockReturnValue('XX');

      const select = screen.getByTestId('country-select');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'Unknown Country' } });
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
