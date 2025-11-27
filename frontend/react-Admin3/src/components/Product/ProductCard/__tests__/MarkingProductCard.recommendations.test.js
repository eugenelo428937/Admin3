import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MarkingProductCard from '../MarkingProductCard';
import { useCart } from '../../../../contexts/CartContext';

// Mock the CartContext
jest.mock('../../../../contexts/CartContext', () => ({
  useCart: jest.fn(),
}));

// Create mock functions
const mockGetDeadlines = jest.fn().mockResolvedValue({ data: [] });
const mockGetMarkingDeadlines = jest.fn().mockResolvedValue([]);

// Mock productService
jest.mock('../../../../services/productService', () => ({
  __esModule: true,
  default: {
    getDeadlines: (...args) => mockGetDeadlines(...args),
    getMarkingDeadlines: (...args) => mockGetMarkingDeadlines(...args),
  },
}));

// Create a minimal test theme with the required bpp.sky and bpp.pink palettes
const testTheme = createTheme({
  palette: {
    bpp: {
      sky: {
        "010": "#e5f9ff",
        "020": "#8ae6ff",
        "030": "#2bcbf8",
        "040": "#00abd9",
        "050": "#008ebb",
        "060": "#006f99",
        "070": "#005782",
        "080": "#003d67",
        "090": "#00264e",
        100: "#00141a",
        110: "#23cefd",
      },
      pink: {
        "010": "#ffe5f2",
        "020": "#ffb3d6",
        "030": "#ff80ba",
        "040": "#ff4d9e",
        "050": "#ff1a82",
        "060": "#e60066",
        "070": "#b3004d",
        "080": "#800034",
        "090": "#4d001f",
        100: "#1a000a",
        110: "#ff66a3",
      },
    },
  },
});

