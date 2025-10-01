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

  // T001: Dynamic VAT label display tests (TDD RED Phase)
  describe('Dynamic VAT Label Display (T001)', () => {
    it('should display "VAT (20%)" when effective_vat_rate is 0.20', () => {
      const vatWith20Percent = {
        totals: {
          subtotal: 200.00,
          total_vat: 40.00,
          total_gross: 240.00,
          effective_vat_rate: 0.20
        }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWith20Percent}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      expect(screen.getByText(/VAT \(20%\)/)).toBeInTheDocument();
    });

    it('should display "VAT (15%)" when effective_vat_rate is 0.15', () => {
      const vatWith15Percent = {
        totals: {
          subtotal: 200.00,
          total_vat: 30.00,
          total_gross: 230.00,
          effective_vat_rate: 0.15
        }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWith15Percent}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      expect(screen.getByText(/VAT \(15%\)/)).toBeInTheDocument();
    });

    it('should display "VAT (0%)" when effective_vat_rate is 0.00', () => {
      const vatWith0Percent = {
        totals: {
          subtotal: 200.00,
          total_vat: 0.00,
          total_gross: 200.00,
          effective_vat_rate: 0.00
        }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWith0Percent}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      expect(screen.getByText(/VAT \(0%\)/)).toBeInTheDocument();
    });

    it('should display "VAT:" when effective_vat_rate is undefined', () => {
      const vatWithoutRate = {
        totals: {
          subtotal: 200.00,
          total_vat: 40.00,
          total_gross: 240.00
          // effective_vat_rate is intentionally missing
        }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithoutRate}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      // Should display "VAT:" without percentage when rate is undefined
      const vatElement = screen.getByText(/VAT/);
      expect(vatElement.textContent).toMatch(/^VAT\s*:/);
    });

    it('should display "VAT:" when effective_vat_rate is null', () => {
      const vatWithNullRate = {
        totals: {
          subtotal: 200.00,
          total_vat: 40.00,
          total_gross: 240.00,
          effective_vat_rate: null
        }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithNullRate}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      // Should display "VAT:" without percentage when rate is null
      const vatElement = screen.getByText(/VAT/);
      expect(vatElement.textContent).toMatch(/^VAT\s*:/);
    });
  });
});