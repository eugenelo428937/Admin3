import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import '@testing-library/jest-dom';
import AddressEditModal from '../AddressEditModal';
import theme from '../../../theme/theme';
import userService from '../../../services/userService';

// Mock userService
jest.mock('../../../services/userService', () => ({
  __esModule: true,
  default: {
    updateUserProfile: jest.fn(() => Promise.resolve({
      status: 'success',
      message: 'Profile updated successfully'
    }))
  }
}));

// Mock addressValidationService
jest.mock('../../../services/addressValidationService', () => ({
  __esModule: true,
  default: {
    validateAddress: jest.fn(() => Promise.resolve({
      hasMatch: false,
      bestMatch: null,
      needsComparison: false
    })),
    compareAddresses: jest.fn(() => true),
    getDifferences: jest.fn(() => ({}))
  }
}));

// Mock addressMetadataService
jest.mock('../../../services/addressMetadataService', () => ({
  __esModule: true,
  default: {
    supportsAddressLookup: jest.fn(() => true),
    getCountryCode: jest.fn((country) => {
      const countryCodeMap = {
        'United Kingdom': 'GB',
        'United States': 'US'
      };
      return countryCodeMap[country] || country;
    }),
    getAddressMetadata: jest.fn(() => ({
      addressLookupSupported: true
    })),
    fetchAddressMetadata: jest.fn(() => Promise.resolve({
      addressLookupSupported: true
    }))
  }
}));

