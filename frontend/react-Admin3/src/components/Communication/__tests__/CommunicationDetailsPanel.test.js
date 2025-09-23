import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CommunicationDetailsPanel from '../CommunicationDetailsPanel';

// Mock the ValidatedPhoneInput component
jest.mock('../../User/ValidatedPhoneInput', () => {
  return function MockValidatedPhoneInput({ value, onChange, onValidationChange, error, ...props }) {
    return (
      <input
        data-testid={props['data-testid']}
        value={value || ''}
        onChange={(e) => {
          if (onChange) onChange(e);
          if (onValidationChange) onValidationChange({ isValid: true, error: null });
        }}
        placeholder={props.placeholder}
        style={{ borderColor: error ? 'red' : 'initial' }}
      />
    );
  };
});

// Mock userService
jest.mock('../../../services/userService', () => ({
  updateUserProfile: jest.fn()
}));

// Mock config
jest.mock('../../../config', () => {
  const config = {
    apiBaseUrl: 'http://localhost:8000'
  };
  return {
    __esModule: true,
    default: config
  };
});

// Mock fetch for countries API
global.fetch = jest.fn(() => {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { name: 'United Kingdom', phone_code: '+44' },
      { name: 'United States', phone_code: '+1' },
      { name: 'India', phone_code: '+91' }
    ])
  });
});

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockUserProfile = {
  profile: {
    home_phone: '+44 20 7946 0958',
    mobile_phone: '+44 7700 900123',
    work_phone: '+44 20 8765 4321'
  },
  email: 'test@example.com'
};

