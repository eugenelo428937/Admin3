import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import MarkingProductCard from '../MarkingProductCard';
import productService from '../../../../services/productService';

// Mock productService
jest.mock('../../../../services/productService', () => ({
  __esModule: true,
  default: {
    getMarkingDeadlines: jest.fn()
  }
}));

// Mock useCart
const mockCartData = {
  vat_calculations: {
    region_info: {
      region: 'UK'
    }
  }
};

jest.mock('../../../../contexts/CartContext', () => ({
  useCart: () => ({
    cartData: mockCartData
  })
}));

// Create theme with required palette
const theme = createTheme({
  palette: {
    bpp: {
      pink: {
        '040': '#e91e63',
        '060': '#c2185b'
      }
    }
  }
});

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MarkingProductCard', () => {
  const mockProduct = {
    id: 1,
    essp_id: 'ESSP001',
    product_code: 'MARK-CM2',
    product_name: 'CM2 Marking',
    subject_code: 'CM2',
    type: 'Marking',
    vat_status_display: 'Price excludes VAT',
    variations: [
      {
        id: 'var-1',
        name: 'Standard Marking',
        variation_type: 'marking',
        prices: [
          { price_type: 'standard', amount: 150.00 },
          { price_type: 'retaker', amount: 120.00 },
          { price_type: 'additional', amount: 100.00 }
        ]
      }
    ]
  };

  const mockProductWithRecommendation = {
    ...mockProduct,
    variations: [
      {
        id: 'var-1',
        name: 'Standard Marking',
        variation_type: 'marking',
        prices: [
          { price_type: 'standard', amount: 150.00 },
          { price_type: 'retaker', amount: 120.00 }
        ],
        recommended_product: {
          essp_id: 'ESSP-MAT-001',
          esspv_id: 'ESSPV-MAT-001',
          product_code: 'MAT-CM2',
          product_name: 'CM2 Study Material',
          product_short_name: 'CM2 Material',
          variation_type: 'Printed',
          prices: [
            { price_type: 'standard', amount: 89.00 }
          ]
        }
      }
    ]
  };

  const mockOnAddToCart = jest.fn();

  // Helper to create deadline dates
  const createFutureDate = (daysFromNow) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString();
  };

  const createPastDate = (daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  };

  const mockUpcomingDeadlines = [
    {
      name: 'Submission 1',
      deadline: createFutureDate(30),
      recommended_submit_date: createFutureDate(20)
    },
    {
      name: 'Submission 2',
      deadline: createFutureDate(60),
      recommended_submit_date: createFutureDate(50)
    }
  ];

  const mockExpiredDeadlines = [
    {
      name: 'Submission 1',
      deadline: createPastDate(10),
      recommended_submit_date: createPastDate(20)
    },
    {
      name: 'Submission 2',
      deadline: createPastDate(5),
      recommended_submit_date: createPastDate(15)
    }
  ];

  const mockMixedDeadlines = [
    {
      name: 'Expired Submission',
      deadline: createPastDate(5),
      recommended_submit_date: createPastDate(15)
    },
    {
      name: 'Upcoming Submission',
      deadline: createFutureDate(30),
      recommended_submit_date: createFutureDate(20)
    }
  ];

  const mockSoonDeadlines = [
    {
      name: 'Soon Submission',
      deadline: createFutureDate(3), // Within 7 days
      recommended_submit_date: createFutureDate(1)
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    productService.getMarkingDeadlines.mockResolvedValue([]);
  });

  describe('Basic Rendering', () => {
    test('should render product name and subject code', () => {
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      expect(screen.getByText('CM2 Marking')).toBeInTheDocument();
      expect(screen.getByText('CM2')).toBeInTheDocument();
    });

    test('should render session badge', () => {
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      expect(screen.getByText('25S')).toBeInTheDocument();
    });

    test('should render marking avatar icon', () => {
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      expect(screen.getByTestId('RuleOutlinedIcon')).toBeInTheDocument();
    });

    test('should render discount options section', () => {
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      expect(screen.getByText('Discount Options')).toBeInTheDocument();
      expect(screen.getByText('Retaker')).toBeInTheDocument();
      expect(screen.getByText('Additional Copy')).toBeInTheDocument();
    });

    test('should display VAT status', () => {
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      expect(screen.getByText('Price excludes VAT')).toBeInTheDocument();
    });
  });

  describe('Deadline Loading and Display', () => {
    test('should show loading state while deadlines are being fetched', () => {
      // Empty bulkDeadlines triggers loading state
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={{}}
        />
      );

      // Loading state shows "Loading deadlines..." or similar
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('should display deadlines from bulkDeadlines prop', () => {
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      expect(screen.getByText('Number of submissions:')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('should fetch deadlines from API when bulkDeadlines is undefined', async () => {
      productService.getMarkingDeadlines.mockResolvedValue(mockUpcomingDeadlines);

      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={undefined}
        />
      );

      await waitFor(() => {
        expect(productService.getMarkingDeadlines).toHaveBeenCalledWith('ESSP001');
      });
    });

    test('should show "No upcoming deadlines" when deadlines array is empty', () => {
      const bulkDeadlines = { ESSP001: [] };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      expect(screen.getByText('No upcoming deadlines')).toBeInTheDocument();
      expect(screen.getByText('Check back later for new submissions.')).toBeInTheDocument();
    });
  });

  describe('Deadline Scenarios', () => {
    test('should display next deadline date for upcoming deadlines', () => {
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      expect(screen.getByText(/Next deadline:/)).toBeInTheDocument();
    });

    test('should show warning when deadline is within 7 days', () => {
      const bulkDeadlines = { ESSP001: mockSoonDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      // Should show warning with days remaining
      expect(screen.getByText(/Deadline due in \d+ day/)).toBeInTheDocument();
    });

    test('should show error when all deadlines are expired', () => {
      const bulkDeadlines = { ESSP001: mockExpiredDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      expect(screen.getByText('All deadlines expired')).toBeInTheDocument();
      expect(screen.getByText('Consider using Marking Voucher instead.')).toBeInTheDocument();
    });

    test('should show warning when some deadlines are expired', () => {
      const bulkDeadlines = { ESSP001: mockMixedDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      expect(screen.getByText('1/2 deadlines expired')).toBeInTheDocument();
    });

    test('should display submission deadlines button with correct text', () => {
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const button = screen.getByRole('button', { name: /submission deadlines/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('(2 upcoming)');
    });

    test('should show "All Deadlines Expired" button when all expired', () => {
      const bulkDeadlines = { ESSP001: mockExpiredDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      expect(screen.getByRole('button', { name: /all deadlines expired/i })).toBeInTheDocument();
    });
  });

  describe('Deadline Modal', () => {
    test('should open deadline modal when button is clicked', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const deadlinesButton = screen.getByRole('button', { name: /submission deadlines/i });
      await user.click(deadlinesButton);

      expect(screen.getByText('Marking Deadlines')).toBeInTheDocument();
      expect(screen.getByText('Subject:')).toBeInTheDocument();
      expect(screen.getByText('Marking Product:')).toBeInTheDocument();
    });

    test('should display deadline table with correct columns', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const deadlinesButton = screen.getByRole('button', { name: /submission deadlines/i });
      await user.click(deadlinesButton);

      expect(screen.getByText('Recommended Submission Date')).toBeInTheDocument();
      expect(screen.getByText('Deadline')).toBeInTheDocument();
    });

    test('should close deadline modal when close button is clicked', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const deadlinesButton = screen.getByRole('button', { name: /submission deadlines/i });
      await user.click(deadlinesButton);

      expect(screen.getByText('Marking Deadlines')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Marking Deadlines')).not.toBeInTheDocument();
      });
    });

    test('should show add to cart button in deadline modal', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const deadlinesButton = screen.getByRole('button', { name: /submission deadlines/i });
      await user.click(deadlinesButton);

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      expect(addToCartButton).toBeInTheDocument();
    });

    test('should disable add to cart button in modal when all deadlines expired', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockExpiredDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const deadlinesButton = screen.getByRole('button', { name: /all deadlines expired/i });
      await user.click(deadlinesButton);

      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      expect(addToCartButton).toBeDisabled();
    });
  });

  describe('Price Type Selection', () => {
    test('should select retaker price type when radio is clicked', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const retakerRadio = screen.getByRole('radio', { name: /retaker/i });
      await user.click(retakerRadio);

      expect(retakerRadio).toBeChecked();
      expect(screen.getByText('Discount applied')).toBeInTheDocument();
    });

    test('should select additional price type when radio is clicked', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const additionalRadio = screen.getByRole('radio', { name: /additional copy/i });
      await user.click(additionalRadio);

      expect(additionalRadio).toBeChecked();
      expect(screen.getByText('Discount applied')).toBeInTheDocument();
    });

    test('should deselect price type when clicked again', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const retakerRadio = screen.getByRole('radio', { name: /retaker/i });
      await user.click(retakerRadio);
      expect(retakerRadio).toBeChecked();

      await user.click(retakerRadio);
      expect(retakerRadio).not.toBeChecked();
      expect(screen.getByText('Standard pricing')).toBeInTheDocument();
    });

    test('should disable price type radio if not available for variation', () => {
      const productWithLimitedPrices = {
        ...mockProduct,
        variations: [{
          id: 'var-1',
          name: 'Standard Marking',
          variation_type: 'marking',
          prices: [
            { price_type: 'standard', amount: 150.00 }
            // No retaker or additional prices
          ]
        }]
      };

      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={productWithLimitedPrices}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const retakerRadio = screen.getByRole('radio', { name: /retaker/i });
      const additionalRadio = screen.getByRole('radio', { name: /additional copy/i });

      expect(retakerRadio).toBeDisabled();
      expect(additionalRadio).toBeDisabled();
    });
  });

  describe('Price Modal', () => {
    test('should open price modal when info icon is clicked', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      // Find the price info button in card actions area
      const infoIcon = screen.getByTestId('InfoOutlineIcon');
      const infoButton = infoIcon.closest('button');
      await user.click(infoButton);

      expect(screen.getByText('Price Information')).toBeInTheDocument();
    });

    test('should display all price types in price modal', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const infoIcon = screen.getByTestId('InfoOutlineIcon');
      const infoButton = infoIcon.closest('button');
      await user.click(infoButton);

      expect(screen.getByText('standard')).toBeInTheDocument();
      expect(screen.getByText('retaker')).toBeInTheDocument();
      expect(screen.getByText('additional')).toBeInTheDocument();
    });

    test('should display product info in price modal', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const infoIcon = screen.getByTestId('InfoOutlineIcon');
      const infoButton = infoIcon.closest('button');
      await user.click(infoButton);

      expect(screen.getByText(/Subject: CM2/)).toBeInTheDocument();
      expect(screen.getByText(/Product Name: CM2 Marking/)).toBeInTheDocument();
    });

    test('should close price modal when close button is clicked', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const infoIcon = screen.getByTestId('InfoOutlineIcon');
      const infoButton = infoIcon.closest('button');
      await user.click(infoButton);

      expect(screen.getByText('Price Information')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Price Information')).not.toBeInTheDocument();
      });
    });
  });

  describe('Add to Cart', () => {
    test('should call onAddToCart when add to cart button is clicked', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      // Find the add to cart button by its class name in the card actions
      const addToCartButton = document.querySelector('.add-to-cart-button');
      await user.click(addToCartButton);

      expect(mockOnAddToCart).toHaveBeenCalledWith(
        mockProduct,
        expect.objectContaining({
          variationId: 'var-1',
          variationName: 'Standard Marking',
          priceType: 'standard',
          actualPrice: 150.00,
          metadata: expect.objectContaining({
            type: 'marking',
            producttype: 'Marking',
            subjectCode: 'CM2'
          })
        })
      );
    });

    test('should disable add to cart button when all deadlines are expired', () => {
      const bulkDeadlines = { ESSP001: mockExpiredDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const addToCartButton = document.querySelector('.add-to-cart-button');
      expect(addToCartButton).toBeDisabled();
    });

    test('should show expired warning modal when adding product with some expired deadlines', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockMixedDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const addToCartButton = document.querySelector('.add-to-cart-button');
      await user.click(addToCartButton);

      expect(screen.getByText('Warning: Expired Deadlines')).toBeInTheDocument();
      expect(screen.getByText(/This marking product has/)).toBeInTheDocument();
    });

    test('should proceed to add to cart when warning is confirmed', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockMixedDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const addToCartButton = document.querySelector('.add-to-cart-button');
      await user.click(addToCartButton);

      const confirmButton = screen.getByRole('button', { name: /add to cart anyway/i });
      await user.click(confirmButton);

      expect(mockOnAddToCart).toHaveBeenCalled();
    });

    test('should close warning modal when cancel is clicked', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockMixedDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const addToCartButton = document.querySelector('.add-to-cart-button');
      await user.click(addToCartButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Warning: Expired Deadlines')).not.toBeInTheDocument();
      });

      expect(mockOnAddToCart).not.toHaveBeenCalled();
    });
  });

  describe('SpeedDial with Recommended Product', () => {
    test('should render SpeedDial when product has recommended product', () => {
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProductWithRecommendation}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      // SpeedDial has class add-to-cart-speed-dial
      expect(document.querySelector('.add-to-cart-speed-dial')).toBeInTheDocument();
    });

    test('should render standard button when product has no recommended product', () => {
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      // Should not have SpeedDial, should have regular button
      expect(document.querySelector('.add-to-cart-speed-dial')).not.toBeInTheDocument();
      expect(document.querySelector('.add-to-cart-button')).toBeInTheDocument();
    });

    test('should have correct SpeedDial structure', () => {
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProductWithRecommendation}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      // SpeedDial renders with proper structure
      const speedDial = document.querySelector('.add-to-cart-speed-dial');
      expect(speedDial).toBeInTheDocument();

      // Check SpeedDial has a FAB button
      const fab = speedDial.querySelector('button');
      expect(fab).toBeInTheDocument();
    });

    test('should have disabled SpeedDial when all deadlines expired', () => {
      const bulkDeadlines = { ESSP001: mockExpiredDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProductWithRecommendation}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const speedDialFab = document.querySelector('.add-to-cart-speed-dial button');
      expect(speedDialFab).toBeDisabled();
    });
  });

  describe('Hover Effects', () => {
    test('should scale card on hover', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      const { container } = renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const card = container.querySelector('.MuiCard-root');
      expect(card).toHaveStyle({ transform: 'scale(1)' });

      await user.hover(card);

      await waitFor(() => {
        expect(card).toHaveStyle({ transform: 'scale(1.02)' });
      });
    });

    test('should reset scale on mouse leave', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      const { container } = renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const card = container.querySelector('.MuiCard-root');
      await user.hover(card);

      await waitFor(() => {
        expect(card).toHaveStyle({ transform: 'scale(1.02)' });
      });

      await user.unhover(card);

      await waitFor(() => {
        expect(card).toHaveStyle({ transform: 'scale(1)' });
      });
    });
  });

  describe('Multiple Variations', () => {
    test('should auto-select single variation', () => {
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      // Single variation should be auto-selected - verify by successful add to cart
      const addToCartButton = document.querySelector('.add-to-cart-button');
      expect(addToCartButton).not.toBeDisabled();
    });

    test('should disable add to cart when multiple variations exist and none selected', () => {
      const multiVariationProduct = {
        ...mockProduct,
        variations: [
          {
            id: 'var-1',
            name: 'Marking Option A',
            variation_type: 'marking',
            prices: [{ price_type: 'standard', amount: 150.00 }]
          },
          {
            id: 'var-2',
            name: 'Marking Option B',
            variation_type: 'marking',
            prices: [{ price_type: 'standard', amount: 175.00 }]
          }
        ]
      };

      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={multiVariationProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      // When multiple variations exist and none is auto-selected, button should be disabled
      const addToCartButton = document.querySelector('.add-to-cart-button');
      expect(addToCartButton).toBeDisabled();
    });
  });

  describe('Product Without Variations', () => {
    test('should handle product without variations', async () => {
      const user = userEvent.setup();
      const productWithoutVariations = {
        ...mockProduct,
        variations: []
      };

      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={productWithoutVariations}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      const addToCartButton = document.querySelector('.add-to-cart-button');
      await user.click(addToCartButton);

      expect(mockOnAddToCart).toHaveBeenCalledWith(
        productWithoutVariations,
        expect.objectContaining({
          priceType: 'standard',
          metadata: expect.objectContaining({
            type: 'marking'
          })
        })
      );
    });
  });

  describe('Add to Cart from Deadline Modal', () => {
    test('should add to cart from deadline modal', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockUpcomingDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      // Open deadline modal
      const deadlinesButton = screen.getByRole('button', { name: /submission deadlines/i });
      await user.click(deadlinesButton);

      // Click add to cart in modal
      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addToCartButton);

      expect(mockOnAddToCart).toHaveBeenCalled();
    });

    test('should show expired warning from deadline modal when some deadlines expired', async () => {
      const user = userEvent.setup();
      const bulkDeadlines = { ESSP001: mockMixedDeadlines };
      renderWithTheme(
        <MarkingProductCard
          product={mockProduct}
          onAddToCart={mockOnAddToCart}
          bulkDeadlines={bulkDeadlines}
        />
      );

      // Open deadline modal
      const deadlinesButton = screen.getByRole('button', { name: /submission deadlines/i });
      await user.click(deadlinesButton);

      // Click add to cart in modal
      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addToCartButton);

      // Modal should close and warning should appear
      expect(screen.getByText('Warning: Expired Deadlines')).toBeInTheDocument();
    });
  });
});
