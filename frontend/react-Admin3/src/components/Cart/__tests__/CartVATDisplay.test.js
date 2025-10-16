/**
 * Test suite for CartVATDisplay component (Phase 4, Task T037)
 *
 * Tests VAT display rendering:
 * - VAT-exclusive pricing (net prominent)
 * - VAT as separate line below net
 * - VAT rate percentage display (e.g., "20%")
 * - Regional label (e.g., "UK VAT")
 * - Currency formatting
 *
 * TDD RED Phase: These tests should fail until component is implemented
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartVATDisplay from '../CartVATDisplay';

describe('CartVATDisplay Component', () => {
  const mockVATData = {
    netAmount: 100.00,
    vatAmount: 20.00,
    grossAmount: 120.00,
    vatRate: 0.2000,
    vatRegion: 'UK'
  };

  it('renders net amount prominently', () => {
    render(<CartVATDisplay {...mockVATData} />);

    // Net amount should be displayed
    expect(screen.getByText(/£100\.00/)).toBeInTheDocument();

    // Should be in a prominent variant (h6 or similar)
    const netElement = screen.getByText(/£100\.00/).closest('[class*="MuiTypography-h6"]');
    expect(netElement).toBeInTheDocument();
  });

  it('shows VAT as separate line below net price', () => {
    render(<CartVATDisplay {...mockVATData} />);

    // VAT amount should be displayed
    expect(screen.getByText(/£20\.00/)).toBeInTheDocument();

    // Should mention "VAT" in the label (may appear multiple times)
    expect(screen.getAllByText(/VAT/i).length).toBeGreaterThan(0);
  });

  it('displays VAT rate percentage with badge', () => {
    render(<CartVATDisplay {...mockVATData} />);

    // Rate should be displayed as percentage
    expect(screen.getByText(/20%/)).toBeInTheDocument();

    // Should be in a Chip/Badge component
    const rateChip = screen.getByText(/20%/).closest('[class*="MuiChip"]');
    expect(rateChip).toBeInTheDocument();
  });

  it('shows regional VAT label (UK VAT)', () => {
    render(<CartVATDisplay {...mockVATData} />);

    // Should display region-specific VAT label
    expect(screen.getByText(/UK VAT/i)).toBeInTheDocument();
  });

  it('displays gross total prominently', () => {
    render(<CartVATDisplay {...mockVATData} />);

    // Gross total should be displayed
    expect(screen.getByText(/£120\.00/)).toBeInTheDocument();

    // Should be in a prominent variant (h5 or bold)
    const grossElement = screen.getByText(/£120\.00/).closest('[class*="MuiTypography-h5"]');
    expect(grossElement).toBeInTheDocument();
  });

  it('formats currency correctly with GBP symbol', () => {
    render(<CartVATDisplay {...mockVATData} currency="GBP" />);

    // All amounts should have £ symbol
    const amounts = screen.getAllByText(/£/);
    expect(amounts.length).toBeGreaterThanOrEqual(3); // net, VAT, gross
  });

  it('formats currency correctly with USD symbol', () => {
    const usdData = {
      ...mockVATData,
      currency: 'USD'
    };

    render(<CartVATDisplay {...usdData} />);

    // All amounts should have $ symbol
    const amounts = screen.getAllByText(/\$/);
    expect(amounts.length).toBeGreaterThanOrEqual(3); // net, VAT, gross
  });

  it('formats currency correctly with ZAR symbol', () => {
    const zarData = {
      netAmount: 1100.00,
      vatAmount: 165.00,
      grossAmount: 1265.00,
      vatRate: 0.1500,
      vatRegion: 'SA',
      currency: 'ZAR'
    };

    render(<CartVATDisplay {...zarData} />);

    // All amounts should have R symbol (check for presence of R and amounts)
    const allText = screen.getByText(/R1,100\.00|R1100\.00/).textContent;
    expect(allText).toContain('R');
    expect(screen.getByText(/R165\.00/)).toBeInTheDocument();
    expect(screen.getByText(/R1,265\.00|R1265\.00/)).toBeInTheDocument();
  });

  it('handles zero VAT (ROW region) gracefully', () => {
    const rowData = {
      netAmount: 100.00,
      vatAmount: 0.00,
      grossAmount: 100.00,
      vatRate: 0.0000,
      vatRegion: 'ROW'
    };

    render(<CartVATDisplay {...rowData} />);

    // Should still display all amounts (£100.00 appears twice: net and gross)
    const amounts = screen.getAllByText(/£100\.00/);
    expect(amounts.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText(/£0\.00/)).toBeInTheDocument();

    // Rate should be 0%
    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it('displays SA VAT rate correctly (15%)', () => {
    const saData = {
      netAmount: 500.00,
      vatAmount: 75.00,
      grossAmount: 575.00,
      vatRate: 0.1500,
      vatRegion: 'SA'
    };

    render(<CartVATDisplay {...saData} />);

    // Should display 15% rate
    expect(screen.getByText(/15%/)).toBeInTheDocument();

    // Should display SA VAT label
    expect(screen.getByText(/SA VAT/i)).toBeInTheDocument();
  });

  it('displays IE VAT rate correctly (23%)', () => {
    const ieData = {
      netAmount: 100.00,
      vatAmount: 23.00,
      grossAmount: 123.00,
      vatRate: 0.2300,
      vatRegion: 'IE'
    };

    render(<CartVATDisplay {...ieData} />);

    // Should display 23% rate
    expect(screen.getByText(/23%/)).toBeInTheDocument();

    // Should display IE VAT label
    expect(screen.getByText(/IE VAT/i)).toBeInTheDocument();
  });

  it('aligns text correctly (left alignment)', () => {
    const { container } = render(<CartVATDisplay {...mockVATData} />);

    // Container should have left text alignment
    const displayContainer = container.firstChild;
    expect(displayContainer).toHaveStyle({ textAlign: 'left' });
  });

  it('uses secondary color for VAT line', () => {
    render(<CartVATDisplay {...mockVATData} />);

    // VAT amount should use secondary color (body2 variant)
    const vatElement = screen.getByText(/£20\.00/).closest('[class*="MuiTypography-body2"]');
    expect(vatElement).toBeInTheDocument();
  });

  it('handles missing vatRegion gracefully', () => {
    const incompleteData = {
      netAmount: 100.00,
      vatAmount: 20.00,
      grossAmount: 120.00,
      vatRate: 0.2000,
      vatRegion: null
    };

    // Should not crash
    expect(() => render(<CartVATDisplay {...incompleteData} />)).not.toThrow();
  });

  it('rounds decimal values to 2 places', () => {
    const precisionData = {
      netAmount: 100.333,
      vatAmount: 20.667,
      grossAmount: 121.00,
      vatRate: 0.2000,
      vatRegion: 'UK'
    };

    render(<CartVATDisplay {...precisionData} />);

    // Should display rounded values
    expect(screen.getByText(/£100\.33/)).toBeInTheDocument();
    expect(screen.getByText(/£20\.67/)).toBeInTheDocument();
  });

  it('applies custom className if provided', () => {
    const { container } = render(
      <CartVATDisplay {...mockVATData} className="custom-vat-display" />
    );

    // Container should have custom class
    expect(container.firstChild).toHaveClass('custom-vat-display');
  });
});
