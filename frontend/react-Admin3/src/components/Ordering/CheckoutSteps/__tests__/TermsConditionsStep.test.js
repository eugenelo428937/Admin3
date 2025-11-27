// src/components/Ordering/CheckoutSteps/__tests__/TermsConditionsStep.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock useAuth hook
jest.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com' },
  }),
}));

// Mock rulesEngineService
jest.mock('../../../../services/rulesEngineService', () => ({
  __esModule: true,
  default: {
    executeRules: jest.fn(),
    acknowledgeRule: jest.fn(),
  },
}));

// Mock rulesEngineUtils
jest.mock('../../../../utils/rulesEngineUtils', () => ({
  rulesEngineHelpers: {
    executeCheckoutTerms: jest.fn(),
  },
  parseMessageContent: jest.fn((message, defaults) => ({
    title: message?.content?.title || defaults.title,
    message: message?.content?.message || defaults.message,
    checkboxText: message?.content?.checkbox_text || defaults.checkboxText,
    templateId: message?.template_id,
    ackKey: message?.ack_key,
    required: message?.required,
  })),
}));

import rulesEngineService from '../../../../services/rulesEngineService';
import { rulesEngineHelpers } from '../../../../utils/rulesEngineUtils';

// Mock RulesEngineAcknowledgmentModal
jest.mock('../../../Common/RulesEngineAcknowledgmentModal', () => {
  return function MockRulesEngineAcknowledgmentModal({ open }) {
    if (!open) return null;
    return <div data-testid="acknowledgment-modal">Modal</div>;
  };
});

import TermsConditionsStep from '../TermsConditionsStep';

const theme = createTheme();

const mockCartData = {
  id: 'cart-123',
  total: '150.00',
};

const mockCartItems = [
  { id: 'item-1', product_name: 'CM2 Study Material', quantity: 1 },
];

const defaultRulesResult = {
  success: true,
  messages: {
    classified: {
      acknowledgments: { inline: [], modal: [] },
      displays: { all: [] },
    },
  },
};

const renderComponent = (props = {}) => {
  const defaultProps = {
    cartData: mockCartData,
    cartItems: mockCartItems,
    generalTermsAccepted: false,
    setGeneralTermsAccepted: jest.fn(),
  };

  return render(
    <ThemeProvider theme={theme}>
      <TermsConditionsStep {...defaultProps} {...props} />
    </ThemeProvider>
  );
};

describe('TermsConditionsStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rulesEngineHelpers.executeCheckoutTerms.mockResolvedValue(defaultRulesResult);
  });

  describe('rendering', () => {
    test('renders step title', async () => {
      renderComponent();
      expect(screen.getByText('Step 2: Terms & Conditions')).toBeInTheDocument();
    });

    test('renders loading state initially', () => {
      // Create a never-resolving promise
      rulesEngineHelpers.executeCheckoutTerms.mockReturnValue(new Promise(() => {}));
      renderComponent();
      expect(screen.getByText(/Loading terms and conditions/i)).toBeInTheDocument();
    });

    test('renders terms card after loading', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Terms & Conditions', { selector: '.MuiCardHeader-title' })).toBeInTheDocument();
      });
    });

    test('renders checkbox', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });
    });

    test('renders default terms content', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/ActEd's full Terms & Conditions/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    test('shows error when cart data is null', async () => {
      renderComponent({ cartData: null });

      await waitFor(() => {
        expect(screen.getByText(/Cart data is not available/i)).toBeInTheDocument();
      });
    });

    test('shows error when cart ID is missing', async () => {
      renderComponent({ cartData: {} });

      await waitFor(() => {
        expect(screen.getByText(/Invalid cart data/i)).toBeInTheDocument();
      });
    });

    test('shows error when rules execution fails', async () => {
      rulesEngineHelpers.executeCheckoutTerms.mockRejectedValueOnce(new Error('API error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Failed to load terms and conditions/i)).toBeInTheDocument();
      });
    });
  });

  describe('checkbox interaction', () => {
    test('checkbox is unchecked when generalTermsAccepted is false', async () => {
      renderComponent({ generalTermsAccepted: false });

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();
      });
    });

    test('checkbox is checked when generalTermsAccepted is true', async () => {
      renderComponent({ generalTermsAccepted: true });

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();
      });
    });

    test('calls setGeneralTermsAccepted when checkbox is clicked', async () => {
      const mockSetTerms = jest.fn();
      renderComponent({ setGeneralTermsAccepted: mockSetTerms });

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('checkbox'));

      expect(mockSetTerms).toHaveBeenCalledWith(true);
    });
  });

  describe('rules engine integration', () => {
    test('calls executeCheckoutTerms on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(rulesEngineHelpers.executeCheckoutTerms).toHaveBeenCalled();
      });
    });

    test('passes cart data to executeCheckoutTerms', async () => {
      renderComponent();

      await waitFor(() => {
        expect(rulesEngineHelpers.executeCheckoutTerms).toHaveBeenCalledWith(
          mockCartData,
          mockCartItems,
          expect.anything(),
          expect.objectContaining({ id: 1 })
        );
      });
    });
  });

  describe('modal acknowledgments', () => {
    test('shows modal when modal acknowledgments present', async () => {
      rulesEngineHelpers.executeCheckoutTerms.mockResolvedValue({
        success: true,
        messages: {
          classified: {
            acknowledgments: {
              inline: [],
              modal: [{ content: { title: 'Digital Notice' } }],
            },
            displays: { all: [] },
          },
        },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('acknowledgment-modal')).toBeInTheDocument();
      });
    });

    test('does not show modal when no modal acknowledgments', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.queryByTestId('acknowledgment-modal')).not.toBeInTheDocument();
      });
    });
  });
});
