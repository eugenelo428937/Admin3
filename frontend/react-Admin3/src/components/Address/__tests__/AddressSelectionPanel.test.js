// src/components/Address/__tests__/AddressSelectionPanel.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AddressSelectionPanel from '../AddressSelectionPanel';

// Mock AddressEditModal - capture props for verification
let capturedModalProps = {};
jest.mock('../AddressEditModal', () => {
  return function MockAddressEditModal({ open, onClose, onAddressUpdate, selectedAddressType, addressType }) {
    // Capture props for test verification
    capturedModalProps = { selectedAddressType, addressType, open };

    if (!open) return null;
    return (
      <div data-testid="address-edit-modal">
        <span data-testid="modal-selected-address-type">{selectedAddressType}</span>
        <span data-testid="modal-address-type">{addressType}</span>
        <button onClick={() => onAddressUpdate({ orderOnly: false })}>Save to Profile</button>
        <button onClick={() => onAddressUpdate({ orderOnly: true, addressData: { street: 'New Street' } })}>
          For This Order Only
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

// Mock DynamicAddressForm
jest.mock('../DynamicAddressForm', () => {
  return function MockDynamicAddressForm({ address }) {
    return <div data-testid="dynamic-address-form">{JSON.stringify(address)}</div>;
  };
});

const theme = createTheme();

const mockUserProfile = {
  profile: {
    send_study_material_to: 'HOME',
    send_invoices_to: 'WORK',
  },
  home_address: {
    street: '123 Home Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
  },
  work_address: {
    company: 'ActEd Ltd',
    street: '456 Work Avenue',
    city: 'Manchester',
    postcode: 'M1 1AA',
    country: 'United Kingdom',
  },
};

const renderComponent = (props = {}) => {
  const defaultProps = {
    addressType: 'delivery',
    userProfile: mockUserProfile,
    onAddressChange: jest.fn(),
  };

  return render(
    <ThemeProvider theme={theme}>
      <AddressSelectionPanel {...defaultProps} {...props} />
    </ThemeProvider>
  );
};

describe('AddressSelectionPanel', () => {
  describe('rendering', () => {
    test('renders address selection dropdown', () => {
      renderComponent();
      expect(screen.getByLabelText(/select address/i)).toBeInTheDocument();
    });

    test('renders home and work options in dropdown', async () => {
      renderComponent();

      const dropdown = screen.getByRole('combobox');
      fireEvent.mouseDown(dropdown);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Home' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
      });
    });

    test('renders edit button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /edit address/i })).toBeInTheDocument();
    });

    test('shows alert when no user profile', () => {
      renderComponent({ userProfile: null });
      expect(screen.getByText(/please log in/i)).toBeInTheDocument();
    });
  });

  describe('address display', () => {
    test('displays home address data', async () => {
      renderComponent({ addressType: 'delivery' });

      await waitFor(() => {
        expect(screen.getByText('123 Home Street')).toBeInTheDocument();
        expect(screen.getByText('London')).toBeInTheDocument();
        expect(screen.getByText('SW1A 1AA')).toBeInTheDocument();
      });
    });

    test('displays company name for work address', async () => {
      renderComponent({ addressType: 'invoice' });

      // Wait for component to initialize with WORK based on invoice preference
      await waitFor(() => {
        expect(screen.getByText('ActEd Ltd')).toBeInTheDocument();
      });
    });

    test('shows no address message when address is empty', async () => {
      const profileWithEmptyAddress = {
        profile: { send_study_material_to: 'HOME' },
        home_address: {},
        work_address: {},
      };

      renderComponent({ userProfile: profileWithEmptyAddress });

      await waitFor(() => {
        expect(screen.getByText(/no home address found/i)).toBeInTheDocument();
      });
    });
  });

  describe('address selection', () => {
    test('selects HOME by default for delivery based on profile preference', async () => {
      renderComponent({ addressType: 'delivery' });

      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toHaveTextContent('Home');
    });

    test('selects WORK by default for invoice based on profile preference', async () => {
      renderComponent({ addressType: 'invoice' });

      await waitFor(() => {
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toHaveTextContent('Work');
      });
    });

    test('calls onAddressChange when selection changes', async () => {
      const mockOnAddressChange = jest.fn();
      renderComponent({ onAddressChange: mockOnAddressChange });

      const dropdown = screen.getByRole('combobox');
      fireEvent.mouseDown(dropdown);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('option', { name: 'Work' }));

      await waitFor(() => {
        expect(mockOnAddressChange).toHaveBeenCalled();
      });
    });
  });

  describe('edit modal', () => {
    test('opens edit modal on edit button click', async () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /edit address/i }));

      await waitFor(() => {
        expect(screen.getByTestId('address-edit-modal')).toBeInTheDocument();
      });
    });

    test('closes modal when close button clicked', async () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /edit address/i }));

      await waitFor(() => {
        expect(screen.getByTestId('address-edit-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('address-edit-modal')).not.toBeInTheDocument();
      });
    });

    test('shows order-only alert after saving for this order only', async () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /edit address/i }));

      await waitFor(() => {
        expect(screen.getByTestId('address-edit-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('For This Order Only'));

      await waitFor(() => {
        expect(screen.getByText(/this address is for this order only/i)).toBeInTheDocument();
      });
    });

    test('calls onAddressUpdate when saving to profile', async () => {
      const mockOnAddressUpdate = jest.fn();
      renderComponent({ onAddressUpdate: mockOnAddressUpdate });

      fireEvent.click(screen.getByRole('button', { name: /edit address/i }));

      await waitFor(() => {
        expect(screen.getByTestId('address-edit-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Save to Profile'));

      await waitFor(() => {
        expect(mockOnAddressUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('data test ids', () => {
    test('has correct test id for delivery dropdown', () => {
      renderComponent({ addressType: 'delivery' });
      expect(screen.getByTestId('delivery-address-dropdown')).toBeInTheDocument();
    });

    test('has correct test id for invoice dropdown', () => {
      renderComponent({ addressType: 'invoice' });
      expect(screen.getByTestId('invoice-address-dropdown')).toBeInTheDocument();
    });

    test('has correct test id for edit button', () => {
      renderComponent({ addressType: 'delivery' });
      expect(screen.getByTestId('delivery-edit-button')).toBeInTheDocument();
    });
  });

  describe('selectedAddressType prop passed to modal - BUG FIX', () => {
    // These tests verify the fix for the bug where the modal showed stale data
    // when the user changed the dropdown selection before clicking edit

    beforeEach(() => {
      capturedModalProps = {};
    });

    test('passes HOME as selectedAddressType when HOME is selected in dropdown', async () => {
      renderComponent({ addressType: 'delivery' });

      // Default selection is HOME based on profile preference
      fireEvent.click(screen.getByRole('button', { name: /edit address/i }));

      await waitFor(() => {
        expect(screen.getByTestId('address-edit-modal')).toBeInTheDocument();
      });

      // Verify the selectedAddressType prop was passed
      expect(screen.getByTestId('modal-selected-address-type')).toHaveTextContent('HOME');
    });

    test('passes WORK as selectedAddressType when WORK is selected in dropdown', async () => {
      renderComponent({ addressType: 'delivery' });

      // Change dropdown to WORK
      const dropdown = screen.getByRole('combobox');
      fireEvent.mouseDown(dropdown);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('option', { name: 'Work' }));

      // Wait for dropdown to close and state to update
      await waitFor(() => {
        expect(dropdown).toHaveTextContent('Work');
      });

      // Now click edit
      fireEvent.click(screen.getByRole('button', { name: /edit address/i }));

      await waitFor(() => {
        expect(screen.getByTestId('address-edit-modal')).toBeInTheDocument();
      });

      // Verify the selectedAddressType prop reflects the dropdown selection (WORK)
      expect(screen.getByTestId('modal-selected-address-type')).toHaveTextContent('WORK');
    });

    test('passes correct selectedAddressType after switching from HOME to WORK', async () => {
      renderComponent({ addressType: 'delivery' });

      // Start with HOME (default), switch to WORK
      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toHaveTextContent('Home');

      // Switch to WORK
      fireEvent.mouseDown(dropdown);
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('option', { name: 'Work' }));

      await waitFor(() => {
        expect(dropdown).toHaveTextContent('Work');
      });

      // Click edit - should pass WORK not HOME
      fireEvent.click(screen.getByRole('button', { name: /edit address/i }));

      await waitFor(() => {
        expect(screen.getByTestId('modal-selected-address-type')).toHaveTextContent('WORK');
      });
    });

    test('passes correct selectedAddressType for invoice address type', async () => {
      renderComponent({ addressType: 'invoice' });

      // Invoice defaults to WORK based on profile preference (send_invoices_to: 'WORK')
      await waitFor(() => {
        const dropdown = screen.getByRole('combobox');
        expect(dropdown).toHaveTextContent('Work');
      });

      // Click edit
      fireEvent.click(screen.getByRole('button', { name: /edit address/i }));

      await waitFor(() => {
        expect(screen.getByTestId('address-edit-modal')).toBeInTheDocument();
      });

      // Should pass WORK as selectedAddressType
      expect(screen.getByTestId('modal-selected-address-type')).toHaveTextContent('WORK');
    });
  });
});
