// src/components/User/__tests__/ProfileForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock config - BEFORE imports
jest.mock('../../../config', () => ({
  __esModule: true,
  default: { apiBaseUrl: 'http://localhost:8888' },
}));

// Mock authService
jest.mock('../../../services/authService', () => ({
  __esModule: true,
  default: {
    register: jest.fn(),
  },
}));

// Mock userService
jest.mock('../../../services/userService', () => ({
  __esModule: true,
  default: {
    updateProfile: jest.fn(),
  },
}));

// Mock CountryAutocomplete
jest.mock('../CountryAutocomplete', () => {
  const React = require('react');
  return function MockCountryAutocomplete({ name, value, onChange, placeholder }) {
    return React.createElement('input', {
      'data-testid': `country-autocomplete-${name}`,
      name: name,
      value: value || '',
      onChange: onChange,
      placeholder: placeholder,
    });
  };
});

// Mock PhoneCodeAutocomplete
jest.mock('../PhoneCodeAutocomplete', () => {
  const React = require('react');
  return function MockPhoneCodeAutocomplete() {
    return React.createElement('span', { 'data-testid': 'phone-code-autocomplete' }, '+44');
  };
});

// Mock fetch for country list
const mockFetch = jest.fn();
global.fetch = mockFetch;

import ProfileForm from '../ProfileForm';
import authService from '../../../services/authService';

const theme = createTheme();

const renderComponent = async (props = {}) => {
  let result;
  await act(async () => {
    result = render(
      <ThemeProvider theme={theme}>
        <ProfileForm {...props} />
      </ThemeProvider>
    );
  });
  return result;
};

describe('ProfileForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve([
        { name: 'United Kingdom', phone_code: '+44' },
        { name: 'United States', phone_code: '+1' },
      ]),
    });
  });

  describe('registration mode (default)', () => {
    test('renders registration title by default', async () => {
      await renderComponent();
      expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
    });

    test('renders name fields', async () => {
      await renderComponent();
      expect(screen.getByText(/first name/i)).toBeInTheDocument();
      expect(screen.getByText(/last name/i)).toBeInTheDocument();
    });

    test('renders email field', async () => {
      await renderComponent();
      // Look for the Email label specifically
      expect(screen.getByText(/^email \*/i)).toBeInTheDocument();
    });

    test('renders password fields', async () => {
      await renderComponent();
      expect(screen.getByText(/^password/i)).toBeInTheDocument();
      expect(screen.getByText(/confirm password/i)).toBeInTheDocument();
    });

    test('renders submit button', async () => {
      await renderComponent();
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    });

    test('renders title select', async () => {
      await renderComponent();
      expect(screen.getByText(/title/i)).toBeInTheDocument();
    });
  });

  describe('profile mode', () => {
    const initialData = {
      user: {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      },
      profile: {
        title: 'Mr',
        send_invoices_to: 'HOME',
        send_study_material_to: 'HOME',
      },
      home_address: {
        street: '123 Main St',
        town: 'London',
        postcode: 'W1 1AA',
        state: 'Greater London',
        country: 'United Kingdom',
      },
      contact_numbers: {
        home_phone: '02012345678',
        mobile_phone: '07712345678',
      },
    };

    test('renders update profile title in profile mode', async () => {
      await renderComponent({ mode: 'profile', initialData });
      expect(screen.getByRole('heading', { name: 'Update Profile' })).toBeInTheDocument();
    });

    test('populates form with initial data', async () => {
      await renderComponent({ mode: 'profile', initialData });

      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
      });
    });

    test('shows email change info alert', async () => {
      await renderComponent({ mode: 'profile', initialData });
      expect(screen.getByText(/if you change your email address/i)).toBeInTheDocument();
    });

    test('shows password optional info alert', async () => {
      await renderComponent({ mode: 'profile', initialData });
      expect(screen.getByText(/leave password fields empty/i)).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    test('shows error for missing first name', async () => {
      await renderComponent();

      // Click enter address manually to show address fields
      await act(async () => {
        fireEvent.click(screen.getByText(/enter address manually/i));
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /register/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });
    });

    test('shows error for missing email', async () => {
      await renderComponent();

      await act(async () => {
        fireEvent.click(screen.getByText(/enter address manually/i));
        fireEvent.click(screen.getByRole('button', { name: /register/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('work address toggle', () => {
    test('hides work address fields by default', async () => {
      await renderComponent();
      expect(screen.queryByText('Company')).not.toBeInTheDocument();
    });

    test('shows work address fields when toggled', async () => {
      await renderComponent();

      await act(async () => {
        fireEvent.click(screen.getByText(/add work details/i));
      });

      expect(screen.getByText('Company')).toBeInTheDocument();
    });
  });

  describe('address search', () => {
    test('shows address search by default', async () => {
      await renderComponent();
      expect(screen.getByText(/find your address/i)).toBeInTheDocument();
    });

    test('shows manual address fields when clicked', async () => {
      await renderComponent();

      await act(async () => {
        fireEvent.click(screen.getByText(/enter address manually/i));
      });

      expect(screen.getByText(/street/i)).toBeInTheDocument();
      expect(screen.getByText(/town or city/i)).toBeInTheDocument();
    });

    test('can go back to address search', async () => {
      await renderComponent();

      await act(async () => {
        fireEvent.click(screen.getByText(/enter address manually/i));
      });

      await act(async () => {
        fireEvent.click(screen.getByText(/back to address search/i));
      });

      expect(screen.getByText(/find your address/i)).toBeInTheDocument();
    });
  });

  describe('preferences', () => {
    test('renders invoice delivery preference', async () => {
      await renderComponent();
      expect(screen.getByText(/send invoices to/i)).toBeInTheDocument();
    });

    test('renders study material delivery preference', async () => {
      await renderComponent();
      expect(screen.getByText(/send study material to/i)).toBeInTheDocument();
    });
  });

  describe('custom props', () => {
    test('uses custom title', async () => {
      await renderComponent({ title: 'Create Account' });
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    });

    test('uses custom subtitle', async () => {
      await renderComponent({ subtitle: 'Join our community today' });
      expect(screen.getByText('Join our community today')).toBeInTheDocument();
    });

    test('uses custom submit button text', async () => {
      await renderComponent({ submitButtonText: 'Sign Up Now' });
      expect(screen.getByRole('button', { name: 'Sign Up Now' })).toBeInTheDocument();
    });

    test('shows switch to login button when provided', async () => {
      const switchToLogin = jest.fn();
      await renderComponent({ switchToLogin });

      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    });
  });
});