describe('MarkingProductCard - Recommended Products with SpeedDial', () => {
  const mockOnAddToCart = jest.fn();
  const mockCartData = {
    vat_calculations: {
      region_info: {
        region: 'UK'
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCart.mockReturnValue({ cartData: mockCartData });
  });

  // Helper to render component with ThemeProvider
  const renderWithTheme = (component) => {
    return render(
      <ThemeProvider theme={testTheme}>
        {component}
      </ThemeProvider>
    );
  };

  // Mock data helper for marking products
  const createMockMarkingProduct = (overrides = {}) => {
    const defaultVariation = {
      id: 1,
      variation_type: 'Standard',
      name: 'Standard Marking',
      description_short: 'Standard Marking',
      prices: [
        { id: 1, price_type: 'standard', amount: '45.00', currency: 'GBP' },
        { id: 2, price_type: 'retaker', amount: '35.00', currency: 'GBP' },
        { id: 3, price_type: 'additional', amount: '40.00', currency: 'GBP' },
      ],
      recommended_product: null,
    };

    const baseProduct = {
      id: 1,
      essp_id: 101,
      product_id: 1001,
      product_code: 'MARK001',
      product_name: 'Mock Exam Marking Service',
      product_short_name: 'Mock Exam Marking',
      subject_code: 'CB1',
      subject_description: 'Business Finance',
      exam_session_code: '2025S1',
      type: 'Marking',
      variations: [defaultVariation],
    };

    // Merge override variations with default variation fields
    if (overrides.variations) {
      overrides.variations = overrides.variations.map((v) => ({
        ...defaultVariation,
        ...v,
      }));
    }

    return { ...baseProduct, ...overrides };
  };

  // Mock data helper for recommended products (typically materials)
  const createRecommendedProduct = () => ({
    essp_id: 202,
    esspv_id: 2002,
    product_code: 'MAT001',
    product_name: 'Mock Exam eBook',
    product_short_name: 'Mock Exam eBook',
    variation_type: 'eBook',
    prices: [
      { id: 10, price_type: 'standard', amount: '16.00', currency: 'GBP' },
    ],
  });

  // Mock data helper for deadlines
  const createMockDeadlines = (expired = false) => {
    const baseDate = expired ? '2024-01-01' : '2025-12-31';
    return [
      {
        name: 'Submission 1',
        deadline: `${baseDate}T00:00:00Z`,
        recommended_submit_date: expired ? '2023-12-15T00:00:00Z' : '2025-12-15T00:00:00Z',
      },
    ];
  };

  describe('SpeedDial Rendering for Recommendations', () => {
    // T002: Test - SpeedDial Renders When Recommendation Exists
    test('should render SpeedDial when recommended_product exists on current variation', async () => {
      const product = createMockMarkingProduct({
        variations: [
          {
            id: 1,
            variation_type: 'Standard',
            name: 'Standard Marking',
            prices: [
              { price_type: 'standard', amount: '45.00' },
              { price_type: 'retaker', amount: '35.00' },
            ],
            recommended_product: createRecommendedProduct(),
          },
        ],
      });

      renderWithTheme(
        <MarkingProductCard
          product={product}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={{ [product.id]: [] }}
        />
      );

      await waitFor(() => {
        const speedDialFab = screen.getByRole('button', { name: /Buy with Recommended/i });
        expect(speedDialFab).toBeInTheDocument();
        expect(speedDialFab).toHaveClass('MuiSpeedDial-fab');
      });
    });

    // T003: Test - SpeedDial Does NOT Render Without Recommendation
    test('should NOT render SpeedDial when recommended_product is null', async () => {
      const product = createMockMarkingProduct({
        variations: [
          {
            id: 1,
            recommended_product: null,
          },
        ],
      });

      renderWithTheme(
        <MarkingProductCard
          product={product}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={{ [product.id]: [] }}
        />
      );

      await waitFor(() => {
        const speedDialFab = screen.queryByRole('button', { name: /Buy with Recommended/i });
        expect(speedDialFab).not.toBeInTheDocument();
      });
    });

    // T004: Test - SpeedDial Opens/Closes on Click
    test('should open SpeedDial when FAB clicked', async () => {
      const product = createMockMarkingProduct({
        variations: [{ recommended_product: createRecommendedProduct() }],
      });

      renderWithTheme(
        <MarkingProductCard
          product={product}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={{ [product.id]: [] }}
        />
      );

      await waitFor(() => {
        const speedDialFab = screen.getByRole('button', { name: /Buy with Recommended/i });
        expect(speedDialFab).toHaveClass('MuiSpeedDial-fab');
        fireEvent.click(speedDialFab);
      });

      await waitFor(() => {
        expect(screen.getByText(/Buy Marking Only/i)).toBeInTheDocument();
        expect(screen.getByText(/Buy with/i)).toBeInTheDocument();
      });
    });

    // T005: Test - Buy Marking Only Calls onAddToCart Once
    test('should call onAddToCart once when "Buy Marking Only" clicked', async () => {
      const product = createMockMarkingProduct({
        variations: [{ recommended_product: createRecommendedProduct() }],
      });

      renderWithTheme(
        <MarkingProductCard
          product={product}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={{ [product.id]: [] }}
        />
      );

      await waitFor(() => {
        const speedDialFab = screen.getByRole('button', { name: /Buy with Recommended/i });
        expect(speedDialFab).toHaveClass('MuiSpeedDial-fab');
        fireEvent.click(speedDialFab);
      });

      await waitFor(() => {
        const buyOnlyButton = screen.getByText(/Buy Marking Only/i);
        fireEvent.click(buyOnlyButton);
      });

      expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
      expect(mockOnAddToCart).toHaveBeenCalledWith(
        product,
        expect.objectContaining({
          priceType: 'standard',
          variationId: 1,
        })
      );
    });

    // T006: Test - Buy with Recommended Calls onAddToCart Twice
    test('should call onAddToCart twice when "Buy with Recommended" clicked', async () => {
      const product = createMockMarkingProduct({
        variations: [{ recommended_product: createRecommendedProduct() }],
      });

      renderWithTheme(
        <MarkingProductCard
          product={product}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={{ [product.id]: [] }}
        />
      );

      await waitFor(() => {
        const speedDialFab = screen.getByRole('button', { name: /Buy with Recommended/i });
        expect(speedDialFab).toHaveClass('MuiSpeedDial-fab');
        fireEvent.click(speedDialFab);
      });

      await waitFor(() => {
        const buyWithButton = screen.getByText(/Buy with/i);
        fireEvent.click(buyWithButton);
      });

      expect(mockOnAddToCart).toHaveBeenCalledTimes(2);

      // First call: Marking product
      expect(mockOnAddToCart).toHaveBeenNthCalledWith(
        1,
        product,
        expect.objectContaining({ priceType: 'standard' })
      );

      // Second call: Recommended product
      expect(mockOnAddToCart).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ id: 202 }), // Recommended product ID
        expect.objectContaining({ priceType: 'standard' })
      );
    });

    // T007: Test - Discount Selection Affects Only Marking Product
    test('should apply discount to marking product only, not recommended product', async () => {
      const product = createMockMarkingProduct({
        variations: [
          {
            id: 1,
            prices: [
              { price_type: 'standard', amount: '45.00' },
              { price_type: 'retaker', amount: '35.00' },
            ],
            recommended_product: createRecommendedProduct(),
          },
        ],
      });

      renderWithTheme(
        <MarkingProductCard
          product={product}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={{ [product.id]: [] }}
        />
      );

      await waitFor(() => {
        // Select "Retaker" discount
        const retakerRadio = screen.getByLabelText(/Retaker/i);
        fireEvent.click(retakerRadio);
      });

      // Purchase with recommendation
      await waitFor(() => {
        const speedDialFab = screen.getByRole('button', { name: /Buy with Recommended/i });
        expect(speedDialFab).toHaveClass('MuiSpeedDial-fab');
        fireEvent.click(speedDialFab);
      });

      await waitFor(() => {
        const buyWithButton = screen.getByText(/Buy with/i);
        fireEvent.click(buyWithButton);
      });

      // Marking product should use "retaker" price
      expect(mockOnAddToCart).toHaveBeenNthCalledWith(
        1,
        product,
        expect.objectContaining({ priceType: 'retaker' })
      );

      // Recommended product should use "standard" price
      expect(mockOnAddToCart).toHaveBeenNthCalledWith(
        2,
        expect.any(Object),
        expect.objectContaining({ priceType: 'standard' })
      );
    });

    // T008: Test - SpeedDial Disabled When All Deadlines Expired
    test('should disable SpeedDial when all deadlines expired', async () => {
      const expiredDeadlines = [
        {
          name: 'Submission 1',
          deadline: '2024-01-01T00:00:00Z',
          recommended_submit_date: '2023-12-15T00:00:00Z',
        },
      ];

      const product = createMockMarkingProduct({
        variations: [{ recommended_product: createRecommendedProduct() }],
      });

      renderWithTheme(
        <MarkingProductCard
          product={product}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={{ [product.id]: expiredDeadlines }}
        />
      );

      // Wait for "All deadlines expired" message to appear (multiple elements, just check one exists)
      await waitFor(() => {
        const expiredMessages = screen.queryAllByText(/All deadlines expired/i);
        expect(expiredMessages.length).toBeGreaterThan(0);
      });

      // Then check if SpeedDial is disabled
      const speedDialFab = screen.getByRole('button', { name: /Buy with Recommended/i });
      expect(speedDialFab).toHaveClass('MuiSpeedDial-fab');
      expect(speedDialFab).toBeDisabled();
    });

    // T009: Test - Tooltips Display Correct Product Names
    test('should display correct product names in tooltips', async () => {
      const recommendedProduct = createRecommendedProduct();
      const product = createMockMarkingProduct({
        variations: [{ recommended_product: recommendedProduct }],
      });

      renderWithTheme(
        <MarkingProductCard
          product={product}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={{ [product.id]: [] }}
        />
      );

      await waitFor(() => {
        const speedDialFab = screen.getByRole('button', { name: /Buy with Recommended/i });
        expect(speedDialFab).toHaveClass('MuiSpeedDial-fab');
        fireEvent.click(speedDialFab);
      });

      await waitFor(() => {
        expect(screen.getByText(/Buy Marking Only/i)).toBeInTheDocument();
        expect(screen.getByText(
          new RegExp(recommendedProduct.product_short_name, 'i')
        )).toBeInTheDocument();
      });
    });
  });
});
