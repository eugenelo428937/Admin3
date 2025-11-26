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

describe('PaymentStep - Card Input Interactions (T057)', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Card Number Input', () => {
    it('should call setCardNumber when card number is entered', () => {
      const setCardNumber = jest.fn();
      renderPaymentStep({ ...defaultProps, setCardNumber });

      const cardInput = screen.getByPlaceholderText('1234 5678 9012 3456');
      fireEvent.change(cardInput, { target: { value: '4929000000006' } });

      expect(setCardNumber).toHaveBeenCalledWith('4929000000006');
    });

    it('should display pre-filled card number', () => {
      renderPaymentStep({ ...defaultProps, cardNumber: '4929 0000 0000 6' });

      const cardInput = screen.getByPlaceholderText('1234 5678 9012 3456');
      expect(cardInput).toHaveValue('4929 0000 0000 6');
    });
  });

  describe('Cardholder Name Input', () => {
    it('should call setCardholderName when name is entered', () => {
      const setCardholderName = jest.fn();
      renderPaymentStep({ ...defaultProps, setCardholderName });

      const nameInput = screen.getByPlaceholderText('John Doe');
      fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });

      expect(setCardholderName).toHaveBeenCalledWith('Jane Smith');
    });

    it('should display pre-filled cardholder name', () => {
      renderPaymentStep({ ...defaultProps, cardholderName: 'Test User' });

      const nameInput = screen.getByPlaceholderText('John Doe');
      expect(nameInput).toHaveValue('Test User');
    });
  });

  describe('CVV Input', () => {
    it('should call setCvv when CVV is entered', () => {
      const setCvv = jest.fn();
      renderPaymentStep({ ...defaultProps, setCvv });

      const cvvInput = screen.getByPlaceholderText('123');
      fireEvent.change(cvvInput, { target: { value: '456' } });

      expect(setCvv).toHaveBeenCalledWith('456');
    });

    it('should display pre-filled CVV', () => {
      renderPaymentStep({ ...defaultProps, cvv: '789' });

      const cvvInput = screen.getByPlaceholderText('123');
      expect(cvvInput).toHaveValue('789');
    });
  });

  describe('Expiry Month Selection', () => {
    it('should call setExpiryMonth when month is selected', () => {
      const setExpiryMonth = jest.fn();
      renderPaymentStep({ ...defaultProps, setExpiryMonth });

      // Find the month select by its role (MUI Select renders as combobox)
      const monthSelects = screen.getAllByRole('combobox');
      // The first combobox should be expiry month
      fireEvent.mouseDown(monthSelects[0]);

      // Select month 06
      const option = screen.getByRole('option', { name: '06' });
      fireEvent.click(option);

      expect(setExpiryMonth).toHaveBeenCalledWith('06');
    });

    it('should display selected expiry month', () => {
      renderPaymentStep({ ...defaultProps, expiryMonth: '12' });

      // The selected value should be displayed
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  describe('Expiry Year Selection', () => {
    it('should call setExpiryYear when year is selected', () => {
      const setExpiryYear = jest.fn();
      renderPaymentStep({ ...defaultProps, setExpiryYear });

      // Find all comboboxes - second one should be expiry year
      const yearSelects = screen.getAllByRole('combobox');
      fireEvent.mouseDown(yearSelects[1]);

      // Get current year + 1 as two digits for the option
      const nextYear = String(new Date().getFullYear() + 1).slice(-2);
      const option = screen.getByRole('option', { name: nextYear });
      fireEvent.click(option);

      expect(setExpiryYear).toHaveBeenCalledWith(nextYear);
    });

    it('should display selected expiry year', () => {
      renderPaymentStep({ ...defaultProps, expiryYear: '25' });

      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });
});

describe('PaymentStep - Invalid Payment Data (T045)', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles invalid card number format gracefully', () => {
    expect(() => {
      renderPaymentStep({
        ...defaultProps,
        cardNumber: 'invalid-card-number-not-numeric'
      });
    }).not.toThrow();
  });

  it('handles card number with special characters', () => {
    expect(() => {
      renderPaymentStep({
        ...defaultProps,
        cardNumber: '4929!@#$%^&*()0000'
      });
    }).not.toThrow();
  });

  it('handles extremely long card number', () => {
    const longCardNumber = '4929'.repeat(20); // 80 digits

    expect(() => {
      renderPaymentStep({
        ...defaultProps,
        cardNumber: longCardNumber
      });
    }).not.toThrow();
  });

  it('handles CVV with non-numeric characters', () => {
    expect(() => {
      renderPaymentStep({
        ...defaultProps,
        cvv: 'abc'
      });
    }).not.toThrow();
  });

  it('handles empty CVV value', () => {
    expect(() => {
      renderPaymentStep({
        ...defaultProps,
        cvv: ''
      });
    }).not.toThrow();
  });

  it('handles invalid expiry month', () => {
    expect(() => {
      renderPaymentStep({
        ...defaultProps,
        expiryMonth: '13' // Invalid month
      });
    }).not.toThrow();
  });

  it('handles past expiry year', () => {
    expect(() => {
      renderPaymentStep({
        ...defaultProps,
        expiryYear: '20' // Past year
      });
    }).not.toThrow();
  });

  it('handles cardholder name with special characters', () => {
    expect(() => {
      renderPaymentStep({
        ...defaultProps,
        cardholderName: '<script>alert("xss")</script>'
      });
    }).not.toThrow();

    // Should still display the input (sanitized)
    const nameInput = screen.getByPlaceholderText('John Doe');
    expect(nameInput).toBeInTheDocument();
  });

  it('handles null values in card fields', () => {
    expect(() => {
      renderPaymentStep({
        ...defaultProps,
        cardNumber: null,
        cardholderName: null,
        cvv: null,
        expiryMonth: null,
        expiryYear: null
      });
    }).not.toThrow();
  });

  it('handles undefined values in card fields', () => {
    const propsWithUndefined = { ...defaultProps };
    delete propsWithUndefined.cardNumber;
    delete propsWithUndefined.cardholderName;
    delete propsWithUndefined.cvv;

    expect(() => {
      renderPaymentStep(propsWithUndefined);
    }).not.toThrow();
  });
});

describe('PaymentStep - Invoice Payment Interactions', () => {
  const defaultProps = {
    paymentMethod: 'invoice',
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call setEmployerCode when employer code is entered', () => {
    const setEmployerCode = jest.fn();
    renderPaymentStep({ ...defaultProps, setEmployerCode });

    const codeInput = screen.getByPlaceholderText(/Enter your employer code/i);
    fireEvent.change(codeInput, { target: { value: 'ACME123' } });

    expect(setEmployerCode).toHaveBeenCalledWith('ACME123');
  });

  it('should display pre-filled employer code', () => {
    renderPaymentStep({ ...defaultProps, employerCode: 'CORP456' });

    const codeInput = screen.getByPlaceholderText(/Enter your employer code/i);
    expect(codeInput).toHaveValue('CORP456');
  });

  it('should not show card fields when invoice is selected', () => {
    renderPaymentStep({ ...defaultProps });

    expect(screen.queryByPlaceholderText('1234 5678 9012 3456')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('John Doe')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('123')).not.toBeInTheDocument();
  });

  it('should display corporate customer notice', () => {
    renderPaymentStep({ ...defaultProps });

    expect(screen.getByText(/Corporate customers only/i)).toBeInTheDocument();
    expect(screen.getByText(/Please contact us if you don't have an employer code/i)).toBeInTheDocument();
  });
});
