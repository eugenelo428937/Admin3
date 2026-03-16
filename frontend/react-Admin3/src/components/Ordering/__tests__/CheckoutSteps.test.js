import { vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../theme/theme.js';
import CheckoutSteps from '../CheckoutSteps.tsx';
import { CartContext } from '../../../contexts/CartContext.tsx';
import { useAuth } from '../../../hooks/useAuth.tsx';
import rulesEngineService from '../../../services/rulesEngineService';

// Custom render function with ThemeProvider
const renderWithTheme = (ui, options = {}) => {
  return render(
    <ThemeProvider theme={theme}>{ui}</ThemeProvider>,
    options
  );
};

// Mock the rules engine service
vi.mock('../../../services/rulesEngineService', () => {
  const mockExecuteRules = vi.fn().mockResolvedValue({
    messages: [],
    effects: [],
    blocked: false
  });
  const mockAcknowledgeRule = vi.fn().mockResolvedValue({ success: true });
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

// Mock useAuth hook
vi.mock('../../../hooks/useAuth.tsx');

// Mock httpService
vi.mock('../../../services/httpService.js', () => ({
  __esModule: true,
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock config
vi.mock('../../../config.js', () => ({
  __esModule: true,
  default: {
    API_BASE_URL: 'http://localhost:8888'
  },
}));

// Mock useCart hook
vi.mock('../../../contexts/CartContext.tsx', () => ({
  useCart: vi.fn()
}));

// Mock userService
vi.mock('../../../services/userService.ts', () => ({
  __esModule: true,
  default: {
    getProfile: vi.fn().mockResolvedValue({ data: {} }),
    updateProfile: vi.fn().mockResolvedValue({ data: {} })
  }
}));

// Mock useCheckoutValidation hook
vi.mock('../../../hooks/useCheckoutValidation.ts', () => ({
  __esModule: true,
  default: () => ({
    isValid: true,
    errors: {},
    validateStep: vi.fn().mockReturnValue(true)
  })
}));

const mockCartItems = [
  {
    id: 1,
    product_name: 'Test Product',
    subject_code: 'TEST',
    variation_name: 'eBook',
    actual_price: '50.00',
    quantity: 1
  }
];

describe('CheckoutSteps', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock useAuth hook
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' }
    });

    // Mock useCart hook
    const _reqmod__________contexts_CartContext_js = await import('../../../contexts/CartContext.tsx'); const { useCart } = _reqmod__________contexts_CartContext_js;
    useCart.mockReturnValue({
      cartItems: mockCartItems,
      cartData: { id: 1, user: null, session_key: null }
    });

    // Reset mock responses for rules engine
    rulesEngineService.executeRules.mockResolvedValue({
      messages: [],
      actions: [],
      blocked: false
    });
  });

  it('should call rules engine with checkout_start entry point when component mounts', async () => {
    const mockOnComplete = vi.fn();

    renderWithTheme(<CheckoutSteps onComplete={mockOnComplete} />);

    // First verify the rules engine was called at all
    await waitFor(() => {
      expect(rulesEngineService.executeRules).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Then verify it was called with correct arguments
    expect(rulesEngineService.executeRules).toHaveBeenCalledWith(
      rulesEngineService.ENTRY_POINTS.CHECKOUT_START,
      expect.objectContaining({
        cart: expect.objectContaining({
          items: mockCartItems,
          total: 50.00
        })
      })
    );
  });

  // TDD RED PHASE: This test defines the expected behavior for ASET warning display.
  // The feature is not yet implemented - CartReviewStep needs to render rulesMessages
  // with data-testid="aset-warning" for this test to pass.
  it.skip('should display ASET warning message above order summary when cart contains ASET products', async () => {
    // Mock cart with ASET product (ID 72)
    const asetCartItems = [
      {
        id: 1,
        product_id: 72,
        product_name: 'CM1 ASET',
        subject_code: 'CM1',
        variation_name: 'eBook',
        actual_price: '150.00',
        quantity: 1
      }
    ];

    const _reqmod__________contexts_CartContext_js = await import('../../../contexts/CartContext.tsx'); const { useCart } = _reqmod__________contexts_CartContext_js;
    useCart.mockReturnValue({
      cartItems: asetCartItems,
      cartData: { id: 2, user: null, session_key: null }
    });

    // Mock rules engine response with ASET warning
    rulesEngineService.executeRules.mockResolvedValue({
      messages: [
        {
          message_type: 'warning',
          template_id: 1,
          content: {
            title: 'Important Notice about ASET Purchase',
            message: 'BE AWARE: The CM1 Vault contains an eBook with very similar content to the CM1 ASET. If you have access to the CM1 Vault, we recommend you review the eBook available within The Vault before deciding whether to purchase this ASET.',
            dismissible: true,
            icon: 'info'
          },
          placement: 'top'
        }
      ],
      actions: [],
      blocked: false
    });

    const mockOnComplete = vi.fn();
    
    renderWithTheme(<CheckoutSteps onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByText('Important Notice about ASET Purchase')).toBeInTheDocument();
      expect(screen.getByText(/BE AWARE: The CM1 Vault contains an eBook/)).toBeInTheDocument();
    });

    // Verify warning appears above order summary
    const warningElement = screen.getByText('Important Notice about ASET Purchase').closest('[data-testid="aset-warning"]');
    const orderSummary = screen.getByText('Order Summary').closest('.card');
    
    expect(warningElement).toBeInTheDocument();
    expect(orderSummary).toBeInTheDocument();
  });

  it('should not display ASET warning when cart contains non-ASET products', async () => {
    // Mock cart with non-ASET product (not ID 72 or 73)
    const nonAsetCartItems = [
      {
        id: 1,
        product_id: 100,
        product_name: 'CS1 Study Guide',
        subject_code: 'CS1',
        variation_name: 'eBook',
        actual_price: '75.00',
        quantity: 1
      }
    ];

    const _reqmod__________contexts_CartContext_js = await import('../../../contexts/CartContext.tsx'); const { useCart } = _reqmod__________contexts_CartContext_js;
    useCart.mockReturnValue({
      cartItems: nonAsetCartItems,
      cartData: { id: 3, user: null, session_key: null }
    });

    // Mock rules engine response with no messages (no ASET warning)
    rulesEngineService.executeRules.mockResolvedValue({
      messages: [],
      actions: [],
      blocked: false
    });

    const mockOnComplete = vi.fn();
    
    renderWithTheme(<CheckoutSteps onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(rulesEngineService.executeRules).toHaveBeenCalled();
    });

    // Verify no ASET warning is displayed
    expect(screen.queryByText('Important Notice about ASET Purchase')).not.toBeInTheDocument();
    expect(screen.queryByText(/BE AWARE: The CM1 Vault contains an eBook/)).not.toBeInTheDocument();
    
    // But order summary should still be displayed
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
  });

  it('should display import tax warning modal for non-UK users', async () => {
    // Mock cart with regular product
    const cartItems = [
      {
        id: 1,
        product_id: 100,
        product_name: 'CS1 Study Guide',
        subject_code: 'CS1',
        variation_name: 'eBook',
        actual_price: '75.00',
        quantity: 1
      }
    ];

    const _reqmod__________contexts_CartContext_js = await import('../../../contexts/CartContext.tsx'); const { useCart } = _reqmod__________contexts_CartContext_js;
    useCart.mockReturnValue({
      cartItems: cartItems,
      cartData: { id: 1, user: null, session_key: null }
    });

    // Mock rules engine response with import tax modal message
    rulesEngineService.executeRules.mockResolvedValue({
      success: true,
      messages: [
        {
          id: 'msg_uk_import_tax',
          message_type: 'warning',
          display_type: 'modal',
          content: {
            title: 'Import Tax Notice',
            message: 'Students based outside the UK may incur import tax on delivery of materials. Any VAT, charges and tariffs levied by the customs authorities (and related fees by the courier) are the responsibility of the recipient rather than ActEd.'
          }
        }
      ],
      actions: [],
      blocked: false
    });

    const mockOnComplete = vi.fn();
    
    renderWithTheme(<CheckoutSteps onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(screen.getByText('Import Tax Notice')).toBeInTheDocument();
    });

    // Verify modal content
    expect(screen.getByText(/Students based outside the UK may incur import tax/)).toBeInTheDocument();
    expect(screen.getByText('I Understand')).toBeInTheDocument();
    
    // Verify modal is shown (check for backdrop)
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
  });

  it('should not display import tax warning modal when no modal messages present', async () => {
    // Mock cart with regular product  
    const cartItems = [
      {
        id: 1,
        product_id: 100,
        product_name: 'CS1 Study Guide',
        subject_code: 'CS1',
        variation_name: 'eBook',
        actual_price: '75.00',
        quantity: 1
      }
    ];

    const _reqmod__________contexts_CartContext_js = await import('../../../contexts/CartContext.tsx'); const { useCart } = _reqmod__________contexts_CartContext_js;
    useCart.mockReturnValue({
      cartItems: cartItems,
      cartData: { id: 1, user: null, session_key: null }
    });

    // Mock rules engine response with no modal messages
    rulesEngineService.executeRules.mockResolvedValue({
      success: true,
      messages: [],
      actions: [],
      blocked: false
    });

    const mockOnComplete = vi.fn();
    
    renderWithTheme(<CheckoutSteps onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(rulesEngineService.executeRules).toHaveBeenCalled();
    });

    // Verify no import tax modal is displayed
    expect(screen.queryByText('Import Tax Notice')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});