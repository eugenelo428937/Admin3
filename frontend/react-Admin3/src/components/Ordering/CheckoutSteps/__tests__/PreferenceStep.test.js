// src/components/Ordering/CheckoutSteps/__tests__/PreferenceStep.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PreferenceStep from '../PreferenceStep';

// Mock rulesEngineService
jest.mock('../../../../services/rulesEngineService', () => ({
  __esModule: true,
  default: {
    executeRules: jest.fn(),
    ENTRY_POINTS: {
      CHECKOUT_PREFERENCE: 'checkout_preference',
    },
  },
}));

// Mock useCart
jest.mock('../../../../contexts/CartContext', () => ({
  useCart: () => ({
    cartData: {
      id: 'cart-123',
      items: [{ id: 'item-1', product_name: 'Test Product', actual_price: 50 }],
      has_digital: false,
      has_tutorial: false,
      has_material: true,
      has_marking: false,
      total: 50,
    },
  }),
}));

// Mock useAuth
jest.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));

import rulesEngineService from '../../../../services/rulesEngineService';

const theme = createTheme();

const mockPreferences = [
  {
    preferenceKey: 'marketing_consent',
    title: 'Marketing Preferences',
    content: 'Would you like to receive marketing emails?',
    inputType: 'checkbox',
    default: false,
    options: [{ value: true, label: 'Yes, send me marketing emails' }],
    ruleId: 'rule-1',
  },
  {
    preferenceKey: 'delivery_preference',
    title: 'Delivery Preference',
    content: 'Choose your preferred delivery method',
    inputType: 'radio',
    default: 'standard',
    options: [
      { value: 'standard', label: 'Standard Delivery (3-5 days)' },
      { value: 'express', label: 'Express Delivery (1-2 days)' },
    ],
    ruleId: 'rule-2',
  },
  {
    preferenceKey: 'special_needs',
    title: 'Special Needs',
    content: { content: { message: 'Please let us know if you have any special requirements' } },
    inputType: 'combined_checkbox_textarea',
    default: { special_needs: false, details: '' },
    checkboxLabel: 'I have special requirements',
    textareaLabel: 'Please describe your requirements',
    textareaPlaceholder: 'Enter details here...',
    ruleId: 'rule-3',
  },
];

const renderComponent = (props = {}) => {
  const defaultProps = {
    preferences: {},
    setPreferences: jest.fn(),
    onPreferencesSubmit: jest.fn(),
  };

  return render(
    <ThemeProvider theme={theme}>
      <PreferenceStep {...defaultProps} {...props} />
    </ThemeProvider>
  );
};

