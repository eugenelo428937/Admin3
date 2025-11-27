/**
 * Tests for VATBreakdown Component
 * T018: Test render, calculations, formatting, variants
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import VATBreakdown from '../VATBreakdown';

// Mock vatUtils
jest.mock('../../../utils/vatUtils', () => ({
  formatVatLabel: (rate) => {
    if (rate === 0 || rate === null || rate === undefined) return 'VAT (0%)';
    return `VAT (${rate}%)`;
  },
  formatPrice: (amount) => {
    if (amount === null || amount === undefined) return '£0.00';
    return `£${parseFloat(amount).toFixed(2)}`;
  }
}));

const theme = createTheme();

describe('VATBreakdown', () => {
  const defaultVatCalculations = {
    country_code: 'GB',
    vat_rate: '20',
    totals: {
      subtotal: 100,
      total_vat: 20,
      total_gross: 120,
      effective_vat_rate: 20
    }
  };

  const renderComponent = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <VATBreakdown
          vatCalculations={defaultVatCalculations}
          {...props}
        />
      </ThemeProvider>
    );
  };

  describe('null/empty handling', () => {
    test('returns null when vatCalculations is null', () => {
      const { container } = render(
        <ThemeProvider theme={theme}>
          <VATBreakdown vatCalculations={null} />
        </ThemeProvider>
      );
      expect(container.firstChild).toBeNull();
    });

    test('returns null when vatCalculations is undefined', () => {
      const { container } = render(
        <ThemeProvider theme={theme}>
          <VATBreakdown vatCalculations={undefined} />
        </ThemeProvider>
      );
      expect(container.firstChild).toBeNull();
    });

    test('returns null when totals is missing', () => {
      const { container } = render(
        <ThemeProvider theme={theme}>
          <VATBreakdown vatCalculations={{ country_code: 'GB' }} />
        </ThemeProvider>
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('detailed variant (default)', () => {
    test('renders Order Summary title', () => {
      renderComponent();
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });

    test('renders subtotal', () => {
      renderComponent();
      expect(screen.getByText('Subtotal:')).toBeInTheDocument();
      expect(screen.getByText('£100.00')).toBeInTheDocument();
    });

    test('renders VAT with label', () => {
      renderComponent();
      expect(screen.getByText(/VAT \(20%\)/)).toBeInTheDocument();
      expect(screen.getByText('£20.00')).toBeInTheDocument();
    });

    test('renders country code', () => {
      renderComponent();
      expect(screen.getByText('(GB)')).toBeInTheDocument();
    });

    test('renders total', () => {
      renderComponent();
      expect(screen.getByText('Total:')).toBeInTheDocument();
      expect(screen.getByText('£120.00')).toBeInTheDocument();
    });

    test('renders VAT notice', () => {
      renderComponent();
      expect(screen.getByText(/Prices include VAT at 20%/)).toBeInTheDocument();
    });
  });

  describe('compact variant', () => {
    test('renders single line summary', () => {
      renderComponent({ variant: 'compact' });
      expect(screen.getByText(/Total \(inc\. VAT/)).toBeInTheDocument();
    });

    test('shows total amount', () => {
      renderComponent({ variant: 'compact' });
      expect(screen.getByText('£120.00')).toBeInTheDocument();
    });

    test('does not show subtotal', () => {
      renderComponent({ variant: 'compact' });
      expect(screen.queryByText('Subtotal:')).not.toBeInTheDocument();
    });
  });

  describe('inline variant', () => {
    test('renders subtotal', () => {
      renderComponent({ variant: 'inline' });
      expect(screen.getByText('Subtotal:')).toBeInTheDocument();
    });

    test('renders VAT', () => {
      renderComponent({ variant: 'inline' });
      expect(screen.getByText(/VAT/)).toBeInTheDocument();
    });

    test('renders total', () => {
      renderComponent({ variant: 'inline' });
      expect(screen.getByText('Total:')).toBeInTheDocument();
    });

    test('does not show Order Summary title', () => {
      renderComponent({ variant: 'inline' });
      expect(screen.queryByText('Order Summary')).not.toBeInTheDocument();
    });
  });

  describe('fees', () => {
    const fees = [
      { name: 'Processing Fee', amount: 5, is_refundable: true },
      { name: 'Booking Fee', amount: 3, is_refundable: false }
    ];

    test('renders fees in detailed variant', () => {
      renderComponent({ fees });
      expect(screen.getByText('Processing Fee:')).toBeInTheDocument();
      expect(screen.getByText('£5.00')).toBeInTheDocument();
      expect(screen.getByText('Booking Fee:')).toBeInTheDocument();
      expect(screen.getByText('£3.00')).toBeInTheDocument();
    });

    test('renders non-refundable fee notice', () => {
      renderComponent({ fees });
      expect(screen.getByText('* Non-refundable fees')).toBeInTheDocument();
    });

    test('renders fees in inline variant', () => {
      renderComponent({ fees, variant: 'inline' });
      expect(screen.getByText('Fees:')).toBeInTheDocument();
      expect(screen.getByText('£8.00')).toBeInTheDocument();
    });

    test('calculates total including fees', () => {
      renderComponent({ fees });
      // 120 (gross) + 5 + 3 = 128
      expect(screen.getByText('£128.00')).toBeInTheDocument();
    });
  });

  describe('formatting', () => {
    test('formats subtotal correctly', () => {
      renderComponent({
        vatCalculations: {
          ...defaultVatCalculations,
          totals: { ...defaultVatCalculations.totals, subtotal: 99.99 }
        }
      });
      expect(screen.getByText('£99.99')).toBeInTheDocument();
    });

    test('handles zero values', () => {
      renderComponent({
        vatCalculations: {
          totals: {
            subtotal: 0,
            total_vat: 0,
            total_gross: 0,
            effective_vat_rate: 0
          }
        }
      });
      expect(screen.getByText(/VAT \(0%\)/)).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    test('applies className to detailed variant', () => {
      renderComponent({ className: 'custom-breakdown', variant: 'detailed' });
      expect(document.querySelector('.vat-breakdown-detailed.custom-breakdown')).toBeInTheDocument();
    });

    test('applies className to compact variant', () => {
      renderComponent({ className: 'custom-breakdown', variant: 'compact' });
      expect(document.querySelector('.vat-breakdown-compact.custom-breakdown')).toBeInTheDocument();
    });

    test('applies className to inline variant', () => {
      renderComponent({ className: 'custom-breakdown', variant: 'inline' });
      expect(document.querySelector('.vat-breakdown-inline.custom-breakdown')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    test('handles string amounts', () => {
      renderComponent({
        vatCalculations: {
          totals: {
            subtotal: '100.50',
            total_vat: '20.10',
            total_gross: '120.60',
            effective_vat_rate: 20
          }
        }
      });
      expect(screen.getByText('£100.50')).toBeInTheDocument();
    });

    test('handles missing country code', () => {
      renderComponent({
        vatCalculations: {
          totals: { ...defaultVatCalculations.totals },
          vat_rate: '20'
        }
      });
      // Should still render without error
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });

    test('handles empty fees array', () => {
      renderComponent({ fees: [] });
      // Should not show Fees section
      expect(screen.queryByText('Fees:')).not.toBeInTheDocument();
    });
  });
});
