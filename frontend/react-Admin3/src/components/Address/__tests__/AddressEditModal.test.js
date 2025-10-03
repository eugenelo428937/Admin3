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

    return (
      <div data-testid="dynamic-address-form">
        <span>Address form for: {country}</span>
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
    <Provider theme={theme}>
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
    userProfile: mockUserProfile,
    onAddressUpdate: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userService.updateUserProfile.mockResolvedValue({
      status: 'success',
      message: 'Profile updated successfully'
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

  describe('SmartAddressInput Integration', () => {
    test('should display SmartAddressInput component by default', () => {
      renderWithTheme(<AddressEditModal {...defaultProps} />);

      expect(screen.getByTestId('smart-address-input')).toBeInTheDocument();
      expect(screen.getByTestId('country-select')).toBeInTheDocument();
    });

    test('should pre-fill country selection based on current address', () => {
      renderWithTheme(<AddressEditModal {...defaultProps} />);

      // Should pre-fill with work address country (since delivery uses send_study_material_to: WORK)
      expect(screen.getByTestId('country-select')).toHaveValue('United Kingdom');
    });

    test('should show DynamicAddressForm after country selection', async () => {
      const user = userEvent.setup();
      renderWithTheme(<AddressEditModal {...defaultProps} />);

      const countrySelect = screen.getByTestId('country-select');
      await user.selectOptions(countrySelect, 'United Kingdom');

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-address-form')).toBeInTheDocument();
      });
    });
  });

  describe('Manual Entry Option', () => {
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

  describe('Profile Update Functionality', () => {
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

  describe('Error Handling', () => {
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
        />
      );

      // Should pre-fill with work address country
      expect(screen.getByTestId('country-select')).toHaveValue('United Kingdom');
    });
  });
});