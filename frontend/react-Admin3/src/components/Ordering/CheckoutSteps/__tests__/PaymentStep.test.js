import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PaymentStep from '../PaymentStep';

// Mock the CartContext
jest.mock('../../../../contexts/CartContext', () => ({
  useCart: () => ({
    cartData: { id: 1, items: [], total: 0 },
    cartItems: [],
    refreshCart: jest.fn()
  })
}));

// Mock the rulesEngineService
jest.mock('../../../../services/rulesEngineService', () => ({
  __esModule: true,
  default: {
    executeRules: jest.fn(() => Promise.resolve({ messages: [] })),
    acknowledgeRule: jest.fn(() => Promise.resolve({ success: true })),
    ENTRY_POINTS: {
      CHECKOUT_PAYMENT: 'checkout_payment'
    }
  }
}));

// Helper to render component
const renderPaymentStep = (props = {}) => {
  return render(<PaymentStep {...props} />);
};

describe('PaymentStep - Test Card Visibility', () => {
  const defaultProps = {
    paymentMethod: 'card',
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
    acknowledgmentStates: {},
    setAcknowledgmentStates: jest.fn(),
    requiredAcknowledgments: [],
    setRequiredAcknowledgments: jest.fn()
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Production Environment', () => {
    it('should NOT show test cards in production (isDevelopment=false, isUAT=false)', () => {
      renderPaymentStep({ ...defaultProps, isDevelopment: false, isUAT: false });

      // Test cards should NOT be visible
      expect(screen.queryByText(/VISA Test Card/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Development Mode/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/UAT Environment/i)).not.toBeInTheDocument();
    });
  });

  describe('Development Environment', () => {
    it('should show test cards with "Development Mode" message in development (isDevelopment=true)', () => {
      renderPaymentStep({ ...defaultProps, isDevelopment: true, isUAT: false });

      // Test cards should be visible
      expect(screen.getByText(/Development Mode/i)).toBeInTheDocument();
      expect(screen.getByText(/Use test cards below/i)).toBeInTheDocument();

      // Verify test card buttons are present
      expect(screen.getByRole('button', { name: /VISA Test Card/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /VISA Debit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mastercard/i })).toBeInTheDocument();
    });

    it('should NOT show UAT message in development environment', () => {
      renderPaymentStep({ ...defaultProps, isDevelopment: true, isUAT: false });

      expect(screen.queryByText(/UAT Environment/i)).not.toBeInTheDocument();
    });

    it('should populate card fields when test card button clicked', () => {
      const setCardNumber = jest.fn();
      const setCvv = jest.fn();
      const setExpiryMonth = jest.fn();
      const setExpiryYear = jest.fn();
      const setCardholderName = jest.fn();

      renderPaymentStep({
        ...defaultProps,
        isDevelopment: true,
        isUAT: false,
        setCardNumber,
        setCvv,
        setExpiryMonth,
        setExpiryYear,
        setCardholderName
      });

      // Click VISA Test Card button
      const visaButton = screen.getByRole('button', { name: /VISA Test Card/i });
      fireEvent.click(visaButton);

      // Verify card fields were populated
      expect(setCardNumber).toHaveBeenCalledWith('4929 0000 0000 6');
      expect(setCvv).toHaveBeenCalledWith('123');
      expect(setExpiryMonth).toHaveBeenCalledWith('12');
      expect(setExpiryYear).toHaveBeenCalledWith('25');
      expect(setCardholderName).toHaveBeenCalledWith('Test User');
    });
  });

  describe('UAT Environment', () => {
    it('should show test cards with "UAT Environment" message in UAT (isUAT=true)', () => {
      renderPaymentStep({ ...defaultProps, isDevelopment: false, isUAT: true });

      // Test cards should be visible
      expect(screen.getByText(/UAT Environment/i)).toBeInTheDocument();
      expect(screen.getByText(/Use test cards below/i)).toBeInTheDocument();

      // Verify test card buttons are present
      expect(screen.getByRole('button', { name: /VISA Test Card/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /VISA Debit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mastercard/i })).toBeInTheDocument();
    });

    it('should NOT show Development Mode message in UAT environment', () => {
      renderPaymentStep({ ...defaultProps, isDevelopment: false, isUAT: true });

      expect(screen.queryByText(/Development Mode/i)).not.toBeInTheDocument();
    });

    it('should populate card fields when test card button clicked in UAT', () => {
      const setCardNumber = jest.fn();
      const setCvv = jest.fn();
      const setExpiryMonth = jest.fn();
      const setExpiryYear = jest.fn();
      const setCardholderName = jest.fn();

      renderPaymentStep({
        ...defaultProps,
        isDevelopment: false,
        isUAT: true,
        setCardNumber,
        setCvv,
        setExpiryMonth,
        setExpiryYear,
        setCardholderName
      });

      // Click Mastercard button
      const mastercardButton = screen.getByRole('button', { name: /Mastercard/i });
      fireEvent.click(mastercardButton);

      // Verify card fields were populated
      expect(setCardNumber).toHaveBeenCalledWith('5404 0000 0000 0001');
      expect(setCvv).toHaveBeenCalledWith('123');
      expect(setExpiryMonth).toHaveBeenCalledWith('12');
      expect(setExpiryYear).toHaveBeenCalledWith('25');
      expect(setCardholderName).toHaveBeenCalledWith('Test User');
    });
  });

  describe('Both Development and UAT (edge case)', () => {
    it('should prioritize Development Mode message when both isDevelopment and isUAT are true', () => {
      renderPaymentStep({ ...defaultProps, isDevelopment: true, isUAT: true });

      // Development Mode should take precedence
      expect(screen.getByText(/Development Mode/i)).toBeInTheDocument();
      expect(screen.queryByText(/UAT Environment/i)).not.toBeInTheDocument();
    });
  });
});

describe('PaymentStep - Payment Method Selection', () => {
  const defaultProps = {
    paymentMethod: 'card',
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

  it('should render card payment fields when payment method is card', () => {
    renderPaymentStep({ ...defaultProps, paymentMethod: 'card' });

    expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('123')).toBeInTheDocument();
  });

  it('should render invoice fields when payment method is invoice', () => {
    renderPaymentStep({ ...defaultProps, paymentMethod: 'invoice' });

    expect(screen.getByPlaceholderText(/Enter your employer code/i)).toBeInTheDocument();
  });

  it('should switch between payment methods', () => {
    const setPaymentMethod = jest.fn();
    renderPaymentStep({ ...defaultProps, setPaymentMethod });

    const invoiceRadio = screen.getByLabelText(/Invoice \(Corporate accounts only\)/i);
    fireEvent.click(invoiceRadio);

    expect(setPaymentMethod).toHaveBeenCalledWith('invoice');
  });
});
