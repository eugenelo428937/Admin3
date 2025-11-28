// src/components/Ordering/CheckoutSteps/__tests__/PaymentStep.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import PaymentStep from '../PaymentStep';

// Create theme
const theme = createTheme();

// Mock cart data
const mockCartData = {
  id: 'cart-123',
  user: 'user-1',
  session_key: 'session-123',
  has_marking: false,
  has_material: true,
  has_tutorial: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockCartItems = [
  { id: 'item-1', product_id: 'prod-1', name: 'Test Product', actual_price: 99.99, quantity: 1 }
];

const mockRefreshCart = jest.fn(() => Promise.resolve());

// Mock useCart
jest.mock('../../../../contexts/CartContext', () => ({
  useCart: () => ({
    cartData: mockCartData,
    cartItems: mockCartItems,
    refreshCart: mockRefreshCart
  })
}));

// Mock rulesEngineService
const mockExecuteRules = jest.fn();
const mockAcknowledgeRule = jest.fn();

jest.mock('../../../../services/rulesEngineService', () => ({
  __esModule: true,
  default: {
    executeRules: (...args) => mockExecuteRules(...args),
    acknowledgeRule: (...args) => mockAcknowledgeRule(...args),
    ENTRY_POINTS: {
      CHECKOUT_PAYMENT: 'checkout_payment'
    }
  }
}));

// Helper to render component
const renderComponent = async (props = {}) => {
  const defaultProps = {
    paymentMethod: '',
    setPaymentMethod: jest.fn(),
    cardNumber: '',
    setCardNumber: jest.fn(),
    cardholderName: '',
    setCardholderName: jest.fn(),
    expiryMonth: '',
    setExpiryMonth: jest.fn(),
    expiryYear: '',
    setExpiryYear: jest.fn(),
    cvv: '',
    setCvv: jest.fn(),
    employerCode: '',
    setEmployerCode: jest.fn(),
    isDevelopment: false,
    isUAT: false,
    acknowledgmentStates: {},
    setAcknowledgmentStates: jest.fn(),
    requiredAcknowledgments: [],
    setRequiredAcknowledgments: jest.fn()
  };

  let result;
  await act(async () => {
    result = render(
      <ThemeProvider theme={theme}>
        <PaymentStep {...defaultProps} {...props} />
      </ThemeProvider>
    );
  });

  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  return result;
};

describe('PaymentStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteRules.mockResolvedValue({ messages: [] });
    mockAcknowledgeRule.mockResolvedValue({ success: true });
  });

  describe('Initial Rendering', () => {
    test('renders step title', async () => {
      await renderComponent();
      expect(screen.getByText('Step 3: Payment')).toBeInTheDocument();
    });

    test('renders payment method options', async () => {
      await renderComponent();
      expect(screen.getByLabelText('Credit/Debit Card')).toBeInTheDocument();
      expect(screen.getByLabelText('Invoice (Corporate accounts only)')).toBeInTheDocument();
    });

    test('does not show card fields initially', async () => {
      await renderComponent();
      expect(screen.queryByText('Card Number')).not.toBeInTheDocument();
    });

    test('does not show employer code field initially', async () => {
      await renderComponent();
      expect(screen.queryByText('Employer Code')).not.toBeInTheDocument();
    });
  });

  describe('Payment Method Selection', () => {
    test('calls setPaymentMethod when card is selected', async () => {
      const setPaymentMethod = jest.fn();
      await renderComponent({ setPaymentMethod });

      const cardOption = screen.getByLabelText('Credit/Debit Card');
      await act(async () => {
        fireEvent.click(cardOption);
      });

      expect(setPaymentMethod).toHaveBeenCalledWith('card');
    });

    test('calls setPaymentMethod when invoice is selected', async () => {
      const setPaymentMethod = jest.fn();
      await renderComponent({ setPaymentMethod });

      const invoiceOption = screen.getByLabelText('Invoice (Corporate accounts only)');
      await act(async () => {
        fireEvent.click(invoiceOption);
      });

      expect(setPaymentMethod).toHaveBeenCalledWith('invoice');
    });
  });

  describe('Card Payment', () => {
    test('shows card fields when card payment is selected', async () => {
      await renderComponent({ paymentMethod: 'card' });

      expect(screen.getByText('Card Number')).toBeInTheDocument();
      expect(screen.getByText('Cardholder Name')).toBeInTheDocument();
      expect(screen.getByText('Expiry Month')).toBeInTheDocument();
      expect(screen.getByText('Expiry Year')).toBeInTheDocument();
      expect(screen.getByText('CVV')).toBeInTheDocument();
    });

    test('updates card number on input', async () => {
      const setCardNumber = jest.fn();
      await renderComponent({ paymentMethod: 'card', setCardNumber });

      const cardNumberInput = screen.getByPlaceholderText('1234 5678 9012 3456');
      await act(async () => {
        fireEvent.change(cardNumberInput, { target: { value: '4111111111111111' } });
      });

      expect(setCardNumber).toHaveBeenCalledWith('4111111111111111');
    });

    test('updates cardholder name on input', async () => {
      const setCardholderName = jest.fn();
      await renderComponent({ paymentMethod: 'card', setCardholderName });

      const nameInput = screen.getByPlaceholderText('John Doe');
      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
      });

      expect(setCardholderName).toHaveBeenCalledWith('Jane Smith');
    });

    test('updates CVV on input', async () => {
      const setCvv = jest.fn();
      await renderComponent({ paymentMethod: 'card', setCvv });

      const cvvInput = screen.getByPlaceholderText('123');
      await act(async () => {
        fireEvent.change(cvvInput, { target: { value: '456' } });
      });

      expect(setCvv).toHaveBeenCalledWith('456');
    });

    test('shows expiry month options', async () => {
      await renderComponent({ paymentMethod: 'card' });

      const monthSelect = screen.getAllByRole('combobox')[0];
      await act(async () => {
        fireEvent.mouseDown(monthSelect);
      });

      // Check for all months
      for (let i = 1; i <= 12; i++) {
        expect(screen.getByText(String(i).padStart(2, '0'))).toBeInTheDocument();
      }
    });
  });

  describe('Invoice Payment', () => {
    test('shows employer code field when invoice is selected', async () => {
      await renderComponent({ paymentMethod: 'invoice' });

      expect(screen.getByText('Employer Code')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your employer code')).toBeInTheDocument();
    });

    test('shows corporate customer note', async () => {
      await renderComponent({ paymentMethod: 'invoice' });

      expect(screen.getByText(/Corporate customers only/)).toBeInTheDocument();
    });

    test('updates employer code on input', async () => {
      const setEmployerCode = jest.fn();
      await renderComponent({ paymentMethod: 'invoice', setEmployerCode });

      const employerInput = screen.getByPlaceholderText('Enter your employer code');
      await act(async () => {
        fireEvent.change(employerInput, { target: { value: 'CORP123' } });
      });

      expect(setEmployerCode).toHaveBeenCalledWith('CORP123');
    });

    test('hides card fields when invoice is selected', async () => {
      await renderComponent({ paymentMethod: 'invoice' });

      expect(screen.queryByText('Card Number')).not.toBeInTheDocument();
      expect(screen.queryByText('CVV')).not.toBeInTheDocument();
    });
  });

  describe('Development Mode Test Cards', () => {
    test('shows test cards in development mode', async () => {
      await renderComponent({ paymentMethod: 'card', isDevelopment: true });

      expect(screen.getByText('Development Mode:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'VISA Test Card' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'VISA Debit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mastercard' })).toBeInTheDocument();
    });

    test('shows test cards in UAT mode', async () => {
      await renderComponent({ paymentMethod: 'card', isUAT: true });

      expect(screen.getByText('UAT Environment:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'VISA Test Card' })).toBeInTheDocument();
    });

    test('does not show test cards in production mode', async () => {
      await renderComponent({ paymentMethod: 'card', isDevelopment: false, isUAT: false });

      expect(screen.queryByText('Development Mode:')).not.toBeInTheDocument();
      expect(screen.queryByText('UAT Environment:')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'VISA Test Card' })).not.toBeInTheDocument();
    });

    test('fills card details when VISA test card is clicked', async () => {
      const setCardNumber = jest.fn();
      const setCvv = jest.fn();
      const setExpiryMonth = jest.fn();
      const setExpiryYear = jest.fn();
      const setCardholderName = jest.fn();

      await renderComponent({
        paymentMethod: 'card',
        isDevelopment: true,
        setCardNumber,
        setCvv,
        setExpiryMonth,
        setExpiryYear,
        setCardholderName
      });

      const visaButton = screen.getByRole('button', { name: 'VISA Test Card' });
      await act(async () => {
        fireEvent.click(visaButton);
      });

      expect(setCardNumber).toHaveBeenCalledWith('4929 0000 0000 6');
      expect(setCvv).toHaveBeenCalledWith('123');
      expect(setExpiryMonth).toHaveBeenCalledWith('12');
      expect(setExpiryYear).toHaveBeenCalledWith('25');
      expect(setCardholderName).toHaveBeenCalledWith('Test User');
    });

    test('fills Mastercard details when clicked', async () => {
      const setCardNumber = jest.fn();
      const setCvv = jest.fn();

      await renderComponent({
        paymentMethod: 'card',
        isDevelopment: true,
        setCardNumber,
        setCvv
      });

      const mastercardButton = screen.getByRole('button', { name: 'Mastercard' });
      await act(async () => {
        fireEvent.click(mastercardButton);
      });

      expect(setCardNumber).toHaveBeenCalledWith('5404 0000 0000 0001');
      expect(setCvv).toHaveBeenCalledWith('123');
    });
  });

  describe('Rules Engine Integration', () => {
    test('executes rules when payment method changes', async () => {
      await renderComponent({ paymentMethod: 'card' });

      await waitFor(() => {
        expect(mockExecuteRules).toHaveBeenCalledWith(
          'checkout_payment',
          expect.objectContaining({
            cart: expect.objectContaining({
              id: 'cart-123'
            }),
            payment: expect.objectContaining({
              method: 'card',
              is_card: true
            })
          })
        );
      });
    });

    test('handles booking fee notification', async () => {
      mockExecuteRules.mockResolvedValueOnce({
        messages: [],
        updates: {
          cart_fees: [{ fee_type: 'tutorial_booking_fee', amount: 10.00 }]
        }
      });

      await renderComponent({ paymentMethod: 'card' });

      await waitFor(() => {
        expect(screen.getByText(/£10 tutorial booking fee has been added/)).toBeInTheDocument();
      });

      expect(mockRefreshCart).toHaveBeenCalled();
    });

    test('handles booking fee removal notification', async () => {
      mockExecuteRules.mockResolvedValueOnce({
        messages: [],
        updates: {
          cart_fees_removed: [{ fee_type: 'tutorial_booking_fee', removed: true }]
        }
      });

      await renderComponent({ paymentMethod: 'card' });

      await waitFor(() => {
        expect(screen.getByText(/Tutorial booking fee has been removed/)).toBeInTheDocument();
      });
    });

    test('handles rules engine error gracefully', async () => {
      mockExecuteRules.mockRejectedValueOnce(new Error('API Error'));

      await renderComponent({ paymentMethod: 'card' });

      expect(screen.getByText('Step 3: Payment')).toBeInTheDocument();
    });
  });

  describe('Acknowledgment Messages', () => {
    test('displays acknowledgment messages from rules', async () => {
      const setAcknowledgmentStates = jest.fn();

      mockExecuteRules.mockResolvedValueOnce({
        messages: [
          {
            type: 'acknowledge',
            display_type: 'inline',
            ack_key: 'ack_tutorial_cc',
            title: 'Credit Card Payment Notice',
            content: 'Test acknowledgment message',
            required: true
          }
        ]
      });

      await renderComponent({
        paymentMethod: 'card',
        setAcknowledgmentStates
      });

      await waitFor(() => {
        expect(screen.getByText('Credit Card Payment Notice')).toBeInTheDocument();
      });
    });

    test('shows required acknowledgment indicator', async () => {
      mockExecuteRules.mockResolvedValueOnce({
        messages: [
          {
            type: 'acknowledge',
            display_type: 'inline',
            ack_key: 'ack_required',
            title: 'Required Notice',
            content: 'Must acknowledge',
            required: true
          }
        ]
      });

      await renderComponent({ paymentMethod: 'card' });

      await waitFor(() => {
        expect(screen.getByText(/This acknowledgment is required to proceed/)).toBeInTheDocument();
      });
    });

    test('handles acknowledgment checkbox change', async () => {
      const setAcknowledgmentStates = jest.fn();

      mockExecuteRules.mockResolvedValueOnce({
        messages: [
          {
            type: 'acknowledge',
            display_type: 'inline',
            ack_key: 'ack_test',
            title: 'Test Notice',
            content: 'Test content',
            template_id: 'template_123'
          }
        ]
      });

      await renderComponent({
        paymentMethod: 'card',
        setAcknowledgmentStates,
        acknowledgmentStates: { ack_test: false }
      });

      await waitFor(() => {
        expect(screen.getByText('Test Notice')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox');
      await act(async () => {
        fireEvent.click(checkbox);
      });

      await waitFor(() => {
        expect(mockAcknowledgeRule).toHaveBeenCalledWith(
          expect.objectContaining({
            ackKey: 'ack_test',
            acknowledged: true,
            entry_point_location: 'checkout_payment'
          })
        );
      });
    });

    test('handles acknowledgment API error gracefully', async () => {
      const setAcknowledgmentStates = jest.fn();

      mockExecuteRules.mockResolvedValueOnce({
        messages: [
          {
            type: 'acknowledge',
            display_type: 'inline',
            ack_key: 'ack_error',
            title: 'Error Test',
            content: 'Test'
          }
        ]
      });

      mockAcknowledgeRule.mockRejectedValueOnce(new Error('API Error'));

      await renderComponent({
        paymentMethod: 'card',
        setAcknowledgmentStates,
        acknowledgmentStates: { ack_error: false }
      });

      await waitFor(() => {
        expect(screen.getByText('Error Test')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox');
      await act(async () => {
        fireEvent.click(checkbox);
      });

      // Should not crash - local state still updated
      expect(setAcknowledgmentStates).toHaveBeenCalled();
    });

    test('updates required acknowledgments from rules', async () => {
      const setRequiredAcknowledgments = jest.fn();

      mockExecuteRules.mockResolvedValueOnce({
        messages: [
          {
            type: 'acknowledge',
            display_type: 'inline',
            ack_key: 'ack_1',
            title: 'Notice 1',
            content: 'Content 1'
          }
        ],
        required_acknowledgments: ['ack_1']
      });

      await renderComponent({
        paymentMethod: 'card',
        setRequiredAcknowledgments
      });

      await waitFor(() => {
        expect(setRequiredAcknowledgments).toHaveBeenCalledWith(['ack_1']);
      });
    });

    test('clears acknowledgments when no messages', async () => {
      const setAcknowledgmentStates = jest.fn();
      const setRequiredAcknowledgments = jest.fn();

      mockExecuteRules.mockResolvedValueOnce({});

      await renderComponent({
        paymentMethod: 'card',
        setAcknowledgmentStates,
        setRequiredAcknowledgments
      });

      await waitFor(() => {
        expect(setAcknowledgmentStates).toHaveBeenCalledWith({});
        expect(setRequiredAcknowledgments).toHaveBeenCalledWith([]);
      });
    });
  });

  describe('Backward Compatibility', () => {
    test('works without acknowledgment props', async () => {
      mockExecuteRules.mockResolvedValueOnce({
        messages: [
          {
            type: 'acknowledge',
            display_type: 'inline',
            ack_key: 'ack_local',
            title: 'Local State Test',
            content: 'Uses local state'
          }
        ]
      });

      await renderComponent({
        paymentMethod: 'card',
        acknowledgmentStates: undefined,
        setAcknowledgmentStates: undefined
      });

      await waitFor(() => {
        expect(screen.getByText('Local State Test')).toBeInTheDocument();
      });

      // Should still render checkbox
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });

  describe('Select Components', () => {
    test('updates expiry month when selected', async () => {
      const setExpiryMonth = jest.fn();
      await renderComponent({ paymentMethod: 'card', setExpiryMonth });

      const monthSelect = screen.getAllByRole('combobox')[0];
      await act(async () => {
        fireEvent.mouseDown(monthSelect);
      });

      const option06 = screen.getByText('06');
      await act(async () => {
        fireEvent.click(option06);
      });

      expect(setExpiryMonth).toHaveBeenCalledWith('06');
    });

    test('updates expiry year when selected', async () => {
      const setExpiryYear = jest.fn();
      await renderComponent({ paymentMethod: 'card', setExpiryYear });

      const yearSelect = screen.getAllByRole('combobox')[1];
      await act(async () => {
        fireEvent.mouseDown(yearSelect);
      });

      const currentYear = String(new Date().getFullYear()).slice(-2);
      const yearOption = screen.getByText(currentYear);
      await act(async () => {
        fireEvent.click(yearOption);
      });

      expect(setExpiryYear).toHaveBeenCalledWith(currentYear);
    });
  });
});
