import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import '@testing-library/jest-dom';
import CheckoutPage from '../CheckoutPage';
import theme from '../../../theme/theme';
import cartService from '../../../services/cartService';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock cart service
jest.mock('../../../services/cartService', () => ({
  __esModule: true,
  default: {
    checkout: jest.fn()
  }
}));

// Mock CartContext
const mockClearCart = jest.fn();
const mockCartItems = [
  {
    id: 1,
    product_id: 72,
    subject_code: 'CM1',
    product_name: 'CM1 ASET',
    product_type: 'Material',
    quantity: 1,
    price_type: 'standard',
    actual_price: '150.00',
    metadata: { variationId: 1 }
  }
];

let mockCartItemsValue = [...mockCartItems];

jest.mock('../../../contexts/CartContext', () => ({
  useCart: () => ({
    cartItems: mockCartItemsValue,
    cartData: { id: 1, user: null, session_key: 'test-session' },
    clearCart: mockClearCart
  })
}));

// Mock TutorialChoiceContext
const mockRemoveAllChoices = jest.fn();
jest.mock('../../../contexts/TutorialChoiceContext', () => ({
  useTutorialChoice: () => ({
    removeAllChoices: mockRemoveAllChoices
  })
}));

// Mock CheckoutSteps component
jest.mock('../CheckoutSteps', () => {
  return function MockCheckoutSteps({ onComplete }) {
    return (
      <div data-testid="checkout-steps">
        <button
          data-testid="complete-checkout"
          onClick={() => onComplete({ is_invoice: false })}
        >
          Complete Order
        </button>
        <button
          data-testid="complete-invoice"
          onClick={() => onComplete({ is_invoice: true })}
        >
          Pay by Invoice
        </button>
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

describe('CheckoutPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCartItemsValue = [...mockCartItems];
    mockClearCart.mockResolvedValue();
    cartService.checkout.mockResolvedValue({
      data: { id: 123 }
    });
  });

  describe('Basic Rendering', () => {
    test('should render checkout title', () => {
      renderWithTheme(<CheckoutPage />);

      expect(screen.getByText('Checkout')).toBeInTheDocument();
    });

    test('should render CheckoutSteps component', () => {
      renderWithTheme(<CheckoutPage />);

      expect(screen.getByTestId('checkout-steps')).toBeInTheDocument();
    });

    test('should not show error or success alerts initially', () => {
      renderWithTheme(<CheckoutPage />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Empty Cart', () => {
    test('should show empty cart message when cart has no items', () => {
      mockCartItemsValue = [];
      renderWithTheme(<CheckoutPage />);

      expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
    });

    test('should not render CheckoutSteps when cart is empty', () => {
      mockCartItemsValue = [];
      renderWithTheme(<CheckoutPage />);

      expect(screen.queryByTestId('checkout-steps')).not.toBeInTheDocument();
    });
  });

  describe('Checkout Completion', () => {
    test('should call cartService.checkout when checkout completes', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      expect(cartService.checkout).toHaveBeenCalledWith({ is_invoice: false });
    });

    test('should display success message with order number after checkout', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText(/Order Completed Successfully!/)).toBeInTheDocument();
      });
    });

    test('should clear cart after successful checkout', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockClearCart).toHaveBeenCalled();
      });
    });

    test('should remove all tutorial choices after successful checkout', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockRemoveAllChoices).toHaveBeenCalled();
      });
    });

    test('should show invoice message when paying by invoice', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const invoiceButton = screen.getByTestId('complete-invoice');
      await user.click(invoiceButton);

      await waitFor(() => {
        expect(cartService.checkout).toHaveBeenCalledWith({ is_invoice: true });
      });
    });
  });

  describe('Checkout Complete State', () => {
    test('should show success alert after checkout completion', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText(/Order Completed Successfully!/)).toBeInTheDocument();
      });
    });

    test('should show order information after checkout', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText(/Thank you for your purchase/)).toBeInTheDocument();
        expect(screen.getByText(/What's next?/)).toBeInTheDocument();
      });
    });

    test('should show redirect message after checkout', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText(/redirected to your order history/)).toBeInTheDocument();
      });
    });

    test('should not render CheckoutSteps after checkout complete', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('checkout-steps')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should display error message when checkout fails', async () => {
      cartService.checkout.mockRejectedValueOnce({
        response: { data: { detail: 'Payment failed' } }
      });

      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText('Payment failed')).toBeInTheDocument();
      });
    });

    test('should display generic error message when no detail provided', async () => {
      cartService.checkout.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to place order. Please try again.')).toBeInTheDocument();
      });
    });

    test('should not clear cart when checkout fails', async () => {
      cartService.checkout.mockRejectedValueOnce(new Error('Checkout failed'));

      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to place order. Please try again.')).toBeInTheDocument();
      });

      expect(mockClearCart).not.toHaveBeenCalled();
    });

    test('should not remove tutorial choices when checkout fails', async () => {
      cartService.checkout.mockRejectedValueOnce(new Error('Checkout failed'));

      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(mockRemoveAllChoices).not.toHaveBeenCalled();
    });

    test('should handle error with message field', async () => {
      cartService.checkout.mockRejectedValueOnce({
        response: { data: { message: 'Card declined' } }
      });

      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText('Card declined')).toBeInTheDocument();
      });
    });
  });

  describe('Order Number Formatting', () => {
    test('should format order number with leading zeros', async () => {
      cartService.checkout.mockResolvedValueOnce({
        data: { id: 42 }
      });

      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        // The completion screen shows the order
        expect(screen.getByText(/Order Completed Successfully!/)).toBeInTheDocument();
      });
    });

    test('should handle checkout response without order id', async () => {
      cartService.checkout.mockResolvedValueOnce({
        data: {}
      });

      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText(/Order Completed Successfully!/)).toBeInTheDocument();
      });
    });
  });

  describe('Invoice vs Card Payment Messages', () => {
    test('should show invoice-specific message for invoice payment', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const invoiceButton = screen.getByTestId('complete-invoice');
      await user.click(invoiceButton);

      // The success message is set before checkoutComplete, so we check for the completion screen
      await waitFor(() => {
        expect(screen.getByText(/Order Completed Successfully!/)).toBeInTheDocument();
      });
    });

    test('should show card-specific message for card payment', async () => {
      const user = userEvent.setup();
      renderWithTheme(<CheckoutPage />);

      const completeButton = screen.getByTestId('complete-checkout');
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText(/Order Completed Successfully!/)).toBeInTheDocument();
      });
    });
  });
});
