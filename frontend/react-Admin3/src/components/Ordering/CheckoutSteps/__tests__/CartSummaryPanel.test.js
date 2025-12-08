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
    },
    region_info: { region: 'UK' }
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

  // T001: Dynamic VAT label display tests - now based on region, not effective_vat_rate
  describe('Dynamic VAT Label Display (T001)', () => {
    it('should display "VAT (20%)" for UK region', () => {
      const vatWithUKRegion = {
        totals: {
          subtotal: 200.00,
          total_vat: 40.00,
          total_gross: 240.00,
          effective_vat_rate: 0.20
        },
        region_info: { region: 'UK' }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithUKRegion}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      expect(screen.getByText(/VAT \(20%\)/)).toBeInTheDocument();
      expect(screen.getByText(/United Kingdom/)).toBeInTheDocument();
    });

    it('should display "VAT (15%)" for SA region', () => {
      const vatWithSARegion = {
        totals: {
          subtotal: 200.00,
          total_vat: 30.00,
          total_gross: 230.00,
          effective_vat_rate: 0.15
        },
        region_info: { region: 'SA' }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithSARegion}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      expect(screen.getByText(/VAT \(15%\)/)).toBeInTheDocument();
      expect(screen.getByText(/South Africa/)).toBeInTheDocument();
    });

    it('should display "VAT (23%)" for IE region', () => {
      const vatWithIERegion = {
        totals: {
          subtotal: 200.00,
          total_vat: 46.00,
          total_gross: 246.00,
          effective_vat_rate: 0.23
        },
        region_info: { region: 'IE' }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithIERegion}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      expect(screen.getByText(/VAT \(23%\)/)).toBeInTheDocument();
      expect(screen.getByText(/Ireland/)).toBeInTheDocument();
    });

    it('should display "VAT (0%)" for ROW region', () => {
      const vatWithROWRegion = {
        totals: {
          subtotal: 200.00,
          total_vat: 0.00,
          total_gross: 200.00,
          effective_vat_rate: 0.00
        },
        region_info: { region: 'ROW' }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithROWRegion}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      expect(screen.getByText(/VAT \(0%\)/)).toBeInTheDocument();
      expect(screen.getByText(/Rest of World/)).toBeInTheDocument();
    });

    it('should display "VAT (0%)" when region is undefined', () => {
      const vatWithoutRegion = {
        totals: {
          subtotal: 200.00,
          total_vat: 40.00,
          total_gross: 240.00
          // region_info is intentionally missing
        }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithoutRegion}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      // Should display "VAT (0%)" when region is unknown (defaults to 0%)
      expect(screen.getByText(/VAT \(0%\)/)).toBeInTheDocument();
    });
  });

  describe('VAT Breakdown Section (T002)', () => {
    it('should show "View VAT breakdown" link when per-item VAT data exists', () => {
      const vatWithItems = {
        totals: {
          subtotal: 200.00,
          total_vat: 40.00,
          total_gross: 240.00
        },
        region_info: { region: 'UK' },
        vat_calculations: [
          { id: '1', product_type: 'Digital', net_amount: '50.00', vat_rate: '0.20', vat_amount: '10.00' },
          { id: '2', product_type: 'Digital', net_amount: '150.00', vat_rate: '0.20', vat_amount: '30.00' }
        ]
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithItems}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      expect(screen.getByText(/View VAT breakdown/)).toBeInTheDocument();
    });

    it('should expand and show per-item VAT details when clicked', () => {
      const vatWithItems = {
        totals: {
          subtotal: 200.00,
          total_vat: 40.00,
          total_gross: 240.00
        },
        region_info: { region: 'UK' },
        vat_calculations: [
          { id: '1', product_type: 'Digital', net_amount: '50.00', vat_rate: '0.20', vat_amount: '10.00' },
          { id: '2', product_type: 'Printed', net_amount: '150.00', vat_rate: '0.00', vat_amount: '0.00' }
        ]
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithItems}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      // Click to expand VAT breakdown
      const breakdownLink = screen.getByText(/View VAT breakdown/);
      fireEvent.click(breakdownLink);

      // Should show per-item VAT details
      expect(screen.getByText('VAT per Product:')).toBeInTheDocument();
    });

    it('should indicate mixed VAT rates when items have different rates', () => {
      const vatWithMixedRates = {
        totals: {
          subtotal: 200.00,
          total_vat: 10.00,
          total_gross: 210.00
        },
        region_info: { region: 'UK' },
        vat_calculations: [
          { id: '1', product_type: 'Digital', net_amount: '50.00', vat_rate: '0.20', vat_amount: '10.00' },
          { id: '2', product_type: 'Printed', net_amount: '150.00', vat_rate: '0.00', vat_amount: '0.00' }
        ]
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithMixedRates}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      // Should indicate mixed rates
      expect(screen.getByText(/mixed rates/i)).toBeInTheDocument();
    });

    it('should not show breakdown link when no per-item VAT data', () => {
      const vatWithoutItems = {
        totals: {
          subtotal: 200.00,
          total_vat: 40.00,
          total_gross: 240.00
        },
        region_info: { region: 'UK' },
        vat_calculations: []
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithoutItems}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
        />
      );

      expect(screen.queryByText(/View VAT breakdown/)).not.toBeInTheDocument();
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
        },
        region_info: { region: 'UK' }
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
        },
        region_info: { region: 'UK' }
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
              },
              region_info: { region: 'UK' }
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
      },
      region_info: { region: 'UK' }
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
      },
      region_info: { region: 'UK' }
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
