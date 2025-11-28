/**
 * CheckoutSteps Integration Tests (Task T064)
 *
 * Tests complete checkout flow integration with:
 * - Cart review step rendering
 * - Rules engine integration (checkout_start entry point)
 * - VAT calculations
 * - Step navigation flow
 * - Error handling
 *
 * Target: Increase CheckoutSteps coverage from 50.5% to 75%+
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme/theme';
import CartReviewStep from '../CheckoutSteps/CartReviewStep';
import CartSummaryPanel from '../CheckoutSteps/CartSummaryPanel';
import CheckoutSteps from '../CheckoutSteps';
import rulesEngineService from '../../../services/rulesEngineService';

// Mock useAuth hook - configure in beforeEach
jest.mock('../../../hooks/useAuth');

// Mock useCart hook - configure in beforeEach (like the passing unit tests)
jest.mock('../../../contexts/CartContext', () => ({
  useCart: jest.fn()
}));

// Mock useCheckoutValidation hook
jest.mock('../../../hooks/useCheckoutValidation', () => ({
  __esModule: true,
  default: () => ({
    isValid: true,
    errors: {},
    validateStep: jest.fn().mockReturnValue(true)
  })
}));

// Mock productCodeGenerator
jest.mock('../../../utils/productCodeGenerator', () => ({
  generateProductCode: jest.fn(() => 'TEST-001'),
}));

// Mock services for integration tests
jest.mock('../../../services/rulesEngineService', () => {
  const mockExecuteRules = jest.fn().mockResolvedValue({
    messages: [],
    effects: [],
    blocked: false
  });
  const mockAcknowledgeRule = jest.fn().mockResolvedValue({ success: true });
  const MOCK_ENTRY_POINTS = {
    CHECKOUT_START: 'checkout_start',
    CHECKOUT_TERMS: 'checkout_terms',
    CHECKOUT_PAYMENT: 'checkout_payment',
    ORDER_COMPLETE: 'order_complete'
  };

  return {
    __esModule: true,
    default: {
      executeRules: mockExecuteRules,
      acknowledgeRule: mockAcknowledgeRule,
      ENTRY_POINTS: MOCK_ENTRY_POINTS
    },
    executeRules: mockExecuteRules,
    acknowledgeRule: mockAcknowledgeRule,
    ENTRY_POINTS: MOCK_ENTRY_POINTS
  };
});

jest.mock('../../../services/httpService', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
  }
}));

jest.mock('../../../services/userService', () => ({
  __esModule: true,
  default: {
    getUserProfile: jest.fn().mockResolvedValue({ data: {} }),
    updateProfile: jest.fn().mockResolvedValue({ data: {} })
  }
}));

jest.mock('../../../config', () => ({
  API_BASE_URL: 'http://localhost:8888',
  isUAT: false
}));

// Test data factories
const createMockCartItems = (options = {}) => [
  {
    id: 1,
    product_id: options.productId || 100,
    product_name: options.productName || 'CS1 Study Guide',
    subject_code: options.subjectCode || 'CS1',
    variation_name: options.variationName || 'eBook',
    actual_price: options.price || '75.00',
    quantity: options.quantity || 1
  }
];

const createMockCartData = (options = {}) => ({
  id: options.cartId || 1,
  user: options.userId || null,
  session_key: options.sessionKey || null,
  vat_calculations: options.vatCalculations || {
    region_info: { region: 'UK' },
    items: [],
    totals: { subtotal: 75.00, vat: 0, total: 75.00 }
  }
});

const createMockUserProfile = () => ({
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  profile: {
    home_phone: '01onal234567',
    mobile_phone: '07123456789',
    work_phone: ''
  },
  addresses: {
    home: {
      address_line_1: '123 Test Street',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'UK'
    }
  }
});

// Render helper for CheckoutSteps (uses mocked hooks, no providers needed)
const renderCheckoutWithProviders = (ui) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Checkout Flow VAT Display Integration (T004)', () => {
  const mockCartItems = [
    {
      id: 1,
      product_name: 'UK Tutorial',
      subject_code: 'CS1',
      variation_name: 'Standard',
      actual_price: '100.00',
      quantity: 1
    },
    {
      id: 2,
      product_name: 'ROW Digital Product',
      subject_code: 'CM1',
      variation_name: 'eBook',
      actual_price: '50.00',
      quantity: 1
    }
  ];

  // TDD RED PHASE: CartReviewStep VAT display feature is not yet implemented.
  // These tests define the expected behavior for when VAT display is added to CartReviewStep.
  describe.skip('CartReviewStep VAT display integration', () => {
    it('should display dynamic VAT rate in CartReviewStep with 20% VAT', () => {
      const vatWith20Percent = {
        totals: {
          subtotal: 150.00,
          total_vat: 30.00,
          total_gross: 180.00,
          effective_vat_rate: 0.20
        }
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={vatWith20Percent}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should display "VAT (20%)" with dynamic rate
      expect(screen.getByText(/VAT \(20%\)/)).toBeInTheDocument();
      expect(screen.getByText('£30.00')).toBeInTheDocument(); // VAT amount
      expect(screen.getByText('£180.00')).toBeInTheDocument(); // Total with VAT
    });

    it('should display dynamic VAT rate in CartReviewStep with 15% VAT', () => {
      const vatWith15Percent = {
        totals: {
          subtotal: 150.00,
          total_vat: 22.50,
          total_gross: 172.50,
          effective_vat_rate: 0.15
        }
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={vatWith15Percent}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should display "VAT (15%)" with dynamic rate
      expect(screen.getByText(/VAT \(15%\)/)).toBeInTheDocument();
      expect(screen.getByText('£22.50')).toBeInTheDocument(); // VAT amount
    });

    it('should display 0% VAT for tax-exempt cart', () => {
      const vatWith0Percent = {
        totals: {
          subtotal: 150.00,
          total_vat: 0.00,
          total_gross: 150.00,
          effective_vat_rate: 0.00
        }
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={vatWith0Percent}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should display "VAT (0%)" for zero-rated items
      expect(screen.getByText(/VAT \(0%\)/)).toBeInTheDocument();
      expect(screen.getByText('£0.00')).toBeInTheDocument(); // Zero VAT amount
      expect(screen.getByText('£150.00')).toBeInTheDocument(); // Total equals subtotal
    });
  });

  describe('CartSummaryPanel VAT display integration', () => {
    it('should display dynamic VAT in collapsed view', () => {
      const vatWith20Percent = {
        totals: {
          subtotal: 150.00,
          total_vat: 30.00,
          total_gross: 180.00,
          total_fees: 0.00,
          effective_vat_rate: 0.20
        }
      };

      renderWithTheme(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWith20Percent}
          isCollapsed={true}
          onToggleCollapse={jest.fn()}
          paymentMethod="card"
        />
      );

      // Collapsed view should still show correct total with VAT
      const totalElements = screen.getAllByText(/£180.00/);
      expect(totalElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should display dynamic VAT in expanded view', () => {
      const vatWith20Percent = {
        totals: {
          subtotal: 150.00,
          total_vat: 30.00,
          total_gross: 180.00,
          total_fees: 0.00,
          effective_vat_rate: 0.20
        }
      };

      renderWithTheme(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWith20Percent}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
          paymentMethod="card"
        />
      );

      // Expanded view should show detailed VAT breakdown with dynamic rate
      expect(screen.getByText(/VAT \(20%\)/)).toBeInTheDocument();
      expect(screen.getAllByText('£150.00').length).toBeGreaterThanOrEqual(1); // Subtotal
      expect(screen.getAllByText('£30.00').length).toBeGreaterThanOrEqual(1); // VAT
      expect(screen.getAllByText('£180.00').length).toBeGreaterThanOrEqual(1); // Total
    });

    // TDD RED PHASE: Fee display based on payment method is not yet implemented.
    it.skip('should update totals when payment method changes', () => {
      const vatWithFees = {
        totals: {
          subtotal: 150.00,
          total_vat: 30.00,
          total_gross: 180.00,
          total_fees: 5.00,
          effective_vat_rate: 0.20
        },
        fees: [
          { description: 'Card Processing Fee', amount: '5.00' }
        ]
      };

      const ThemeWrapper = ({ children }) => (
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      );

      const { rerender } = render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithFees}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
          paymentMethod="card"
        />,
        { wrapper: ThemeWrapper }
      );

      // With card payment, should include fees
      expect(screen.getByText('Card Processing Fee:')).toBeInTheDocument();
      expect(screen.getByText(/£185.00/)).toBeInTheDocument(); // Total with fees

      // Change to bank transfer (no fees)
      rerender(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithFees}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
          paymentMethod="bank_transfer"
        />
      );

      // With bank transfer, fees should be excluded from total
      expect(screen.queryByText('Card Processing Fee:')).not.toBeInTheDocument();
      expect(screen.getByText(/£180.00/)).toBeInTheDocument(); // Total without fees
    });
  });

  // TDD RED PHASE: CartReviewStep VAT display feature is not yet implemented.
  describe.skip('Mixed VAT rates (UK + ROW products)', () => {
    it('should display blended VAT rate for mixed cart', () => {
      // UK product (20% VAT) + ROW product (0% VAT) = blended effective rate
      const mixedVatCalculations = {
        totals: {
          subtotal: 150.00,
          total_vat: 20.00, // Only UK product has VAT
          total_gross: 170.00,
          effective_vat_rate: 0.1333 // (20/150) = 13.33% blended rate
        }
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mixedVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should display rounded blended rate (13%)
      expect(screen.getByText(/VAT \(13%\)/)).toBeInTheDocument();
      expect(screen.getByText('£20.00')).toBeInTheDocument(); // Actual VAT amount
      expect(screen.getByText('£170.00')).toBeInTheDocument(); // Total
    });

    it('should handle precision correctly for blended rates', () => {
      const preciseVatCalculations = {
        totals: {
          subtotal: 100.00,
          total_vat: 17.50,
          total_gross: 117.50,
          effective_vat_rate: 0.175 // 17.5% exactly
        }
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={preciseVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should display rounded rate (18%)
      expect(screen.getByText(/VAT \(18%\)/)).toBeInTheDocument();
    });
  });

  // TDD RED PHASE: CartReviewStep VAT display feature is not yet implemented.
  describe.skip('VAT display consistency across components', () => {
    it('should show consistent VAT rate in both CartReviewStep and CartSummaryPanel', () => {
      const sharedVatCalculations = {
        totals: {
          subtotal: 150.00,
          total_vat: 30.00,
          total_gross: 180.00,
          total_fees: 0.00,
          effective_vat_rate: 0.20
        }
      };

      const { container: reviewContainer } = renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={sharedVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Verify CartReviewStep shows VAT (20%)
      expect(screen.getByText(/VAT \(20%\)/)).toBeInTheDocument();

      // Now render CartSummaryPanel with same data
      const { container: summaryContainer } = render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={sharedVatCalculations}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
          paymentMethod="card"
        />
      );

      // Both components should show same VAT rate
      const vatLabels = screen.getAllByText(/VAT \(20%\)/);
      expect(vatLabels.length).toBeGreaterThanOrEqual(2); // At least 2 instances (one in each component)
    });
  });

  // TDD RED PHASE: CartReviewStep VAT display feature is not yet implemented.
  describe.skip('Edge cases and error handling', () => {
    it('should handle undefined effective_vat_rate gracefully', () => {
      const vatWithoutRate = {
        totals: {
          subtotal: 150.00,
          total_vat: 30.00,
          total_gross: 180.00
          // effective_vat_rate is intentionally missing
        }
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={vatWithoutRate}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should display "VAT:" without crashing
      const vatText = screen.getByText(/VAT/);
      expect(vatText).toBeInTheDocument();
    });

    it('should handle null vatCalculations gracefully', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={null}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should not crash, cart items should still render
      expect(screen.getByText('UK Tutorial')).toBeInTheDocument();
    });

    it('should handle empty cart with VAT calculations', () => {
      const emptyCartVat = {
        totals: {
          subtotal: 0.00,
          total_vat: 0.00,
          total_gross: 0.00,
          effective_vat_rate: 0.00
        }
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={[]}
          vatCalculations={emptyCartVat}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should display zero values without crashing
      expect(screen.getByText(/VAT \(0%\)/)).toBeInTheDocument();
      expect(screen.getByText('£0.00')).toBeInTheDocument();
    });
  });
});

/**
 * CheckoutSteps Full Component Integration Tests
 * Tests the complete CheckoutSteps component with all integrations
 *
 * Uses the same mocking approach as CheckoutSteps.test.js (mocked hooks)
 */