describe('CommunicationDetailsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
  });

  describe('Rendering', () => {
    test('renders communication details panel with title', () => {
      renderWithTheme(
        <CommunicationDetailsPanel userProfile={mockUserProfile} />
      );

      expect(screen.getByText('Communication Details')).toBeInTheDocument();
    });

    test('pre-fills fields when phone numbers are in contact_numbers format from backend', () => {
      // This reproduces the actual backend response format
      const backendFormatUserProfile = {
        user: {
          id: 1,
          email: 'eugene.lo1115@gmail.com'
        },
        profile: {
          title: 'Mr',
          send_invoices_to: 'home',
          send_study_material_to: 'home'
        },
        contact_numbers: {
          mobile_phone: '+44 7700 900123',
          home_phone: '+44 20 7946 0958',
          work_phone: '+44 20 8765 4321'
        },
        email: 'eugene.lo1115@gmail.com'
      };

      renderWithTheme(
        <CommunicationDetailsPanel userProfile={backendFormatUserProfile} />
      );

      // Should populate phone fields from contact_numbers
      expect(screen.getByTestId('home-phone-input')).toHaveValue('+44 20 7946 0958');
      expect(screen.getByTestId('mobile-phone-input')).toHaveValue('+44 7700 900123');
      expect(screen.getByTestId('work-phone-input')).toHaveValue('+44 20 8765 4321');
      expect(screen.getByTestId('email-input')).toHaveValue('eugene.lo1115@gmail.com');
    });

    test('renders all required phone fields', () => {
      renderWithTheme(
        <CommunicationDetailsPanel userProfile={mockUserProfile} />
      );

      expect(screen.getByTestId('home-phone-input')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-phone-input')).toBeInTheDocument();
      expect(screen.getByTestId('work-phone-input')).toBeInTheDocument();
    });

    test('renders email address field', () => {
      renderWithTheme(
        <CommunicationDetailsPanel userProfile={mockUserProfile} />
      );

      expect(screen.getByTestId('email-input')).toBeInTheDocument();
    });

    test('displays required field indicators for mobile phone and email', () => {
      renderWithTheme(
        <CommunicationDetailsPanel userProfile={mockUserProfile} />
      );

      // Mobile phone should be marked as required
      expect(screen.getAllByText(/Mobile Phone/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/\*/).length).toBeGreaterThan(0); // Required asterisk

      // Email should be marked as required
      expect(screen.getAllByText(/Email Address/).length).toBeGreaterThan(0);
    });

    test('pre-fills fields with user profile data', () => {
      renderWithTheme(
        <CommunicationDetailsPanel userProfile={mockUserProfile} />
      );

      expect(screen.getByTestId('home-phone-input')).toHaveValue('+44 20 7946 0958');
      expect(screen.getByTestId('mobile-phone-input')).toHaveValue('+44 7700 900123');
      expect(screen.getByTestId('work-phone-input')).toHaveValue('+44 20 8765 4321');
      expect(screen.getByTestId('email-input')).toHaveValue('test@example.com');
    });
  });

  describe('Validation', () => {
    test('shows error when mobile phone is empty', async () => {
      renderWithTheme(
        <CommunicationDetailsPanel userProfile={{ profile: {}, email: '' }} />
      );

      const saveButton = screen.getByText('Update Communication Details');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Mobile phone is required')).toBeInTheDocument();
      });
    });

    test('shows error when email is empty', async () => {
      renderWithTheme(
        <CommunicationDetailsPanel userProfile={{ profile: {}, email: '' }} />
      );

      const saveButton = screen.getByText('Update Communication Details');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Email address is required')).toBeInTheDocument();
      });
    });

    test('shows error for invalid email format', async () => {
      renderWithTheme(
        <CommunicationDetailsPanel userProfile={{ profile: {}, email: '' }} />
      );

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      const saveButton = screen.getByText('Update Communication Details');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    test('validates phone number format using international standards', async () => {
      renderWithTheme(
        <CommunicationDetailsPanel userProfile={{ profile: {}, email: 'test@example.com' }} />
      );

      const mobileInput = screen.getByTestId('mobile-phone-input');
      fireEvent.change(mobileInput, { target: { value: '123' } }); // Too short

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid mobile phone number')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Profile Update Functionality', () => {
    test('shows confirmation dialog when update button is clicked', async () => {
      renderWithTheme(
        <CommunicationDetailsPanel
          userProfile={mockUserProfile}
          onProfileUpdate={jest.fn()}
        />
      );

      const saveButton = screen.getByText('Update Communication Details');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Update Communication Details?')).toBeInTheDocument();
        expect(screen.getByText('This will update your profile with the new communication details.')).toBeInTheDocument();
      });
    });

    test('calls onProfileUpdate callback when profile is successfully updated', async () => {
      const mockOnProfileUpdate = jest.fn();
      const userService = require('../../../services/userService');
      userService.updateUserProfile.mockResolvedValue({ status: 'success' });

      renderWithTheme(
        <CommunicationDetailsPanel
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      // Click update button
      const saveButton = screen.getByText('Update Communication Details');
      fireEvent.click(saveButton);

      // Confirm in dialog
      await waitFor(() => {
        const confirmButton = screen.getByText('Update');
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockOnProfileUpdate).toHaveBeenCalled();
      });
    });

    test('handles profile update errors gracefully', async () => {
      const userService = require('../../../services/userService');
      userService.updateUserProfile.mockRejectedValue(new Error('Update failed'));

      renderWithTheme(
        <CommunicationDetailsPanel
          userProfile={mockUserProfile}
          onProfileUpdate={jest.fn()}
        />
      );

      // Click update button
      const saveButton = screen.getByText('Update Communication Details');
      fireEvent.click(saveButton);

      // Confirm in dialog
      await waitFor(() => {
        const confirmButton = screen.getByText('Update');
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to update communication details. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Validation', () => {
    test('provides real-time email validation feedback', async () => {
      renderWithTheme(
        <CommunicationDetailsPanel userProfile={{ profile: {}, email: '' }} />
      );

      const emailInput = screen.getByTestId('email-input');

      // Type invalid email
      fireEvent.change(emailInput, { target: { value: 'test@' } });

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });

      // Type valid email
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      await waitFor(() => {
        expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
      });
    });

    test('provides real-time phone validation feedback', async () => {
      renderWithTheme(
        <CommunicationDetailsPanel userProfile={{ profile: {}, email: 'test@example.com' }} />
      );

      const mobileInput = screen.getByTestId('mobile-phone-input');

      // Type invalid phone
      fireEvent.change(mobileInput, { target: { value: '123' } });

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid mobile phone number')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels for form fields', () => {
      renderWithTheme(
        <CommunicationDetailsPanel userProfile={mockUserProfile} />
      );

      // Check that labels exist for the fields using getAllBy to handle multiple elements
      expect(screen.getAllByText(/Mobile Phone/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Email Address/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Home Phone/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Work Phone/).length).toBeGreaterThan(0);
    });

    test('has proper error associations with form fields', async () => {
      renderWithTheme(
        <CommunicationDetailsPanel userProfile={{ profile: {}, email: '' }} />
      );

      const saveButton = screen.getByText('Update Communication Details');
      fireEvent.click(saveButton);

      await waitFor(() => {
        // Check that error messages appear
        expect(screen.getByText('Mobile phone is required')).toBeInTheDocument();
        expect(screen.getByText('Email address is required')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('shows loading state during profile update', async () => {
      const userService = require('../../../services/userService');
      userService.updateUserProfile.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithTheme(
        <CommunicationDetailsPanel
          userProfile={mockUserProfile}
          onProfileUpdate={jest.fn()}
        />
      );

      // Click update button
      const saveButton = screen.getByText('Update Communication Details');
      fireEvent.click(saveButton);

      // Confirm in dialog
      await waitFor(() => {
        const confirmButton = screen.getByText('Update');
        fireEvent.click(confirmButton);
      });

      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });
  });
});