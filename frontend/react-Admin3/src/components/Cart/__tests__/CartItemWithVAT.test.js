/**
 * Test suite for CartItemWithVAT component (Phase 4, Task T038)
 *
 * Tests cart item rendering with VAT data:
 * - Item with net price prominent
 * - VAT amount below net
 * - Gross total display
 * - VAT rate badge
 * - Missing VAT data handling
 * - CartVATDisplay integration
 * - Quantity controls
 * - Product name and image
 *
 * TDD RED Phase: These tests should fail until component is implemented
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartItemWithVAT from '../CartItemWithVAT';

describe('CartItemWithVAT Component', () => {
  const mockCartItem = {
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
  };

  const mockHandlers = {
    onQuantityChange: jest.fn(),
    onRemove: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders product name', () => {
    render(<CartItemWithVAT item={mockCartItem} {...mockHandlers} />);

    expect(screen.getByText(/CM1 Digital Study Material/i)).toBeInTheDocument();
  });

  it('renders product image', () => {
    render(<CartItemWithVAT item={mockCartItem} {...mockHandlers} />);

    const image = screen.getByRole('img', { name: /CM1 Digital Study Material/i });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/images/products/cm1-digital.jpg');
  });

  it('displays quantity', () => {
    render(<CartItemWithVAT item={mockCartItem} {...mockHandlers} />);

    // Should show quantity value
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
  });

  it('renders quantity controls (increase/decrease buttons)', () => {
    render(<CartItemWithVAT item={mockCartItem} {...mockHandlers} />);

    // Should have buttons to change quantity
    const increaseButton = screen.getByRole('button', { name: /increase|plus|\+/i });
    const decreaseButton = screen.getByRole('button', { name: /decrease|minus|-/i });

    expect(increaseButton).toBeInTheDocument();
    expect(decreaseButton).toBeInTheDocument();
  });

  it('calls onQuantityChange when increase button clicked', () => {
    render(<CartItemWithVAT item={mockCartItem} {...mockHandlers} />);

    const increaseButton = screen.getByRole('button', { name: /increase|plus|\+/i });
    fireEvent.click(increaseButton);

    expect(mockHandlers.onQuantityChange).toHaveBeenCalledWith(mockCartItem.id, 3);
  });

  it('calls onQuantityChange when decrease button clicked', () => {
    render(<CartItemWithVAT item={mockCartItem} {...mockHandlers} />);

    const decreaseButton = screen.getByRole('button', { name: /decrease|minus|-/i });
    fireEvent.click(decreaseButton);

    expect(mockHandlers.onQuantityChange).toHaveBeenCalledWith(mockCartItem.id, 1);
  });

  it('disables decrease button when quantity is 1', () => {
    const itemWithQty1 = {
      ...mockCartItem,
      quantity: 1
    };

    render(<CartItemWithVAT item={itemWithQty1} {...mockHandlers} />);

    const decreaseButton = screen.getByRole('button', { name: /decrease|minus|-/i });
    expect(decreaseButton).toBeDisabled();
  });

  it('renders remove button', () => {
    render(<CartItemWithVAT item={mockCartItem} {...mockHandlers} />);

    const removeButton = screen.getByRole('button', { name: /remove|delete/i });
    expect(removeButton).toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked', () => {
    render(<CartItemWithVAT item={mockCartItem} {...mockHandlers} />);

    const removeButton = screen.getByRole('button', { name: /remove|delete/i });
    fireEvent.click(removeButton);

    expect(mockHandlers.onRemove).toHaveBeenCalledWith(mockCartItem.id);
  });

  it('uses CartVATDisplay component for VAT rendering', () => {
    const { container } = render(<CartItemWithVAT item={mockCartItem} {...mockHandlers} />);

    // Should render VAT amounts (indicating CartVATDisplay is used)
    expect(screen.getByText(/£100\.00/)).toBeInTheDocument(); // net
    expect(screen.getByText(/£20\.00/)).toBeInTheDocument();  // VAT
    expect(screen.getByText(/£120\.00/)).toBeInTheDocument(); // gross
  });

  it('displays VAT rate badge', () => {
    render(<CartItemWithVAT item={mockCartItem} {...mockHandlers} />);

    // Should display VAT rate as percentage
    expect(screen.getByText(/20%/)).toBeInTheDocument();
  });

  it('handles missing VAT data gracefully', () => {
    const itemWithoutVAT = {
      ...mockCartItem,
      vat: null
    };

    // Should not crash
    expect(() => render(
      <CartItemWithVAT item={itemWithoutVAT} {...mockHandlers} />
    )).not.toThrow();

    // Should still display product name
    expect(screen.getByText(/CM1 Digital Study Material/i)).toBeInTheDocument();
  });

  it('displays fallback message when VAT not calculated', () => {
    const itemWithoutVAT = {
      ...mockCartItem,
      vat: null
    };

    render(<CartItemWithVAT item={itemWithoutVAT} {...mockHandlers} />);

    // Should show some indication that VAT is pending
    expect(screen.getByText(/VAT calculating|VAT pending|calculating/i)).toBeInTheDocument();
  });

  it('renders as ListItem component', () => {
    const { container } = render(<CartItemWithVAT item={mockCartItem} {...mockHandlers} />);

    // Should use Material-UI ListItem
    const listItem = container.querySelector('[class*="MuiListItem"]');
    expect(listItem).toBeInTheDocument();
  });

  it('displays unit price (actualPrice)', () => {
    render(<CartItemWithVAT item={mockCartItem} {...mockHandlers} />);

    // Should show unit price
    expect(screen.getByText(/£50\.00/)).toBeInTheDocument();
  });

  it('calculates total correctly (quantity × actualPrice)', () => {
    render(<CartItemWithVAT item={mockCartItem} {...mockHandlers} />);

    // Total should be quantity × actualPrice = 2 × 50 = 100
    expect(screen.getByText(/£100\.00/)).toBeInTheDocument();
  });

  it('updates VAT amounts when quantity changes', () => {
    const { rerender } = render(<CartItemWithVAT item={mockCartItem} {...mockHandlers} />);

    // Initial VAT
    expect(screen.getByText(/£20\.00/)).toBeInTheDocument();

    // Change quantity to 3
    const updatedItem = {
      ...mockCartItem,
      quantity: 3,
      vat: {
        ...mockCartItem.vat,
        netAmount: 150.00,
        vatAmount: 30.00,
        grossAmount: 180.00
      }
    };

    rerender(<CartItemWithVAT item={updatedItem} {...mockHandlers} />);

    // VAT should update
    expect(screen.getByText(/£30\.00/)).toBeInTheDocument();
  });

  it('handles zero VAT (ROW region)', () => {
    const rowItem = {
      ...mockCartItem,
      vat: {
        netAmount: 100.00,
        vatAmount: 0.00,
        grossAmount: 100.00,
        vatRate: 0.0000,
        vatRegion: 'ROW'
      }
    };

    render(<CartItemWithVAT item={rowItem} {...mockHandlers} />);

    // Should display 0% rate
    expect(screen.getByText(/0%/)).toBeInTheDocument();

    // Should display ROW region
    expect(screen.getByText(/ROW/i)).toBeInTheDocument();
  });

  it('displays SA VAT (15%)', () => {
    const saItem = {
      ...mockCartItem,
      vat: {
        netAmount: 500.00,
        vatAmount: 75.00,
        grossAmount: 575.00,
        vatRate: 0.1500,
        vatRegion: 'SA'
      }
    };

    render(<CartItemWithVAT item={saItem} {...mockHandlers} />);

    // Should display 15% rate
    expect(screen.getByText(/15%/)).toBeInTheDocument();

    // Should display SA region
    expect(screen.getByText(/SA/i)).toBeInTheDocument();
  });

  it('applies custom className if provided', () => {
    const { container } = render(
      <CartItemWithVAT
        item={mockCartItem}
        {...mockHandlers}
        className="custom-cart-item"
      />
    );

    expect(container.firstChild).toHaveClass('custom-cart-item');
  });

  it('shows loading state while VAT is being calculated', () => {
    const itemCalculating = {
      ...mockCartItem,
      vat: null,
      vatCalculating: true
    };

    render(<CartItemWithVAT item={itemCalculating} {...mockHandlers} />);

    // Should show loading indicator
    expect(screen.getByRole('progressbar') || screen.getByText(/loading|calculating/i)).toBeInTheDocument();
  });
});