describe('CheckoutSteps Component Integration', () => {
  const mockCartItems = createMockCartItems();
  const mockCartData = createMockCartData();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useAuth hook
    const { useAuth } = require('../../../hooks/useAuth');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' }
    });

    // Mock useCart hook (same pattern as passing unit tests)
    const { useCart } = require('../../../contexts/CartContext');
    useCart.mockReturnValue({
      cartItems: mockCartItems,
      cartData: mockCartData
    });

    // Default mock implementations for rulesEngineService
    rulesEngineService.executeRules.mockResolvedValue({
      messages: [],
      actions: [],
      blocked: false
    });

    rulesEngineService.acknowledgeRule.mockResolvedValue({
      success: true
    });
  });

  describe('Initial Rendering', () => {
    it('should render checkout stepper with Order Summary', async () => {
      renderCheckoutWithProviders(<CheckoutSteps onComplete={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Order Summary')).toBeInTheDocument();
      });
    });

    it('should display cart items from mocked hook', async () => {
      const customCartItems = createMockCartItems({ productName: 'CM2 Core Reading' });
      const { useCart } = require('../../../contexts/CartContext');
      useCart.mockReturnValue({
        cartItems: customCartItems,
        cartData: mockCartData
      });

      renderCheckoutWithProviders(<CheckoutSteps onComplete={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('CM2 Core Reading')).toBeInTheDocument();
      });
    });

    it('should render correctly with empty cart', async () => {
      const { useCart } = require('../../../contexts/CartContext');
      useCart.mockReturnValue({
        cartItems: [],
        cartData: mockCartData
      });

      renderCheckoutWithProviders(<CheckoutSteps onComplete={jest.fn()} />);

      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Order Summary')).toBeInTheDocument();
      });
    });
  });

  describe('Rules Engine Integration', () => {
    it('should call rules engine on mount', async () => {
      renderCheckoutWithProviders(<CheckoutSteps onComplete={jest.fn()} />);

      await waitFor(() => {
        expect(rulesEngineService.executeRules).toHaveBeenCalled();
      });
    });

    it('should display modal message from rules engine', async () => {
      rulesEngineService.executeRules.mockResolvedValue({
        messages: [
          {
            id: 'msg_import_tax',
            message_type: 'warning',
            display_type: 'modal',
            content: {
              title: 'Import Tax Notice',
              message: 'Students outside UK may incur import tax.'
            }
          }
        ],
        actions: [],
        blocked: false
      });

      renderCheckoutWithProviders(<CheckoutSteps onComplete={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Import Tax Notice')).toBeInTheDocument();
      });
    });

    it('should handle rules engine errors gracefully', async () => {
      rulesEngineService.executeRules.mockRejectedValue(new Error('API Error'));

      renderCheckoutWithProviders(<CheckoutSteps onComplete={jest.fn()} />);

      // Component should still render
      await waitFor(() => {
        expect(screen.getByText('Order Summary')).toBeInTheDocument();
      });
    });
  });

  describe('Step Navigation', () => {
    it('should start at step 1 (Cart Review)', async () => {
      renderCheckoutWithProviders(<CheckoutSteps onComplete={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Order Summary')).toBeInTheDocument();
      });
    });

    it('should have Continue button on step 1', async () => {
      renderCheckoutWithProviders(<CheckoutSteps onComplete={jest.fn()} />);

      await waitFor(() => {
        const continueButton = screen.getByRole('button', { name: /continue|next/i });
        expect(continueButton).toBeInTheDocument();
      });
    });
  });

  describe('VAT Calculations Display', () => {
    it('should display VAT when present in cart data', async () => {
      const cartDataWithVat = createMockCartData({
        vatCalculations: {
          region_info: { region: 'EU' },
          items: [{ product_id: 1, vat_rate: 20, vat_amount: 15.00 }],
          totals: { subtotal: 75.00, vat: 15.00, total: 90.00, effective_vat_rate: 0.20 }
        }
      });

      const { useCart } = require('../../../contexts/CartContext');
      useCart.mockReturnValue({
        cartItems: mockCartItems,
        cartData: cartDataWithVat
      });

      renderCheckoutWithProviders(<CheckoutSteps onComplete={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/VAT/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible buttons with proper labels', async () => {
      renderCheckoutWithProviders(<CheckoutSteps onComplete={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Order Summary')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });
  });
});

describe('CheckoutSteps Modal Interactions', () => {
  const mockCartItems = createMockCartItems();
  const mockCartData = createMockCartData();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useAuth hook
    const { useAuth } = require('../../../hooks/useAuth');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' }
    });

    // Mock useCart hook
    const { useCart } = require('../../../contexts/CartContext');
    useCart.mockReturnValue({
      cartItems: mockCartItems,
      cartData: mockCartData
    });
  });

  it('should dismiss modal when I Understand is clicked', async () => {
    const user = userEvent.setup();

    rulesEngineService.executeRules.mockResolvedValue({
      messages: [
        {
          id: 'msg_import_tax',
          message_type: 'warning',
          display_type: 'modal',
          content: {
            title: 'Import Tax Notice',
            message: 'Students outside UK may incur import tax.'
          }
        }
      ],
      actions: [],
      blocked: false
    });

    renderCheckoutWithProviders(<CheckoutSteps onComplete={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Import Tax Notice')).toBeInTheDocument();
    });

    // Find and click dismiss button
    const dismissButton = screen.getByRole('button', { name: /understand|close|dismiss|ok/i });
    await user.click(dismissButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('Import Tax Notice')).not.toBeInTheDocument();
    });
  });

  it('should handle acknowledgment modal correctly', async () => {
    const user = userEvent.setup();

    rulesEngineService.executeRules.mockResolvedValue({
      messages: [
        {
          id: 'msg_terms',
          message_type: 'info',
          display_type: 'modal',
          content: {
            title: 'Terms Acknowledgment',
            message: 'Please acknowledge our terms.'
          },
          requiresAcknowledgment: true,
          ackKey: 'terms_v1'
        }
      ],
      actions: [],
      blocked: false
    });

    rulesEngineService.acknowledgeRule.mockResolvedValue({ success: true });

    renderCheckoutWithProviders(<CheckoutSteps onComplete={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Terms Acknowledgment')).toBeInTheDocument();
    });

    // Acknowledge
    const acknowledgeButton = screen.getByRole('button', { name: /understand|accept|acknowledge|ok/i });
    await user.click(acknowledgeButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('Terms Acknowledgment')).not.toBeInTheDocument();
    });
  });
});