describe('PreferenceStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rulesEngineService.executeRules.mockResolvedValue({
      success: true,
      preference_prompts: mockPreferences,
    });
  });

  describe('loading state', () => {
    test('shows loading indicator initially', () => {
      rulesEngineService.executeRules.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('Loading preferences...')).toBeInTheDocument();
    });
  });

  describe('rendering preferences', () => {
    test('renders preferences header', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Preferences')).toBeInTheDocument();
      });
    });

    test('renders checkbox preference', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Marketing Preferences')).toBeInTheDocument();
        expect(screen.getByText('Would you like to receive marketing emails?')).toBeInTheDocument();
        expect(screen.getByText('Yes, send me marketing emails')).toBeInTheDocument();
      });
    });

    test('renders radio preference', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Delivery Preference')).toBeInTheDocument();
        expect(screen.getByText('Choose your preferred delivery method')).toBeInTheDocument();
        expect(screen.getByText('Standard Delivery (3-5 days)')).toBeInTheDocument();
        expect(screen.getByText('Express Delivery (1-2 days)')).toBeInTheDocument();
      });
    });

    test('renders combined checkbox textarea preference', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Special Needs')).toBeInTheDocument();
        expect(screen.getByText('I have special requirements')).toBeInTheDocument();
      });
    });
  });

  describe('no preferences', () => {
    test('shows info message when no preferences available', async () => {
      rulesEngineService.executeRules.mockResolvedValue({
        success: true,
        preference_prompts: [],
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No preferences need to be set at this time. You can continue to payment.')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    test('shows error message when fetching fails', async () => {
      rulesEngineService.executeRules.mockRejectedValue(new Error('API error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to load preferences. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('checkbox interactions', () => {
    test('calls setPreferences when checkbox is clicked', async () => {
      const mockSetPreferences = jest.fn();
      renderComponent({ setPreferences: mockSetPreferences });

      await waitFor(() => {
        expect(screen.getByText('Marketing Preferences')).toBeInTheDocument();
      });

      const checkbox = screen.getByLabelText('Yes, send me marketing emails');
      fireEvent.click(checkbox);

      expect(mockSetPreferences).toHaveBeenCalled();
    });
  });

  describe('radio interactions', () => {
    test('calls setPreferences when radio option is selected', async () => {
      const mockSetPreferences = jest.fn();
      renderComponent({ setPreferences: mockSetPreferences });

      await waitFor(() => {
        expect(screen.getByText('Delivery Preference')).toBeInTheDocument();
      });

      const expressRadio = screen.getByLabelText('Express Delivery (1-2 days)');
      fireEvent.click(expressRadio);

      expect(mockSetPreferences).toHaveBeenCalled();
    });

    test('shows default value selected in radio group', async () => {
      renderComponent({
        preferences: {
          delivery_preference: { value: 'standard', inputType: 'radio', ruleId: 'rule-2' },
        },
      });

      await waitFor(() => {
        const standardRadio = screen.getByLabelText('Standard Delivery (3-5 days)');
        expect(standardRadio).toBeChecked();
      });
    });
  });

  describe('combined checkbox textarea interactions', () => {
    test('calls setPreferences when special needs checkbox is clicked', async () => {
      const mockSetPreferences = jest.fn();
      renderComponent({ setPreferences: mockSetPreferences });

      await waitFor(() => {
        expect(screen.getByText('Special Needs')).toBeInTheDocument();
      });

      const checkbox = screen.getByLabelText('I have special requirements');
      fireEvent.click(checkbox);

      expect(mockSetPreferences).toHaveBeenCalled();
    });

    test('calls setPreferences when textarea is filled', async () => {
      const mockSetPreferences = jest.fn();
      renderComponent({ setPreferences: mockSetPreferences });

      await waitFor(() => {
        expect(screen.getByText('Special Needs')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Enter details here...');
      fireEvent.change(textarea, { target: { value: 'My special requirements' } });

      expect(mockSetPreferences).toHaveBeenCalled();
    });
  });

  describe('text/textarea input types', () => {
    test('renders text input preference', async () => {
      rulesEngineService.executeRules.mockResolvedValue({
        success: true,
        preference_prompts: [
          {
            preferenceKey: 'notes',
            title: 'Order Notes',
            content: 'Add any notes for your order',
            inputType: 'text',
            default: '',
            placeholder: 'Enter notes',
            ruleId: 'rule-4',
          },
        ],
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Order Notes')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter notes')).toBeInTheDocument();
      });
    });

    test('renders textarea preference', async () => {
      rulesEngineService.executeRules.mockResolvedValue({
        success: true,
        preference_prompts: [
          {
            preferenceKey: 'comments',
            title: 'Additional Comments',
            content: 'Any additional comments?',
            inputType: 'textarea',
            default: '',
            placeholder: 'Enter comments',
            ruleId: 'rule-5',
          },
        ],
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Additional Comments')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter comments')).toBeInTheDocument();
      });
    });
  });

  describe('multiple checkbox options', () => {
    test('renders multiple checkboxes when options > 1', async () => {
      rulesEngineService.executeRules.mockResolvedValue({
        success: true,
        preference_prompts: [
          {
            preferenceKey: 'interests',
            title: 'Your Interests',
            content: 'Select your areas of interest',
            inputType: 'checkbox',
            default: [],
            options: [
              { value: 'actuarial', label: 'Actuarial Science' },
              { value: 'finance', label: 'Finance' },
              { value: 'statistics', label: 'Statistics' },
            ],
            ruleId: 'rule-6',
          },
        ],
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Your Interests')).toBeInTheDocument();
        expect(screen.getByLabelText('Actuarial Science')).toBeInTheDocument();
        expect(screen.getByLabelText('Finance')).toBeInTheDocument();
        expect(screen.getByLabelText('Statistics')).toBeInTheDocument();
      });
    });

    test('handles multiple checkbox selection', async () => {
      const mockSetPreferences = jest.fn();
      rulesEngineService.executeRules.mockResolvedValue({
        success: true,
        preference_prompts: [
          {
            preferenceKey: 'interests',
            title: 'Your Interests',
            content: 'Select your areas of interest',
            inputType: 'checkbox',
            default: [],
            options: [
              { value: 'actuarial', label: 'Actuarial Science' },
              { value: 'finance', label: 'Finance' },
            ],
            ruleId: 'rule-6',
          },
        ],
      });

      renderComponent({
        setPreferences: mockSetPreferences,
        preferences: { interests: { value: [], inputType: 'checkbox', ruleId: 'rule-6' } },
      });

      await waitFor(() => {
        expect(screen.getByText('Your Interests')).toBeInTheDocument();
      });

      const actuarialCheckbox = screen.getByLabelText('Actuarial Science');
      fireEvent.click(actuarialCheckbox);

      expect(mockSetPreferences).toHaveBeenCalled();
    });
  });

  describe('legacy preferences field', () => {
    test('handles legacy preferences field in response', async () => {
      rulesEngineService.executeRules.mockResolvedValue({
        success: true,
        preferences: [mockPreferences[0]], // Using legacy field name
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Marketing Preferences')).toBeInTheDocument();
      });
    });
  });

  describe('context content formats', () => {
    test('handles string content format', async () => {
      rulesEngineService.executeRules.mockResolvedValue({
        success: true,
        preference_prompts: [
          {
            preferenceKey: 'test',
            title: 'Test',
            content: 'Simple string content',
            inputType: 'checkbox',
            options: [{ value: true, label: 'Accept' }],
          },
        ],
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Simple string content')).toBeInTheDocument();
      });
    });

    test('handles nested content.message format', async () => {
      rulesEngineService.executeRules.mockResolvedValue({
        success: true,
        preference_prompts: [
          {
            preferenceKey: 'test',
            title: 'Test',
            content: { message: 'Nested message content' },
            inputType: 'checkbox',
            options: [{ value: true, label: 'Accept' }],
          },
        ],
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Nested message content')).toBeInTheDocument();
      });
    });
  });
});
