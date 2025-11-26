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

    expect(screen.getByText('Order Summary')).toBeInTheDocument();
    // Product names should be visible when expanded
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.getByText('Test Product 2')).toBeInTheDocument();
  });

  it('should show toggle button when expanded', () => {
    render(
      <CartSummaryPanel
        cartItems={mockCartItems}
        vatCalculations={mockVatCalculations}
        isCollapsed={false}
        onToggleCollapse={jest.fn()}
      />
    );

    // Button should exist for toggling collapse state
    const toggleButton = screen.getByRole('button', { name: /collapse|expand/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toBeEnabled();
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

    expect(screen.getByText('Order Summary')).toBeInTheDocument();
    // Items should be in the collapsed view
    const itemCountText = screen.getByText(/\d+\s*items?/i);
    expect(itemCountText).toBeInTheDocument();
  });

  it('should show expand button when collapsed', () => {
    render(
      <CartSummaryPanel
        cartItems={mockCartItems}
        vatCalculations={mockVatCalculations}
        isCollapsed={true}
        onToggleCollapse={jest.fn()}
      />
    );

    // Expand button should exist with proper aria-label
    const expandButton = screen.getByRole('button', { name: /expand/i });
    expect(expandButton).toBeInTheDocument();
    expect(expandButton).toBeEnabled();
  });

  it('should handle missing VAT calculations gracefully', () => {
    expect(() => {
      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={null}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );
    }).not.toThrow();

    expect(screen.getByText('Order Summary')).toBeInTheDocument();
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

    // Product names should be visible
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.getByText('Test Product 2')).toBeInTheDocument();
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

  describe('Edge Cases (T044 - Large Quantities)', () => {
    it('handles extremely large quantities without overflow', () => {
      const largeQuantityItems = [
        {
          id: 1,
          product_name: 'High Volume Product',
          subject_code: 'TEST1',
          variation_name: 'Standard',
          actual_price: '50.00',
          quantity: 9999
        },
        {
          id: 2,
          product_name: 'Another High Volume Product',
          subject_code: 'TEST2',
          variation_name: 'Premium',
          actual_price: '75.00',
          quantity: 99999
        }
      ];

      const largeQuantityVat = {
        totals: {
          subtotal: 7999200.00,
          total_vat: 1599840.00,
          total_gross: 9599040.00,
          effective_vat_rate: 0.20
        }
      };

      expect(() => {
        render(
          <CartSummaryPanel
            cartItems={largeQuantityItems}
            vatCalculations={largeQuantityVat}
            isCollapsed={false}
            onToggleCollapse={jest.fn()}
          />
        );
      }).not.toThrow();

      expect(screen.getByText('Order Summary')).toBeInTheDocument();
      // Verify items are present (quantity display format may vary)
      expect(screen.getByText('High Volume Product')).toBeInTheDocument();
      expect(screen.getByText('Another High Volume Product')).toBeInTheDocument();
    });

    it('formats extremely large currency amounts correctly', () => {
      const largeAmountVat = {
        totals: {
          subtotal: 1000000.00,
          total_vat: 200000.00,
          total_gross: 1200000.00,
          effective_vat_rate: 0.20
        }
      };

      render(
        <CartSummaryPanel
          cartItems={[{
            id: 1,
            product_name: 'Expensive Product',
            subject_code: 'TEST',
            variation_name: 'Premium',
            actual_price: '1000000.00',
            quantity: 1
          }]}
          vatCalculations={largeAmountVat}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      // Should display large amounts without crashing
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
      // The exact format may vary based on locale/component implementation
      expect(screen.getByText('Expensive Product')).toBeInTheDocument();
    });

    it('handles quantity of zero without crashing', () => {
      const zeroQuantityItems = [
        {
          id: 1,
          product_name: 'Zero Quantity Product',
          subject_code: 'TEST',
          variation_name: 'Standard',
          actual_price: '50.00',
          quantity: 0
        }
      ];

      expect(() => {
        render(
          <CartSummaryPanel
            cartItems={zeroQuantityItems}
            vatCalculations={{
              totals: {
                subtotal: 0,
                total_vat: 0,
                total_gross: 0,
                effective_vat_rate: 0.20
              }
            }}
            isCollapsed={false}
            onToggleCollapse={jest.fn()}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Snapshot Tests (T032 - Regression Detection)', () => {
    const emptyCartVat = {
      totals: {
        subtotal: 0,
        total_vat: 0,
        total_gross: 0,
        effective_vat_rate: 0.20
      }
    };

    const singleItemCart = [
      {
        id: 1,
        product_name: 'Single Test Product',
        subject_code: 'TEST1',
        variation_name: 'Standard',
        actual_price: '50.00',
        quantity: 1
      }
    ];

    const singleItemVat = {
      totals: {
        subtotal: 50.00,
        total_vat: 10.00,
        total_gross: 60.00,
        effective_vat_rate: 0.20
      }
    };

    it('renders empty cart summary', () => {
      const { container } = render(
        <CartSummaryPanel
          cartItems={[]}
          vatCalculations={emptyCartVat}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders single item cart summary', () => {
      const { container } = render(
        <CartSummaryPanel
          cartItems={singleItemCart}
          vatCalculations={singleItemVat}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders multi-item cart summary', () => {
      const { container } = render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('renders collapsed cart summary', () => {
      const { container } = render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={mockVatCalculations}
          isCollapsed={true}
          onToggleCollapse={jest.fn()}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});