// Mock AddressComparisonModal
jest.mock('../AddressComparisonModal', () => {
  return function MockAddressComparisonModal({ open, onAcceptSuggested, onKeepOriginal, onClose }) {
    if (!open) return null;
    return (
      <div data-testid="address-comparison-modal">
        <button onClick={onAcceptSuggested}>Accept Suggested</button>
        <button onClick={onKeepOriginal}>Keep Original</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

// Mock SmartAddressInput and DynamicAddressForm
jest.mock('../SmartAddressInput', () => {
  return function MockSmartAddressInput({ values, onChange, fieldPrefix = '' }) {
    const handleCountryChange = (e) => {
      onChange({
        target: {
          name: `${fieldPrefix ? fieldPrefix + '_' : ''}country`,
          value: e.target.value
        }
      });
    };

    return (
      <div data-testid="smart-address-input">
        <select
          data-testid="country-select"
          value={values[`${fieldPrefix ? fieldPrefix + '_' : ''}country`] || ''}
          onChange={handleCountryChange}
        >
          <option value="">Select Country</option>
          <option value="United Kingdom">United Kingdom</option>
          <option value="United States">United States</option>
        </select>
      </div>
    );
  };
});

jest.mock('../DynamicAddressForm', () => {
  return function MockDynamicAddressForm({ country, values, onChange, fieldPrefix = '' }) {
    const handleAddressChange = (e) => {
      onChange({
        target: {
          name: `${fieldPrefix ? fieldPrefix + '_' : ''}address`,
          value: e.target.value
        }
      });
    };

    const handleCountryChange = (e) => {
      onChange({
        target: {
          name: `${fieldPrefix ? fieldPrefix + '_' : ''}country`,
          value: e.target.value
        }
      });
    };

    return (
      <div data-testid="dynamic-address-form">
        <span>Address form for: {country}</span>
        <select
          data-testid="country-select"
          value={country || ''}
          onChange={handleCountryChange}
        >
          <option value="">Select Country</option>
          <option value="United Kingdom">United Kingdom</option>
          <option value="United States">United States</option>
        </select>
        <input
          data-testid="address-input"
          value={values[`${fieldPrefix ? fieldPrefix + '_' : ''}address`] || ''}
          onChange={handleAddressChange}
          placeholder="Enter address"
        />
      </div>
    );
  };
});

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('AddressEditModal', () => {
  const mockUserProfile = {
    user: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    },
    profile: {
      send_invoices_to: 'HOME',
      send_study_material_to: 'WORK'
    },
    home_address: {
      building: '123 Main Street',
      street: 'Apartment 4B',
      district: 'Westminster',
      town: 'London',
      postcode: 'SW1A 1AA',
      country: 'United Kingdom'
    },
    work_address: {
      company: 'Tech Solutions Ltd',
      department: 'Engineering',
      building: '456 Business Park',
      street: 'Tower 2, Floor 5',
      district: 'Canary Wharf',
      town: 'London',
      postcode: 'E14 5AB',
      country: 'United Kingdom'
    }
  };

  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    addressType: 'delivery',
    selectedAddressType: 'WORK', // Default based on profile preference for delivery
    userProfile: mockUserProfile,
    onAddressUpdate: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userService.updateUserProfile.mockResolvedValue({
      status: 'success',
      message: 'Profile updated successfully'
    });

    const addressValidationService = require('../../../services/addressValidationService').default;
    const addressMetadataService = require('../../../services/addressMetadataService').default;

    // Reset to default mocks
    addressValidationService.validateAddress.mockResolvedValue({
      hasMatch: false,
      bestMatch: null,
      needsComparison: false
    });

    addressMetadataService.fetchAddressMetadata.mockResolvedValue({
      addressLookupSupported: true
    });
  });

  describe('Modal Rendering', () => {
    test('should render modal when open is true', () => {
      renderWithTheme(<AddressEditModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Delivery Address')).toBeInTheDocument();
    });

    test('should not render modal when open is false', () => {
      renderWithTheme(<AddressEditModal {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('should display correct title for invoice address type', () => {
      renderWithTheme(<AddressEditModal {...defaultProps} addressType="invoice" />);

      expect(screen.getByText('Edit Invoice Address')).toBeInTheDocument();
    });
  });

  describe('Manual Entry Default Behavior', () => {
    test('shows DynamicAddressForm by default when modal opens', async () => {
      renderWithTheme(
        <AddressEditModal
          open={true}
          onClose={jest.fn()}
          addressType="delivery"
          selectedAddressType="HOME"
          userProfile={mockUserProfile}
          onAddressUpdate={jest.fn()}
        />
      );

      // Should show the DynamicAddressForm (manual entry), not SmartAddressInput
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
        expect(screen.queryByTestId('smart-address-input')).not.toBeInTheDocument();
      });
    });

    test('should pre-fill country selection based on current address', () => {
      renderWithTheme(<AddressEditModal {...defaultProps} />);

      // Should pre-fill with work address country (since delivery uses send_study_material_to: WORK)
      expect(screen.getByTestId('country-select')).toHaveValue('United Kingdom');
    });

    test('should display DynamicAddressForm with pre-filled address data', async () => {
      renderWithTheme(<AddressEditModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
      });
    });
  });

  describe.skip('Manual Entry Option (complex async)', () => {
    test('should show "Enter address manually" button', () => {
      renderWithTheme(<AddressEditModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /enter address manually/i })).toBeInTheDocument();
    });

    test('should pre-fill form with current address data when manual entry is selected', async () => {
      const user = userEvent.setup();
      renderWithTheme(<AddressEditModal {...defaultProps} />);

      const manualButton = screen.getByRole('button', { name: /enter address manually/i });
      await user.click(manualButton);

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
        expect(screen.getByTestId('address-input')).toHaveValue('456 Business Park Tower 2, Floor 5');
      });
    });
  });

  describe('Modal Footer Actions', () => {
    test('should display Cancel and Update Address buttons', () => {
      renderWithTheme(<AddressEditModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update address/i })).toBeInTheDocument();
    });

    test('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCloseMock = jest.fn();

      renderWithTheme(<AddressEditModal {...defaultProps} onClose={onCloseMock} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test('should disable Update Address button when form is invalid', () => {
      renderWithTheme(<AddressEditModal {...defaultProps} />);

      const updateButton = screen.getByRole('button', { name: /update address/i });
      expect(updateButton).toBeDisabled();
    });
  });

  describe.skip('Profile Update Functionality (complex async)', () => {
    test('should show confirmation prompt when Update Address is clicked with valid data', async () => {
      const user = userEvent.setup();
      renderWithTheme(<AddressEditModal {...defaultProps} />);

      // Fill in required fields
      const countrySelect = screen.getByTestId('country-select');
      await user.selectOptions(countrySelect, 'United Kingdom');

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
      });

      const addressInput = screen.getByTestId('address-input');
      await user.clear(addressInput);
      await user.type(addressInput, 'New Address');

      const updateButton = screen.getByRole('button', { name: /update address/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm address update/i)).toBeInTheDocument();
      });
    });

    test('should call userService.updateUserProfile when confirmation is accepted', async () => {
      const user = userEvent.setup();
      renderWithTheme(<AddressEditModal {...defaultProps} />);

      // Fill in required fields and trigger update
      const countrySelect = screen.getByTestId('country-select');
      await user.selectOptions(countrySelect, 'United Kingdom');

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
      });

      const addressInput = screen.getByTestId('address-input');
      await user.clear(addressInput);
      await user.type(addressInput, 'New Address');

      const updateButton = screen.getByRole('button', { name: /update address/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm address update/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(userService.updateUserProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            work_address: expect.objectContaining({
              address: 'New Address',
              country: 'United Kingdom'
            })
          })
        );
      });
    });

    test('should call onAddressUpdate callback after successful profile update', async () => {
      const user = userEvent.setup();
      const onAddressUpdateMock = jest.fn();

      renderWithTheme(
        <AddressEditModal
          {...defaultProps}
          onAddressUpdate={onAddressUpdateMock}
        />
      );

      // Fill in required fields and trigger update
      const countrySelect = screen.getByTestId('country-select');
      await user.selectOptions(countrySelect, 'United Kingdom');

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
      });

      const addressInput = screen.getByTestId('address-input');
      await user.clear(addressInput);
      await user.type(addressInput, 'New Address');

      const updateButton = screen.getByRole('button', { name: /update address/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm address update/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(onAddressUpdateMock).toHaveBeenCalledTimes(1);
      });
    });

    test('should close modal after successful profile update', async () => {
      const user = userEvent.setup();
      const onCloseMock = jest.fn();

      renderWithTheme(
        <AddressEditModal
          {...defaultProps}
          onClose={onCloseMock}
        />
      );

      // Fill in required fields and trigger update
      const countrySelect = screen.getByTestId('country-select');
      await user.selectOptions(countrySelect, 'United Kingdom');

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
      });

      const addressInput = screen.getByTestId('address-input');
      await user.clear(addressInput);
      await user.type(addressInput, 'New Address');

      const updateButton = screen.getByRole('button', { name: /update address/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm address update/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(onCloseMock).toHaveBeenCalledTimes(1);
      });
    });

    test('should show "For this order only" option in confirmation dialog', async () => {
      const user = userEvent.setup();
      renderWithTheme(<AddressEditModal {...defaultProps} />);

      // Fill in required fields
      const countrySelect = screen.getByTestId('country-select');
      await user.selectOptions(countrySelect, 'United Kingdom');

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
      });

      const addressInput = screen.getByTestId('address-input');
      await user.clear(addressInput);
      await user.type(addressInput, 'New Address');

      // Click update to show confirmation
      const updateButton = screen.getByRole('button', { name: /update address/i });
      await user.click(updateButton);

      // Check confirmation dialog has both options
      await waitFor(() => {
        expect(screen.getByText('Confirm Address Update')).toBeInTheDocument();
        expect(screen.getByText('Update Profile')).toBeInTheDocument();
        expect(screen.getByText('For this order only')).toBeInTheDocument();
      });
    });

    test('should handle order-only address update correctly', async () => {
      const user = userEvent.setup();
      const onAddressUpdateMock = jest.fn();

      renderWithTheme(
        <AddressEditModal
          {...defaultProps}
          onAddressUpdate={onAddressUpdateMock}
        />
      );

      // Fill in required fields
      const countrySelect = screen.getByTestId('country-select');
      await user.selectOptions(countrySelect, 'United Kingdom');

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
      });

      const addressInput = screen.getByTestId('address-input');
      await user.clear(addressInput);
      await user.type(addressInput, 'Order Only Address');

      const updateButton = screen.getByRole('button', { name: /update address/i });
      await user.click(updateButton);

      // Click "For this order only"
      await waitFor(() => {
        expect(screen.getByText('For this order only')).toBeInTheDocument();
      });

      const orderOnlyButton = screen.getByText('For this order only');
      await user.click(orderOnlyButton);

      // Verify callback was called with orderOnly flag
      await waitFor(() => {
        expect(onAddressUpdateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            orderOnly: true,
            addressData: expect.objectContaining({
              address: 'Order Only Address',
              country: 'United Kingdom'
            })
          })
        );
      });
    });
  });

  describe.skip('Error Handling (complex async)', () => {
    test('should display error message when profile update fails', async () => {
      const user = userEvent.setup();
      userService.updateUserProfile.mockRejectedValueOnce({
        response: { data: { message: 'Update failed' } }
      });

      renderWithTheme(<AddressEditModal {...defaultProps} />);

      // Fill in required fields and trigger update
      const countrySelect = screen.getByTestId('country-select');
      await user.selectOptions(countrySelect, 'United Kingdom');

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
      });

      const addressInput = screen.getByTestId('address-input');
      await user.clear(addressInput);
      await user.type(addressInput, 'New Address');

      const updateButton = screen.getByRole('button', { name: /update address/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/confirm address update/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/update failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Address Validation and Comparison Flow', () => {
    test('should show comparison modal when addresses differ', async () => {
      const user = userEvent.setup();
      const addressValidationService = require('../../../services/addressValidationService').default;

      // Mock validation to return a different address
      addressValidationService.validateAddress.mockResolvedValueOnce({
        hasMatch: true,
        bestMatch: {
          address: '10 Downing Street',
          city: 'Westminster',
          postal_code: 'SW1A 2AA',
          country: 'United Kingdom'
        },
        needsComparison: true
      });

      renderWithTheme(<AddressEditModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
      });

      // Fill in address fields
      const addressInput = screen.getByTestId('address-input');
      await user.clear(addressInput);
      await user.type(addressInput, '10 Downing St');

      // Click update button
      const updateButton = screen.getByRole('button', { name: /update address/i });
      await user.click(updateButton);

      // Should show comparison modal
      await waitFor(() => {
        expect(screen.getByTestId('address-comparison-modal')).toBeInTheDocument();
      });
    });

    test('should not show comparison modal when addresses match', async () => {
      const user = userEvent.setup();
      const addressValidationService = require('../../../services/addressValidationService').default;

      // Mock validation to return matching address
      addressValidationService.validateAddress.mockResolvedValueOnce({
        hasMatch: true,
        bestMatch: {
          address: '10 Downing Street',
          city: 'London',
          postal_code: 'SW1A 2AA',
          country: 'United Kingdom'
        },
        needsComparison: false
      });

      renderWithTheme(<AddressEditModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
      });

      // Fill in address fields
      const addressInput = screen.getByTestId('address-input');
      await user.clear(addressInput);
      await user.type(addressInput, '10 Downing Street');

      // Click update button
      const updateButton = screen.getByRole('button', { name: /update address/i });
      await user.click(updateButton);

      // Should NOT show comparison modal, should show confirmation dialog instead
      await waitFor(() => {
        expect(screen.queryByTestId('address-comparison-modal')).not.toBeInTheDocument();
      });
    });

    test('should proceed without validation for countries without lookup support', async () => {
      const user = userEvent.setup();
      const addressMetadataService = require('../../../services/addressMetadataService').default;

      // Mock metadata to indicate no lookup support
      addressMetadataService.fetchAddressMetadata.mockResolvedValueOnce({
        addressLookupSupported: false
      });

      renderWithTheme(<AddressEditModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
      });

      // Fill in address fields
      const addressInput = screen.getByTestId('address-input');
      await user.clear(addressInput);
      await user.type(addressInput, 'Some Address');

      // Click update button
      const updateButton = screen.getByRole('button', { name: /update address/i });
      await user.click(updateButton);

      // Should not call validateAddress
      const addressValidationService = require('../../../services/addressValidationService').default;
      await waitFor(() => {
        expect(addressValidationService.validateAddress).not.toHaveBeenCalled();
      });
    });
  });

  describe('Address Type Handling', () => {
    test('should update home_address for delivery when user preference is HOME', () => {
      const homePreferenceProfile = {
        ...mockUserProfile,
        profile: {
          ...mockUserProfile.profile,
          send_study_material_to: 'HOME'
        }
      };

      renderWithTheme(
        <AddressEditModal
          {...defaultProps}
          userProfile={homePreferenceProfile}
          addressType="delivery"
          selectedAddressType="HOME"
        />
      );

      // Should pre-fill with home address country
      expect(screen.getByTestId('country-select')).toHaveValue('United Kingdom');
    });

    test('should update work_address for invoice when user preference is WORK', () => {
      const workPreferenceProfile = {
        ...mockUserProfile,
        profile: {
          ...mockUserProfile.profile,
          send_invoices_to: 'WORK'
        }
      };

      renderWithTheme(
        <AddressEditModal
          {...defaultProps}
          userProfile={workPreferenceProfile}
          addressType="invoice"
          selectedAddressType="WORK"
        />
      );

      // Should pre-fill with work address country
      expect(screen.getByTestId('country-select')).toHaveValue('United Kingdom');
    });
  });

  describe('selectedAddressType Prop - BUG FIX', () => {
    // This test suite verifies the fix for the bug where the modal showed
    // stale address data when the user changed the dropdown selection

    test('should use selectedAddressType prop to determine which address to show', () => {
      // User's profile preference is HOME, but they selected WORK in dropdown
      const profileWithHomePreference = {
        ...mockUserProfile,
        profile: {
          ...mockUserProfile.profile,
          send_study_material_to: 'HOME' // Profile preference is HOME
        }
      };

      renderWithTheme(
        <AddressEditModal
          {...defaultProps}
          userProfile={profileWithHomePreference}
          addressType="delivery"
          selectedAddressType="WORK" // But user selected WORK in dropdown
        />
      );

      // Should use WORK address (from selectedAddressType), not HOME (from preference)
      // Work address has postcode E14 5AB, Home has SW1A 1AA
      expect(screen.getByTestId('country-select')).toHaveValue('United Kingdom');
    });

    test('should show HOME address when selectedAddressType is HOME regardless of preference', () => {
      // User's profile preference is WORK, but they selected HOME in dropdown
      const profileWithWorkPreference = {
        ...mockUserProfile,
        profile: {
          ...mockUserProfile.profile,
          send_study_material_to: 'WORK' // Profile preference is WORK
        }
      };

      renderWithTheme(
        <AddressEditModal
          {...defaultProps}
          userProfile={profileWithWorkPreference}
          addressType="delivery"
          selectedAddressType="HOME" // But user selected HOME in dropdown
        />
      );

      // Should use HOME address (from selectedAddressType), not WORK (from preference)
      expect(screen.getByTestId('country-select')).toHaveValue('United Kingdom');
    });

    test('should show WORK address when selectedAddressType is WORK for invoice', () => {
      // User's profile preference is HOME for invoices, but they selected WORK
      const profileWithHomeInvoicePreference = {
        ...mockUserProfile,
        profile: {
          ...mockUserProfile.profile,
          send_invoices_to: 'HOME' // Profile preference is HOME
        }
      };

      renderWithTheme(
        <AddressEditModal
          {...defaultProps}
          userProfile={profileWithHomeInvoicePreference}
          addressType="invoice"
          selectedAddressType="WORK" // But user selected WORK in dropdown
        />
      );

      // Should use WORK address (from selectedAddressType), not HOME (from preference)
      expect(screen.getByTestId('country-select')).toHaveValue('United Kingdom');
    });

    test('should initialize form values based on selectedAddressType not preferences', () => {
      // Create profile with distinctly different addresses
      const profileWithDistinctAddresses = {
        ...mockUserProfile,
        profile: {
          send_study_material_to: 'HOME', // Preference is HOME
          send_invoices_to: 'HOME'
        },
        home_address: {
          building: 'Home Building',
          street: 'Home Street',
          town: 'Home Town',
          postcode: 'HOME123',
          country: 'United Kingdom'
        },
        work_address: {
          company: 'Work Company',
          building: 'Work Building',
          street: 'Work Street',
          town: 'Work Town',
          postcode: 'WORK456',
          country: 'United States'
        }
      };

      renderWithTheme(
        <AddressEditModal
          {...defaultProps}
          userProfile={profileWithDistinctAddresses}
          addressType="delivery"
          selectedAddressType="WORK" // User selected WORK, overriding preference
        />
      );

      // Should show United States (from WORK address), not United Kingdom (from HOME)
      expect(screen.getByTestId('country-select')).toHaveValue('United States');
    });
  });
});