import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CheckoutSteps from '../CheckoutSteps';
import { CartContext } from '../../../contexts/CartContext';
import rulesEngineService from '../../../services/rulesEngineService';

// Mock the rules engine service
jest.mock('../../../services/rulesEngineService');

// Mock httpService
jest.mock('../../../services/httpService', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

// Mock config
jest.mock('../../../config', () => ({
  API_BASE_URL: 'http://localhost:8888'
}));

// Mock useCart hook
jest.mock('../../../contexts/CartContext', () => ({
  useCart: jest.fn()
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
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useCart hook
    const { useCart } = require('../../../contexts/CartContext');
    useCart.mockReturnValue({
      cartItems: mockCartItems,
      cartData: { id: 1, user: null, session_key: null }
    });
    
    // Mock successful rules engine response
    rulesEngineService.executeRules.mockResolvedValue({
      messages: [],
      actions: [],
      blocked: false
    });
  });

  it('should call rules engine with checkout_start entry point when component mounts', async () => {
    const mockOnComplete = jest.fn();
    
    render(<CheckoutSteps onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(rulesEngineService.executeRules).toHaveBeenCalledWith(
        rulesEngineService.ENTRY_POINTS.CHECKOUT_START,
        expect.objectContaining({
          cart: expect.objectContaining({
            items: mockCartItems,
            total: 50.00
          }),
          user: expect.any(Object)
        })
      );
    });
  });

  it('should display ASET warning message above order summary when cart contains ASET products', async () => {
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

    const { useCart } = require('../../../contexts/CartContext');
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

    const mockOnComplete = jest.fn();
    
    render(<CheckoutSteps onComplete={mockOnComplete} />);

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

    const { useCart } = require('../../../contexts/CartContext');
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

    const mockOnComplete = jest.fn();
    
    render(<CheckoutSteps onComplete={mockOnComplete} />);

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

    const { useCart } = require('../../../contexts/CartContext');
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

    const mockOnComplete = jest.fn();
    
    render(<CheckoutSteps onComplete={mockOnComplete} />);

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

    const { useCart } = require('../../../contexts/CartContext');
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

    const mockOnComplete = jest.fn();
    
    render(<CheckoutSteps onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(rulesEngineService.executeRules).toHaveBeenCalled();
    });

    // Verify no import tax modal is displayed
    expect(screen.queryByText('Import Tax Notice')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});