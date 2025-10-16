/**
 * Cart Page Integration Tests (Phase 4, Task T046)
 *
 * Tests full Cart page with VAT integration:
 * - Fetches cart data from API on mount
 * - Renders CartItemWithVAT for each item
 * - Renders CartTotals with VAT breakdown
 * - Shows CartVATError when vat_calculation_error=true
 * - Hides error when vat_calculation_error=false
 * - Handles API errors gracefully
 * - Integrates retry functionality
 *
 * TDD RED Phase: These tests should fail until Cart page is implemented
 */

// Mock useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock axios to prevent import errors
jest.mock('axios');

// Mock cart service
jest.mock('../../services/cartService', () => ({
  __esModule: true,
  default: {
    fetchCart: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn()
  }
}));

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Cart from '../Cart';
import cartService from '../../services/cartService';

describe('Cart Page Integration Tests', () => {
  const mockCartData = {
    items: [
      {
        id: 1,
        product: {
          id: 101,
          name: 'CM1 Digital Study Material',
          image: '/images/products/cm1-digital.jpg'
        },
        quantity: 2,
        actualPrice: 50.00,
        vat: {
          netAmount: 100.00,
          vatAmount: 20.00,
          grossAmount: 120.00,
          vatRate: 0.2000,
          vatRegion: 'UK'
        }
      },
      {
        id: 2,
        product: {
          id: 102,
          name: 'CS1 Printed Textbook',
          image: '/images/products/cs1-printed.jpg'
        },
        quantity: 1,
        actualPrice: 75.00,
        vat: {
          netAmount: 75.00,
          vatAmount: 15.00,
          grossAmount: 90.00,
          vatRate: 0.2000,
          vatRegion: 'UK'
        }
      }
    ],
    totals: {
      totalNetAmount: 175.00,
      totalVatAmount: 35.00,
      totalGrossAmount: 210.00,
      vatBreakdown: [
        {
          region: 'UK',
          rate: '20%',
          amount: 35.00,
          itemCount: 2
        }
      ]
    },
    vatCalculationError: false,
    vatCalculationErrorMessage: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('fetches cart data from API on mount', async () => {
    cartService.fetchCart = jest.fn().mockResolvedValue({ data: mockCartData });

    render(<Cart />);

    await waitFor(() => {
      expect(cartService.fetchCart).toHaveBeenCalledTimes(1);
    });
  });

  it('displays loading state while fetching cart data', () => {
    cartService.fetchCart = jest.fn(() => new Promise(() => {})); // Never resolves

    render(<Cart />);

    expect(screen.getByRole('progressbar') || screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders CartItemWithVAT for each cart item', async () => {
    cartService.fetchCart = jest.fn().mockResolvedValue({ data: mockCartData });

    render(<Cart />);

    await waitFor(() => {
      // Should render both product names
      expect(screen.getByText(/CM1 Digital Study Material/i)).toBeInTheDocument();
      expect(screen.getByText(/CS1 Printed Textbook/i)).toBeInTheDocument();
    });

    // Should show VAT amounts
    expect(screen.getByText(/£20\.00/)).toBeInTheDocument();
    expect(screen.getByText(/£15\.00/)).toBeInTheDocument();
  });

  it('renders CartTotals with VAT breakdown', async () => {
    cartService.fetchCart = jest.fn().mockResolvedValue({ data: mockCartData });

    render(<Cart />);

    await waitFor(() => {
      // Should show total amounts (may appear multiple times)
      expect(screen.getAllByText(/£175\.00/).length).toBeGreaterThan(0); // net
      expect(screen.getAllByText(/£35\.00/).length).toBeGreaterThan(0);  // VAT
      expect(screen.getAllByText(/£210\.00/).length).toBeGreaterThan(0); // gross
    });

    // Should show VAT breakdown
    expect(screen.getAllByText(/UK/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/20%/).length).toBeGreaterThan(0);
  });

  it('shows CartVATError when vat_calculation_error=true', async () => {
    const errorCartData = {
      ...mockCartData,
      vatCalculationError: true,
      vatCalculationErrorMessage: 'VAT calculation failed. Rules engine unavailable.'
    };

    cartService.fetchCart = jest.fn().mockResolvedValue({ data: errorCartData });

    render(<Cart />);

    await waitFor(() => {
      expect(screen.getByText(/VAT calculation failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Rules engine unavailable/i)).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByRole('button', { name: /recalculate vat/i })).toBeInTheDocument();
  });

  it('hides error when vat_calculation_error=false', async () => {
    cartService.fetchCart = jest.fn().mockResolvedValue({ data: mockCartData });

    render(<Cart />);

    await waitFor(() => {
      expect(screen.getByText(/CM1 Digital Study Material/i)).toBeInTheDocument();
    });

    // Should not show error message
    expect(screen.queryByText(/VAT calculation failed/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /recalculate vat/i })).not.toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    cartService.fetchCart = jest.fn().mockRejectedValue(new Error('Network error'));

    render(<Cart />);

    await waitFor(() => {
      expect(screen.getByText(/error|failed|unable/i)).toBeInTheDocument();
    });
  });

  it('handles empty cart state', async () => {
    const emptyCartData = {
      items: [],
      totals: {
        totalNetAmount: 0.00,
        totalVatAmount: 0.00,
        totalGrossAmount: 0.00,
        vatBreakdown: []
      },
      vatCalculationError: false
    };

    cartService.fetchCart = jest.fn().mockResolvedValue({ data: emptyCartData });

    render(<Cart />);

    await waitFor(() => {
      expect(screen.getAllByText(/empty|no items/i).length).toBeGreaterThan(0);
    });
  });

  it('handles quantity change for cart items', async () => {
    cartService.fetchCart = jest.fn().mockResolvedValue({ data: mockCartData });
    cartService.updateItem = jest.fn().mockResolvedValue({
      data: { ...mockCartData, items: [{ ...mockCartData.items[0], quantity: 3 }] }
    });

    render(<Cart />);

    await waitFor(() => {
      expect(screen.getByText(/CM1 Digital Study Material/i)).toBeInTheDocument();
    });

    // Click increase quantity button
    const increaseButtons = screen.getAllByRole('button', { name: /increase|plus|\+/i });
    fireEvent.click(increaseButtons[0]);

    await waitFor(() => {
      expect(cartService.updateItem).toHaveBeenCalled();
    });
  });

  it('handles item removal from cart', async () => {
    cartService.fetchCart = jest.fn().mockResolvedValue({ data: mockCartData });
    cartService.removeItem = jest.fn().mockResolvedValue({
      data: { ...mockCartData, items: [mockCartData.items[1]] }
    });

    render(<Cart />);

    await waitFor(() => {
      expect(screen.getByText(/CM1 Digital Study Material/i)).toBeInTheDocument();
    });

    // Click remove button for first item
    const removeButtons = screen.getAllByRole('button', { name: /remove|delete/i });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(cartService.removeItem).toHaveBeenCalledWith(1);
    });
  });

  it('integrates VAT retry functionality', async () => {
    const errorCartData = {
      ...mockCartData,
      vatCalculationError: true,
      vatCalculationErrorMessage: 'VAT calculation failed'
    };

    cartService.fetchCart = jest.fn()
      .mockResolvedValueOnce({ data: errorCartData })
      .mockResolvedValueOnce({ data: mockCartData }); // After retry

    render(<Cart />);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/VAT calculation failed/i)).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /recalculate vat/i });
    fireEvent.click(retryButton);

    // Wait for error to disappear after successful retry
    await waitFor(() => {
      expect(screen.queryByText(/VAT calculation failed/i)).not.toBeInTheDocument();
    });

    expect(cartService.fetchCart).toHaveBeenCalledTimes(2);
  });

  it('displays VAT for multiple regions', async () => {
    const multiRegionCart = {
      items: [
        {
          id: 1,
          product: { id: 101, name: 'UK Product' },
          quantity: 1,
          actualPrice: 100.00,
          vat: {
            netAmount: 100.00,
            vatAmount: 20.00,
            grossAmount: 120.00,
            vatRate: 0.2000,
            vatRegion: 'UK'
          }
        },
        {
          id: 2,
          product: { id: 102, name: 'SA Product' },
          quantity: 1,
          actualPrice: 500.00,
          vat: {
            netAmount: 500.00,
            vatAmount: 75.00,
            grossAmount: 575.00,
            vatRate: 0.1500,
            vatRegion: 'SA'
          }
        }
      ],
      totals: {
        totalNetAmount: 600.00,
        totalVatAmount: 95.00,
        totalGrossAmount: 695.00,
        vatBreakdown: [
          { region: 'UK', rate: '20%', amount: 20.00, itemCount: 1 },
          { region: 'SA', rate: '15%', amount: 75.00, itemCount: 1 }
        ]
      },
      vatCalculationError: false
    };

    cartService.fetchCart = jest.fn().mockResolvedValue({ data: multiRegionCart });

    render(<Cart />);

    await waitFor(() => {
      // Should show both regions in breakdown (may appear multiple times)
      expect(screen.getAllByText(/UK/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/SA/i).length).toBeGreaterThan(0);

      // Should show both rates (may appear multiple times)
      expect(screen.getAllByText(/20%/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/15%/).length).toBeGreaterThan(0);
    });
  });

  it('navigates to checkout when checkout button clicked', async () => {
    cartService.fetchCart = jest.fn().mockResolvedValue({ data: mockCartData });

    render(<Cart />);

    await waitFor(() => {
      expect(screen.getByText(/CM1 Digital Study Material/i)).toBeInTheDocument();
    });

    // Click checkout button
    const checkoutButton = screen.getByRole('button', { name: /checkout|proceed/i });
    fireEvent.click(checkoutButton);

    // Should navigate to /checkout
    expect(mockNavigate).toHaveBeenCalledWith('/checkout');
  });

  it('refreshes cart data after successful VAT recalculation', async () => {
    const errorCartData = {
      ...mockCartData,
      vatCalculationError: true,
      vatCalculationErrorMessage: 'VAT calculation failed'
    };

    cartService.fetchCart = jest.fn()
      .mockResolvedValueOnce({ data: errorCartData })
      .mockResolvedValueOnce({ data: mockCartData });

    render(<Cart />);

    await waitFor(() => {
      expect(screen.getByText(/VAT calculation failed/i)).toBeInTheDocument();
    });

    // Retry VAT calculation
    const retryButton = screen.getByRole('button', { name: /recalculate vat/i });
    fireEvent.click(retryButton);

    // Should refetch cart data
    await waitFor(() => {
      expect(cartService.fetchCart).toHaveBeenCalledTimes(2);
    });
  });
});
