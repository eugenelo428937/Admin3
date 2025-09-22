import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartSummaryPanel from '../CartSummaryPanel';

describe('CartSummaryPanel', () => {
  const mockCartItems = [
    {
      id: 1,
      product_name: 'Test Product 1',
      subject_code: 'TEST1',
      variation_name: 'Standard',
      actual_price: '50.00',
      quantity: 1
    },
    {
      id: 2,
      product_name: 'Test Product 2',
      subject_code: 'TEST2',
      variation_name: 'Premium',
      actual_price: '75.00',
      quantity: 2
    }
  ];

  const mockVatCalculations = {
    totals: {
      subtotal: 200.00,
      total_vat: 40.00,
      total_gross: 240.00
    }
  };

  it('should render cart summary when expanded', () => {
    render(
      <CartSummaryPanel
        cartItems={mockCartItems}
        vatCalculations={mockVatCalculations}
        isCollapsed={false}
        onToggleCollapse={jest.fn()}
      />
    );

    expect(screen.getByText('Cart Summary')).toBeInTheDocument();
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    expect(screen.getByText('£200.00')).toBeInTheDocument(); // subtotal
    expect(screen.getByText('£240.00')).toBeInTheDocument(); // total
  });

  it('should show collapse button when expanded', () => {
    const mockOnToggle = jest.fn();
    render(
      <CartSummaryPanel
        cartItems={mockCartItems}
        vatCalculations={mockVatCalculations}
        isCollapsed={false}
        onToggleCollapse={mockOnToggle}
      />
    );

    const collapseButton = screen.getByRole('button', { name: /collapse/i });
    expect(collapseButton).toBeInTheDocument();

    fireEvent.click(collapseButton);
    expect(mockOnToggle).toHaveBeenCalledWith(true);
  });

  it('should show only summary when collapsed', () => {
    render(
      <CartSummaryPanel
        cartItems={mockCartItems}
        vatCalculations={mockVatCalculations}
        isCollapsed={true}
        onToggleCollapse={jest.fn()}
      />
    );

    expect(screen.getByText('Cart Summary')).toBeInTheDocument();
    expect(screen.getByText(/£240.00/)).toBeInTheDocument(); // total should be visible
    expect(screen.queryByText('Test Product 1')).not.toBeInTheDocument(); // items should be hidden
  });

  it('should show expand button when collapsed', () => {
    const mockOnToggle = jest.fn();
    render(
      <CartSummaryPanel
        cartItems={mockCartItems}
        vatCalculations={mockVatCalculations}
        isCollapsed={true}
        onToggleCollapse={mockOnToggle}
      />
    );

    const expandButton = screen.getByRole('button', { name: /expand/i });
    expect(expandButton).toBeInTheDocument();

    fireEvent.click(expandButton);
    expect(mockOnToggle).toHaveBeenCalledWith(false);
  });

  it('should handle missing VAT calculations gracefully', () => {
    render(
      <CartSummaryPanel
        cartItems={mockCartItems}
        vatCalculations={null}
        isCollapsed={false}
        onToggleCollapse={jest.fn()}
      />
    );

    expect(screen.getByText('Cart Summary')).toBeInTheDocument();
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    // Should not crash without VAT calculations
  });

  it('should display correct item quantities and prices', () => {
    render(
      <CartSummaryPanel
        cartItems={mockCartItems}
        vatCalculations={mockVatCalculations}
        isCollapsed={false}
        onToggleCollapse={jest.fn()}
      />
    );

    // Check first item (quantity 1)
    expect(screen.getByText('Qty: 1')).toBeInTheDocument();
    expect(screen.getByText('£50.00')).toBeInTheDocument();

    // Check second item (quantity 2)
    expect(screen.getByText('Qty: 2')).toBeInTheDocument();
    expect(screen.getByText('£150.00')).toBeInTheDocument(); // 75 * 2
  });
});