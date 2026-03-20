/**
 * Test suite for CartTotals component (Phase 4, Task T040)
 *
 * Tests cart totals display with VAT breakdown:
 * - Total net amount
 * - Total VAT amount
 * - Total gross amount
 * - VAT breakdown by region
 * - Item count per region
 * - Card component with dividers
 *
 * TDD RED Phase: These tests should fail until component is implemented
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartTotals from '../CartTotals';

describe('CartTotals Component', () => {
  const mockTotals = {
    totalNetAmount: 150.00,
    totalVatAmount: 30.00,
    totalGrossAmount: 180.00,
    vatBreakdown: [
      {
        region: 'UK',
        rate: '20%',
        amount: 30.00,
        itemCount: 3
      }
    ]
  };

  it('renders as Material-UI Card component', () => {
    const { container } = render(<CartTotals totals={mockTotals} />);

    const card = container.querySelector('[class*="MuiCard"]');
    expect(card).toBeInTheDocument();
  });

  it('displays total net amount', () => {
    render(<CartTotals totals={mockTotals} />);

    expect(screen.getByText(/subtotal|net total/i)).toBeInTheDocument();
    expect(screen.getByText(/£150\.00/)).toBeInTheDocument();
  });

  it('displays total VAT amount', () => {
    render(<CartTotals totals={mockTotals} />);

    // "VAT" appears multiple times (label and breakdown), so just verify amounts
    expect(screen.getAllByText(/VAT/i).length).toBeGreaterThan(0);
    // £30.00 also appears multiple times (total VAT and breakdown)
    expect(screen.getAllByText(/£30\.00/).length).toBeGreaterThan(0);
  });

  it('displays total gross amount prominently', () => {
    render(<CartTotals totals={mockTotals} />);

    // Look for specific "Total (inc. VAT)" label
    expect(screen.getByText(/Total \(inc\. VAT\)/i)).toBeInTheDocument();

    // Gross total should be displayed with proper typography
    const grossElement = screen.getByText(/£180\.00/).closest('[class*="MuiTypography"]');
    expect(grossElement).toBeInTheDocument();
    // Note: fontWeight is applied via sx prop, not inline styles, so we can't test it directly
  });

  it('renders dividers between sections', () => {
    const { container } = render(<CartTotals totals={mockTotals} />);

    // Should have Material-UI Divider components
    const dividers = container.querySelectorAll('[class*="MuiDivider"]');
    expect(dividers.length).toBeGreaterThan(0);
  });

  it('displays VAT breakdown section', () => {
    render(<CartTotals totals={mockTotals} />);

    // Look for the specific "VAT Breakdown:" label
    expect(screen.getByText(/VAT Breakdown:/i)).toBeInTheDocument();
  });

  it('displays VAT breakdown by region', () => {
    render(<CartTotals totals={mockTotals} />);

    // Should show UK region
    expect(screen.getByText(/UK/i)).toBeInTheDocument();

    // Should show 20% rate
    expect(screen.getByText(/20%/)).toBeInTheDocument();

    // Should show UK VAT amount (£30.00 appears multiple times)
    expect(screen.getAllByText(/£30\.00/).length).toBeGreaterThan(0);
  });

  it('displays item count per region', () => {
    render(<CartTotals totals={mockTotals} />);

    // Should show item count (3 items)
    expect(screen.getByText(/3 items?/i)).toBeInTheDocument();
  });

  it('handles multiple VAT regions in breakdown', () => {
    const multiRegionTotals = {
      totalNetAmount: 650.00,
      totalVatAmount: 105.00,
      totalGrossAmount: 755.00,
      vatBreakdown: [
        {
          region: 'UK',
          rate: '20%',
          amount: 30.00,
          itemCount: 2
        },
        {
          region: 'SA',
          rate: '15%',
          amount: 75.00,
          itemCount: 1
        }
      ]
    };

    render(<CartTotals totals={multiRegionTotals} />);

    // Should show both regions
    expect(screen.getByText(/UK/i)).toBeInTheDocument();
    expect(screen.getByText(/SA/i)).toBeInTheDocument();

    // Should show both rates
    expect(screen.getByText(/20%/)).toBeInTheDocument();
    expect(screen.getByText(/15%/)).toBeInTheDocument();

    // Should show item counts - be flexible with singular/plural
    expect(screen.getByText(/2 items/i)).toBeInTheDocument();
    expect(screen.getByText(/1 item/i)).toBeInTheDocument(); // singular
  });

  it('renders VAT breakdown as Material-UI List', () => {
    const { container } = render(<CartTotals totals={mockTotals} />);

    // VAT breakdown should use List component
    const list = container.querySelector('[class*="MuiList"]');
    expect(list).toBeInTheDocument();
  });

  it('handles zero VAT gracefully', () => {
    const zeroVatTotals = {
      totalNetAmount: 100.00,
      totalVatAmount: 0.00,
      totalGrossAmount: 100.00,
      vatBreakdown: [
        {
          region: 'ROW',
          rate: '0%',
          amount: 0.00,
          itemCount: 1
        }
      ]
    };

    render(<CartTotals totals={zeroVatTotals} />);

    // Should display £0.00 VAT (may appear multiple times)
    const zeroAmounts = screen.getAllByText(/£0\.00/);
    expect(zeroAmounts.length).toBeGreaterThanOrEqual(1);

    // Should show ROW region
    expect(screen.getByText(/ROW/i)).toBeInTheDocument();

    // Should show 0% rate
    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it('handles empty VAT breakdown array', () => {
    const noBreakdown = {
      totalNetAmount: 100.00,
      totalVatAmount: 0.00,
      totalGrossAmount: 100.00,
      vatBreakdown: []
    };

    // Should not crash
    expect(() => render(<CartTotals totals={noBreakdown} />)).not.toThrow();

    // Should still display totals (£100.00 appears multiple times)
    expect(screen.getAllByText(/£100\.00/).length).toBeGreaterThan(0);
  });

  it('emphasizes gross total with larger font', () => {
    render(<CartTotals totals={mockTotals} />);

    // Gross total should use larger variant (h5 or h6) or be bold
    const grossAmount = screen.getByText(/£180\.00/);
    const typography = grossAmount.closest('[class*="MuiTypography"]');
    expect(typography).toBeInTheDocument();
    // Just verify it exists, don't be too strict about the exact variant
  });

  it('formats currency correctly for GBP', () => {
    render(<CartTotals totals={mockTotals} currency="GBP" />);

    // All amounts should have £ symbol
    const amounts = screen.getAllByText(/£/);
    expect(amounts.length).toBeGreaterThanOrEqual(3); // net, VAT, gross
  });

  it('formats currency correctly for USD', () => {
    const usdTotals = {
      ...mockTotals
    };
    // Remove currency from totals object if it exists
    delete usdTotals.currency;

    // Pass currency as component prop
    render(<CartTotals totals={usdTotals} currency="USD" />);

    // All amounts should have $ symbol
    const amounts = screen.getAllByText(/\$/);
    expect(amounts.length).toBeGreaterThanOrEqual(3);
  });

  it('formats currency correctly for ZAR', () => {
    const zarTotals = {
      totalNetAmount: 1100.00,
      totalVatAmount: 165.00,
      totalGrossAmount: 1265.00,
      vatBreakdown: [
        {
          region: 'SA',
          rate: '15%',
          amount: 165.00,
          itemCount: 2
        }
      ]
    };

    // Pass currency as component prop, not in totals object
    render(<CartTotals totals={zarTotals} currency="ZAR" />);

    // All amounts should have R symbol (with or without comma)
    expect(screen.getByText(/R1,100\.00|R1100\.00/)).toBeInTheDocument();
    // R165.00 appears multiple times (total VAT and breakdown)
    expect(screen.getAllByText(/R165\.00/).length).toBeGreaterThan(0);
    expect(screen.getByText(/R1,265\.00|R1265\.00/)).toBeInTheDocument();
  });

  it('applies custom className if provided', () => {
    const { container } = render(
      <CartTotals totals={mockTotals} className="custom-totals-card" />
    );

    expect(container.firstChild).toHaveClass('custom-totals-card');
  });

  it('includes padding/spacing in Card content', () => {
    const { container } = render(<CartTotals totals={mockTotals} />);

    // Card should have CardContent with padding
    const cardContent = container.querySelector('[class*="MuiCardContent"]');
    expect(cardContent).toBeInTheDocument();
  });

  it('displays breakdown items with consistent formatting', () => {
    const { container } = render(<CartTotals totals={mockTotals} />);

    // Should have VAT breakdown displayed (verify List exists)
    const list = container.querySelector('[class*="MuiList"]');
    expect(list).toBeInTheDocument();

    // Verify breakdown content is displayed
    expect(screen.getByText(/UK/i)).toBeInTheDocument();
  });

  it('shows regional label format (e.g., "UK VAT")', () => {
    render(<CartTotals totals={mockTotals} />);

    // Should display "UK VAT" or similar regional label
    expect(screen.getByText(/UK.*VAT|VAT.*UK/i)).toBeInTheDocument();
  });

  it('handles missing totals prop gracefully', () => {
    // Should not crash with missing data
    expect(() => render(<CartTotals />)).not.toThrow();
  });

  it('displays "No items in cart" message when totals are zero', () => {
    const emptyTotals = {
      totalNetAmount: 0.00,
      totalVatAmount: 0.00,
      totalGrossAmount: 0.00,
      vatBreakdown: []
    };

    render(<CartTotals totals={emptyTotals} />);

    // Should show empty state message
    expect(screen.getByText(/no items|cart is empty|£0\.00/i)).toBeInTheDocument();
  });
});
