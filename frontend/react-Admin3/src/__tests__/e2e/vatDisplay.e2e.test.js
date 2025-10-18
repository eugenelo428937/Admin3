/**
 * Phase 8 VAT Display - End-to-End Tests
 *
 * Comprehensive E2E tests verifying dynamic VAT display across all frontend components
 * for different regions (UK, SA, EU, ROW) and scenarios.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// Mock components for E2E testing
import CartSummaryPanel from '../../components/Ordering/CheckoutSteps/CartSummaryPanel';
import CartReviewStep from '../../components/Ordering/CheckoutSteps/CartReviewStep';
import MaterialProductCard from '../../components/Product/ProductCard/MaterialProductCard';

describe('Phase 8 VAT Display - End-to-End', () => {
  beforeEach(() => {
    // Mock API responses
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CartSummaryPanel - VAT Display', () => {
    test('UK user sees 20% VAT throughout cart', async () => {
      const mockCartData = {
        items: [
          {
            id: 1,
            product_name: 'Printed Material',
            subject_code: 'CS1',
            variation_name: 'Printed',
            actual_price: 100.00,
            quantity: 1
          }
        ],
        vatCalculations: {
          totals: {
            subtotal: 100.00,
            total_net: 100.00,
            total_vat: 20.00,
            total_gross: 120.00,
            effective_vat_rate: 0.20
          },
          region_info: {
            region: 'UK'
          }
        }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartData.items}
          vatCalculations={mockCartData.vatCalculations}
          paymentMethod="card"
        />
      );

      // Should display dynamic VAT (20%)
      await waitFor(() => {
        expect(screen.getByText(/120\.00/)).toBeInTheDocument();
      });
    });

    test('SA user sees 15% VAT', async () => {
      const mockCartData = {
        items: [
          {
            id: 1,
            product_name: 'Product',
            subject_code: 'CS1',
            variation_name: 'Standard',
            actual_price: 100.00,
            quantity: 1
          }
        ],
        vatCalculations: {
          totals: {
            subtotal: 100.00,
            total_net: 100.00,
            total_vat: 15.00,
            total_gross: 115.00,
            effective_vat_rate: 0.15
          },
          region_info: {
            region: 'SA'
          }
        }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartData.items}
          vatCalculations={mockCartData.vatCalculations}
          paymentMethod="card"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/115\.00/)).toBeInTheDocument();
      });
    });

    test('EU user sees 0% VAT with reverse charge', async () => {
      const mockCartData = {
        items: [
          {
            id: 1,
            product_name: 'Product',
            subject_code: 'CS1',
            variation_name: 'Standard',
            actual_price: 100.00,
            quantity: 1
          }
        ],
        vatCalculations: {
          totals: {
            subtotal: 100.00,
            total_net: 100.00,
            total_vat: 0.00,
            total_gross: 100.00,
            effective_vat_rate: 0.00
          },
          region_info: {
            region: 'EU'
          },
          exemption_reason: 'B2B reverse charge applies'
        }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartData.items}
          vatCalculations={mockCartData.vatCalculations}
          paymentMethod="card"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/100\.00/)).toBeInTheDocument();
      });
    });

    test('handles missing vatCalculations gracefully', () => {
      const mockCartData = {
        items: [
          {
            id: 1,
            product_name: 'Product',
            subject_code: 'CS1',
            variation_name: 'Standard',
            actual_price: 100.00,
            quantity: 1
          }
        ]
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartData.items}
          vatCalculations={null}
          paymentMethod="card"
        />
      );

      // Should still render without errors
      expect(screen.getByText(/1 items/)).toBeInTheDocument();
    });
  });

  describe('CartReviewStep - VAT Display', () => {
    test('displays dynamic UK VAT (20%) in checkout review', async () => {
      const mockProps = {
        cartItems: [
          {
            id: 1,
            product_name: 'Printed Material',
            subject_code: 'CS1',
            variation_name: 'Printed',
            actual_price: 100.00,
            quantity: 1
          }
        ],
        vatCalculations: {
          totals: {
            subtotal: 100.00,
            total_net: 100.00,
            total_vat: 20.00,
            total_gross: 120.00,
            effective_vat_rate: 0.20
          },
          region_info: {
            region: 'UK'
          }
        },
        rulesLoading: false,
        rulesMessages: []
      };

      render(<CartReviewStep {...mockProps} />);

      // Should display VAT (20%)
      await waitFor(() => {
        expect(screen.getByText(/VAT \(20%\)/)).toBeInTheDocument();
        expect(screen.getByText(/20\.00/)).toBeInTheDocument();
      });
    });

    test('displays SA VAT (15%) in checkout review', async () => {
      const mockProps = {
        cartItems: [
          {
            id: 1,
            product_name: 'Product',
            subject_code: 'CS1',
            variation_name: 'Standard',
            actual_price: 100.00,
            quantity: 1
          }
        ],
        vatCalculations: {
          totals: {
            subtotal: 100.00,
            total_net: 100.00,
            total_vat: 15.00,
            total_gross: 115.00,
            effective_vat_rate: 0.15
          },
          region_info: {
            region: 'SA'
          }
        },
        rulesLoading: false,
        rulesMessages: []
      };

      render(<CartReviewStep {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/VAT \(15%\)/)).toBeInTheDocument();
        expect(screen.getByText(/15\.00/)).toBeInTheDocument();
      });
    });

    test('displays 0% VAT for EU with reverse charge message', async () => {
      const mockProps = {
        cartItems: [
          {
            id: 1,
            product_name: 'Product',
            subject_code: 'CS1',
            variation_name: 'Standard',
            actual_price: 100.00,
            quantity: 1
          }
        ],
        vatCalculations: {
          totals: {
            subtotal: 100.00,
            total_net: 100.00,
            total_vat: 0.00,
            total_gross: 100.00,
            effective_vat_rate: 0.00
          },
          region_info: {
            region: 'EU'
          },
          exemption_reason: 'B2B reverse charge applies'
        },
        rulesLoading: false,
        rulesMessages: []
      };

      render(<CartReviewStep {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/VAT \(0%\)/)).toBeInTheDocument();
      });
    });
  });

  describe('ProductCard - VAT Status Display', () => {
    test('displays dynamic VAT status from product API data', () => {
      const mockProduct = {
        id: 1,
        product_id: 'prod_123',
        product_name: 'CS1 Material',
        subject_code: 'CS1',
        code: 'CS1-PRINTED-2025',
        vat_status: 'included',
        vat_status_display: 'Price includes VAT',
        variations: [
          {
            id: 1,
            name: 'Printed',
            code: 'PRINTED',
            prices: [
              {
                price_type: 'standard',
                amount: 120.00
              }
            ]
          }
        ]
      };

      render(
        <MaterialProductCard
          product={mockProduct}
          onAddToCart={jest.fn()}
        />
      );

      // Should display dynamic VAT status
      expect(screen.getByText(/Price includes VAT/)).toBeInTheDocument();
    });

    test('displays VAT exempt for digital products', () => {
      const mockProduct = {
        id: 2,
        product_id: 'prod_456',
        product_name: 'eBook Material',
        subject_code: 'CS1',
        code: 'CS1-EBOOK-2025',
        vat_status: 'exempt',
        vat_status_display: 'VAT exempt',
        variations: [
          {
            id: 2,
            name: 'eBook',
            code: 'EBOOK',
            prices: [
              {
                price_type: 'standard',
                amount: 50.00
              }
            ]
          }
        ]
      };

      render(
        <MaterialProductCard
          product={mockProduct}
          onAddToCart={jest.fn()}
        />
      );

      expect(screen.getByText(/VAT exempt/)).toBeInTheDocument();
    });

    test('handles missing VAT status gracefully', () => {
      const mockProduct = {
        id: 3,
        product_id: 'prod_789',
        product_name: 'Legacy Product',
        subject_code: 'CS1',
        code: 'CS1-LEGACY-2025',
        variations: [
          {
            id: 3,
            name: 'Standard',
            code: 'STANDARD',
            prices: [
              {
                price_type: 'standard',
                amount: 100.00
              }
            ]
          }
        ]
      };

      render(
        <MaterialProductCard
          product={mockProduct}
          onAddToCart={jest.fn()}
        />
      );

      // Should render without VAT status if missing
      expect(screen.getByText(/CS1 Material|Legacy Product/)).toBeInTheDocument();
    });
  });

  describe('Multi-region VAT Scenarios', () => {
    test('ROW user sees 0% VAT (no VAT charged)', async () => {
      const mockCartData = {
        items: [
          {
            id: 1,
            product_name: 'Product',
            subject_code: 'CS1',
            variation_name: 'Standard',
            actual_price: 100.00,
            quantity: 1
          }
        ],
        vatCalculations: {
          totals: {
            subtotal: 100.00,
            total_net: 100.00,
            total_vat: 0.00,
            total_gross: 100.00,
            effective_vat_rate: 0.00
          },
          region_info: {
            region: 'ROW'
          }
        }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartData.items}
          vatCalculations={mockCartData.vatCalculations}
          paymentMethod="card"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/100\.00/)).toBeInTheDocument();
      });
    });

    test('handles mixed VAT rates for different product types', async () => {
      const mockProps = {
        cartItems: [
          {
            id: 1,
            product_name: 'Printed Material',
            subject_code: 'CS1',
            variation_name: 'Printed',
            actual_price: 100.00,
            quantity: 1,
            vat_rate: 0.20
          },
          {
            id: 2,
            product_name: 'eBook Material',
            subject_code: 'CS1',
            variation_name: 'eBook',
            actual_price: 50.00,
            quantity: 1,
            vat_rate: 0.00
          }
        ],
        vatCalculations: {
          totals: {
            subtotal: 150.00,
            total_net: 150.00,
            total_vat: 20.00,
            total_gross: 170.00,
            effective_vat_rate: 0.133 // Blended rate
          },
          region_info: {
            region: 'UK'
          },
          items: [
            {
              item_id: 1,
              net: 100.00,
              vat: 20.00,
              gross: 120.00,
              vat_rate: 0.20
            },
            {
              item_id: 2,
              net: 50.00,
              vat: 0.00,
              gross: 50.00,
              vat_rate: 0.00
            }
          ]
        },
        rulesLoading: false,
        rulesMessages: []
      };

      render(<CartReviewStep {...mockProps} />);

      // Should display blended VAT rate
      await waitFor(() => {
        expect(screen.getByText(/VAT \(13%\)/)).toBeInTheDocument();
        expect(screen.getByText(/20\.00/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles null vatCalculations gracefully', () => {
      const mockProps = {
        cartItems: [
          {
            id: 1,
            product_name: 'Product',
            subject_code: 'CS1',
            variation_name: 'Standard',
            actual_price: 100.00,
            quantity: 1
          }
        ],
        vatCalculations: null,
        rulesLoading: false,
        rulesMessages: []
      };

      render(<CartReviewStep {...mockProps} />);

      // Should render without errors
      expect(screen.getByText(/Review Your Cart/)).toBeInTheDocument();
    });

    test('handles undefined effective_vat_rate', () => {
      const mockCartData = {
        items: [
          {
            id: 1,
            product_name: 'Product',
            subject_code: 'CS1',
            variation_name: 'Standard',
            actual_price: 100.00,
            quantity: 1
          }
        ],
        vatCalculations: {
          totals: {
            subtotal: 100.00,
            total_net: 100.00,
            total_vat: 0.00,
            total_gross: 100.00
            // effective_vat_rate is missing
          },
          region_info: {
            region: 'UK'
          }
        }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartData.items}
          vatCalculations={mockCartData.vatCalculations}
          paymentMethod="card"
        />
      );

      // Should render without errors
      expect(screen.getByText(/1 items/)).toBeInTheDocument();
    });

    test('handles malformed vatCalculations structure', () => {
      const mockCartData = {
        items: [
          {
            id: 1,
            product_name: 'Product',
            subject_code: 'CS1',
            variation_name: 'Standard',
            actual_price: 100.00,
            quantity: 1
          }
        ],
        vatCalculations: {
          // Missing 'totals' object
          region_info: {
            region: 'UK'
          }
        }
      };

      render(
        <CartSummaryPanel
          cartItems={mockCartData.items}
          vatCalculations={mockCartData.vatCalculations}
          paymentMethod="card"
        />
      );

      // Should render without crashing
      expect(screen.getByText(/1 items/)).toBeInTheDocument();
    });
  });

  describe('Integration - Full Checkout Flow', () => {
    test('VAT persists correctly throughout checkout flow', async () => {
      const mockCartData = {
        items: [
          {
            id: 1,
            product_name: 'Printed Material',
            subject_code: 'CS1',
            variation_name: 'Printed',
            actual_price: 100.00,
            quantity: 1
          }
        ],
        vatCalculations: {
          totals: {
            subtotal: 100.00,
            total_net: 100.00,
            total_vat: 20.00,
            total_gross: 120.00,
            effective_vat_rate: 0.20
          },
          region_info: {
            region: 'UK'
          }
        }
      };

      // Step 1: Cart Summary
      const { unmount: unmountSummary } = render(
        <CartSummaryPanel
          cartItems={mockCartData.items}
          vatCalculations={mockCartData.vatCalculations}
          paymentMethod="card"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/120\.00/)).toBeInTheDocument();
      });

      unmountSummary();

      // Step 2: Cart Review
      render(
        <CartReviewStep
          cartItems={mockCartData.items}
          vatCalculations={mockCartData.vatCalculations}
          rulesLoading={false}
          rulesMessages={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/VAT \(20%\)/)).toBeInTheDocument();
        expect(screen.getByText(/20\.00/)).toBeInTheDocument();
        expect(screen.getByText(/120\.00/)).toBeInTheDocument();
      });
    });
  });
});
