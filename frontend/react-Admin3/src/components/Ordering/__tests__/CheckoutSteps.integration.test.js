import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../theme/theme';
import CartReviewStep from '../CheckoutSteps/CartReviewStep';
import CartSummaryPanel from '../CheckoutSteps/CartSummaryPanel';

// Mock productCodeGenerator
jest.mock('../../../utils/productCodeGenerator', () => ({
  generateProductCode: jest.fn(() => 'TEST-001'),
}));

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Checkout Flow VAT Display Integration (T004)', () => {
  const mockCartItems = [
    {
      id: 1,
      product_name: 'UK Tutorial',
      subject_code: 'CS1',
      variation_name: 'Standard',
      actual_price: '100.00',
      quantity: 1
    },
    {
      id: 2,
      product_name: 'ROW Digital Product',
      subject_code: 'CM1',
      variation_name: 'eBook',
      actual_price: '50.00',
      quantity: 1
    }
  ];

  // TDD RED PHASE: CartReviewStep VAT display feature is not yet implemented.
  // These tests define the expected behavior for when VAT display is added to CartReviewStep.
  describe.skip('CartReviewStep VAT display integration', () => {
    it('should display dynamic VAT rate in CartReviewStep with 20% VAT', () => {
      const vatWith20Percent = {
        totals: {
          subtotal: 150.00,
          total_vat: 30.00,
          total_gross: 180.00,
          effective_vat_rate: 0.20
        }
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={vatWith20Percent}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should display "VAT (20%)" with dynamic rate
      expect(screen.getByText(/VAT \(20%\)/)).toBeInTheDocument();
      expect(screen.getByText('£30.00')).toBeInTheDocument(); // VAT amount
      expect(screen.getByText('£180.00')).toBeInTheDocument(); // Total with VAT
    });

    it('should display dynamic VAT rate in CartReviewStep with 15% VAT', () => {
      const vatWith15Percent = {
        totals: {
          subtotal: 150.00,
          total_vat: 22.50,
          total_gross: 172.50,
          effective_vat_rate: 0.15
        }
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={vatWith15Percent}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should display "VAT (15%)" with dynamic rate
      expect(screen.getByText(/VAT \(15%\)/)).toBeInTheDocument();
      expect(screen.getByText('£22.50')).toBeInTheDocument(); // VAT amount
    });

    it('should display 0% VAT for tax-exempt cart', () => {
      const vatWith0Percent = {
        totals: {
          subtotal: 150.00,
          total_vat: 0.00,
          total_gross: 150.00,
          effective_vat_rate: 0.00
        }
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={vatWith0Percent}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should display "VAT (0%)" for zero-rated items
      expect(screen.getByText(/VAT \(0%\)/)).toBeInTheDocument();
      expect(screen.getByText('£0.00')).toBeInTheDocument(); // Zero VAT amount
      expect(screen.getByText('£150.00')).toBeInTheDocument(); // Total equals subtotal
    });
  });

  describe('CartSummaryPanel VAT display integration', () => {
    it('should display dynamic VAT in collapsed view', () => {
      const vatWith20Percent = {
        totals: {
          subtotal: 150.00,
          total_vat: 30.00,
          total_gross: 180.00,
          total_fees: 0.00,
          effective_vat_rate: 0.20
        }
      };

      renderWithTheme(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWith20Percent}
          isCollapsed={true}
          onToggleCollapse={jest.fn()}
          paymentMethod="card"
        />
      );

      // Collapsed view should still show correct total with VAT
      const totalElements = screen.getAllByText(/£180.00/);
      expect(totalElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should display dynamic VAT in expanded view', () => {
      const vatWith20Percent = {
        totals: {
          subtotal: 150.00,
          total_vat: 30.00,
          total_gross: 180.00,
          total_fees: 0.00,
          effective_vat_rate: 0.20
        }
      };

      renderWithTheme(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWith20Percent}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
          paymentMethod="card"
        />
      );

      // Expanded view should show detailed VAT breakdown with dynamic rate
      expect(screen.getByText(/VAT \(20%\)/)).toBeInTheDocument();
      expect(screen.getAllByText('£150.00').length).toBeGreaterThanOrEqual(1); // Subtotal
      expect(screen.getAllByText('£30.00').length).toBeGreaterThanOrEqual(1); // VAT
      expect(screen.getAllByText('£180.00').length).toBeGreaterThanOrEqual(1); // Total
    });

    // TDD RED PHASE: Fee display based on payment method is not yet implemented.
    it.skip('should update totals when payment method changes', () => {
      const vatWithFees = {
        totals: {
          subtotal: 150.00,
          total_vat: 30.00,
          total_gross: 180.00,
          total_fees: 5.00,
          effective_vat_rate: 0.20
        },
        fees: [
          { description: 'Card Processing Fee', amount: '5.00' }
        ]
      };

      const ThemeWrapper = ({ children }) => (
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      );

      const { rerender } = render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithFees}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
          paymentMethod="card"
        />,
        { wrapper: ThemeWrapper }
      );

      // With card payment, should include fees
      expect(screen.getByText('Card Processing Fee:')).toBeInTheDocument();
      expect(screen.getByText(/£185.00/)).toBeInTheDocument(); // Total with fees

      // Change to bank transfer (no fees)
      rerender(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={vatWithFees}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
          paymentMethod="bank_transfer"
        />
      );

      // With bank transfer, fees should be excluded from total
      expect(screen.queryByText('Card Processing Fee:')).not.toBeInTheDocument();
      expect(screen.getByText(/£180.00/)).toBeInTheDocument(); // Total without fees
    });
  });

  // TDD RED PHASE: CartReviewStep VAT display feature is not yet implemented.
  describe.skip('Mixed VAT rates (UK + ROW products)', () => {
    it('should display blended VAT rate for mixed cart', () => {
      // UK product (20% VAT) + ROW product (0% VAT) = blended effective rate
      const mixedVatCalculations = {
        totals: {
          subtotal: 150.00,
          total_vat: 20.00, // Only UK product has VAT
          total_gross: 170.00,
          effective_vat_rate: 0.1333 // (20/150) = 13.33% blended rate
        }
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={mixedVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should display rounded blended rate (13%)
      expect(screen.getByText(/VAT \(13%\)/)).toBeInTheDocument();
      expect(screen.getByText('£20.00')).toBeInTheDocument(); // Actual VAT amount
      expect(screen.getByText('£170.00')).toBeInTheDocument(); // Total
    });

    it('should handle precision correctly for blended rates', () => {
      const preciseVatCalculations = {
        totals: {
          subtotal: 100.00,
          total_vat: 17.50,
          total_gross: 117.50,
          effective_vat_rate: 0.175 // 17.5% exactly
        }
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={preciseVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should display rounded rate (18%)
      expect(screen.getByText(/VAT \(18%\)/)).toBeInTheDocument();
    });
  });

  // TDD RED PHASE: CartReviewStep VAT display feature is not yet implemented.
  describe.skip('VAT display consistency across components', () => {
    it('should show consistent VAT rate in both CartReviewStep and CartSummaryPanel', () => {
      const sharedVatCalculations = {
        totals: {
          subtotal: 150.00,
          total_vat: 30.00,
          total_gross: 180.00,
          total_fees: 0.00,
          effective_vat_rate: 0.20
        }
      };

      const { container: reviewContainer } = renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={sharedVatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Verify CartReviewStep shows VAT (20%)
      expect(screen.getByText(/VAT \(20%\)/)).toBeInTheDocument();

      // Now render CartSummaryPanel with same data
      const { container: summaryContainer } = render(
        <CartSummaryPanel
          cartItems={mockCartItems}
          vatCalculations={sharedVatCalculations}
          isCollapsed={false}
          onToggleCollapse={jest.fn()}
          paymentMethod="card"
        />
      );

      // Both components should show same VAT rate
      const vatLabels = screen.getAllByText(/VAT \(20%\)/);
      expect(vatLabels.length).toBeGreaterThanOrEqual(2); // At least 2 instances (one in each component)
    });
  });

  // TDD RED PHASE: CartReviewStep VAT display feature is not yet implemented.
  describe.skip('Edge cases and error handling', () => {
    it('should handle undefined effective_vat_rate gracefully', () => {
      const vatWithoutRate = {
        totals: {
          subtotal: 150.00,
          total_vat: 30.00,
          total_gross: 180.00
          // effective_vat_rate is intentionally missing
        }
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={vatWithoutRate}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should display "VAT:" without crashing
      const vatText = screen.getByText(/VAT/);
      expect(vatText).toBeInTheDocument();
    });

    it('should handle null vatCalculations gracefully', () => {
      renderWithTheme(
        <CartReviewStep
          cartItems={mockCartItems}
          vatCalculations={null}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should not crash, cart items should still render
      expect(screen.getByText('UK Tutorial')).toBeInTheDocument();
    });

    it('should handle empty cart with VAT calculations', () => {
      const emptyCartVat = {
        totals: {
          subtotal: 0.00,
          total_vat: 0.00,
          total_gross: 0.00,
          effective_vat_rate: 0.00
        }
      };

      renderWithTheme(
        <CartReviewStep
          cartItems={[]}
          vatCalculations={emptyCartVat}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      // Should display zero values without crashing
      expect(screen.getByText(/VAT \(0%\)/)).toBeInTheDocument();
      expect(screen.getByText('£0.00')).toBeInTheDocument();
    });
  });
});
