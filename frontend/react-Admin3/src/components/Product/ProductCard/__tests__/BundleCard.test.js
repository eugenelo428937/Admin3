// src/components/Product/ProductCard/__tests__/BundleCard.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import BundleCard from '../BundleCard';

// Mock bundleService
jest.mock('../../../../services/bundleService', () => ({
  __esModule: true,
  default: {
    getBundleContents: jest.fn(),
    processBundleForCart: jest.fn(),
  },
}));

// Mock CartContext
const mockAddToCart = jest.fn().mockResolvedValue({});
jest.mock('../../../../contexts/CartContext', () => ({
  useCart: () => ({
    addToCart: mockAddToCart,
    cartItems: [],
    cartData: null,
  }),
}));

import bundleService from '../../../../services/bundleService';

const theme = createTheme();

const mockBundle = {
  id: 'bundle-1',
  bundle_name: 'CM2 Study Bundle',
  subject_code: 'CM2',
  exam_session_code: '2024-04',
  components_count: 3,
  vat_status_display: 'Price excludes VAT',
  components: [
    {
      id: 'comp-1',
      name: 'CM2 Course Notes',
      product: { fullname: 'CM2 Course Notes' },
      product_variation: { name: 'Printed', description_short: 'Physical copy' },
      quantity: 1,
      prices: [
        { price_type: 'standard', amount: 50.00 },
        { price_type: 'retaker', amount: 40.00 },
      ],
    },
    {
      id: 'comp-2',
      name: 'CM2 Practice Questions',
      product: { fullname: 'CM2 Practice Questions' },
      product_variation: { name: 'eBook', description_short: 'Digital copy' },
      quantity: 1,
      prices: [
        { price_type: 'standard', amount: 30.00 },
        { price_type: 'retaker', amount: 24.00 },
      ],
    },
    {
      id: 'comp-3',
      name: 'CM2 Summary Notes',
      product: { fullname: 'CM2 Summary Notes' },
      product_variation: { name: 'Printed' },
      quantity: 1,
      prices: [
        { price_type: 'standard', amount: 20.00 },
      ],
    },
  ],
};

const mockBundleContents = {
  total_components: 3,
  components: mockBundle.components,
};

const renderComponent = async (props = {}) => {
  const defaultProps = {
    bundle: mockBundle,
    onAddToCart: jest.fn(),
  };

  let result;
  await act(async () => {
    result = render(
      <ThemeProvider theme={theme}>
        <BundleCard {...defaultProps} {...props} />
      </ThemeProvider>
    );
  });

  // Wait for initial data fetch to complete
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  return result;
};

describe('BundleCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bundleService.getBundleContents.mockResolvedValue({
      success: true,
      data: mockBundleContents,
    });
    bundleService.processBundleForCart.mockResolvedValue({
      success: true,
      cartItems: [],
    });
  });

  describe('rendering', () => {
    test('renders bundle name', async () => {
      await renderComponent();
      expect(screen.getByText('CM2 Study Bundle')).toBeInTheDocument();
    });

    test('renders subject code badge', async () => {
      await renderComponent();
      expect(screen.getByText('CM2')).toBeInTheDocument();
    });

    test('renders exam session badge', async () => {
      await renderComponent();
      expect(screen.getByText('2024-04')).toBeInTheDocument();
    });

    test('renders component count', async () => {
      await renderComponent();
      expect(screen.getByText(/What's included \(3 items\)/i)).toBeInTheDocument();
    });

    test('renders component list', async () => {
      await renderComponent();
      expect(screen.getByText('CM2 Course Notes')).toBeInTheDocument();
      expect(screen.getByText('CM2 Practice Questions')).toBeInTheDocument();
      expect(screen.getByText('CM2 Summary Notes')).toBeInTheDocument();
    });

    test('renders add to cart button', async () => {
      await renderComponent();
      expect(screen.getByRole('button', { name: /add bundle to cart/i })).toBeInTheDocument();
    });

    test('renders discount options', async () => {
      await renderComponent();
      expect(screen.getByText('Discount Options')).toBeInTheDocument();
      expect(screen.getByText('Retaker')).toBeInTheDocument();
      expect(screen.getByText('Additional Copy')).toBeInTheDocument();
    });

    test('renders VAT status', async () => {
      await renderComponent();
      expect(screen.getByText('Price excludes VAT')).toBeInTheDocument();
    });
  });

  describe('pricing', () => {
    test('displays standard bundle price initially', async () => {
      await renderComponent();
      // Standard price: 50 + 30 + 20 = 100
      expect(screen.getByText('£100.00')).toBeInTheDocument();
    });

    test('displays loading indicator while fetching prices', async () => {
      bundleService.getBundleContents.mockReturnValue(new Promise(() => {}));
      // Don't await here since we want to see loading state
      await act(async () => {
        render(
          <ThemeProvider theme={theme}>
            <BundleCard bundle={mockBundle} onAddToCart={jest.fn()} />
          </ThemeProvider>
        );
      });
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('updates price when retaker discount selected', async () => {
      await renderComponent();
      expect(screen.getByText('£100.00')).toBeInTheDocument();

      const retakerRadio = screen.getByLabelText(/Retaker/i);
      await act(async () => {
        fireEvent.click(retakerRadio);
      });

      // Retaker price: 40 + 24 + 20 (no retaker price) = 84
      expect(screen.getByText('£84.00')).toBeInTheDocument();
    });

    test('shows standard pricing text by default', async () => {
      await renderComponent();
      expect(screen.getByText('Standard pricing')).toBeInTheDocument();
    });

    test('shows discount applied text when discount selected', async () => {
      await renderComponent();
      expect(screen.getByText('£100.00')).toBeInTheDocument();

      const retakerRadio = screen.getByLabelText(/Retaker/i);
      await act(async () => {
        fireEvent.click(retakerRadio);
      });

      expect(screen.getByText('Discount applied')).toBeInTheDocument();
    });
  });

  describe('discount options', () => {
    test('retaker option is enabled when price type exists', async () => {
      await renderComponent();
      const retakerRadio = screen.getByLabelText(/Retaker/i);
      expect(retakerRadio).not.toBeDisabled();
    });

    test('additional copy option is disabled when no price type exists', async () => {
      await renderComponent();
      const additionalRadio = screen.getByLabelText(/Additional Copy/i);
      expect(additionalRadio).toBeDisabled();
    });

    test('toggles discount off when clicked again', async () => {
      await renderComponent();
      expect(screen.getByText('£100.00')).toBeInTheDocument();

      const retakerRadio = screen.getByLabelText(/Retaker/i);

      // Select retaker
      await act(async () => {
        fireEvent.click(retakerRadio);
      });
      expect(screen.getByText('£84.00')).toBeInTheDocument();

      // Deselect retaker
      await act(async () => {
        fireEvent.click(retakerRadio);
      });
      expect(screen.getByText('£100.00')).toBeInTheDocument();
    });
  });

  describe('bundle contents modal', () => {
    test('opens modal when info button clicked', async () => {
      await renderComponent();

      const infoButtons = screen.getAllByRole('button');
      const infoButton = infoButtons.find(btn => btn.querySelector('svg'));
      await act(async () => {
        fireEvent.click(infoButton);
      });

      expect(screen.getByText(/Bundle Contents:/i)).toBeInTheDocument();
    });

    test('shows component table in modal', async () => {
      await renderComponent();

      const infoButtons = screen.getAllByRole('button');
      const infoButton = infoButtons.find(btn => btn.querySelector('svg'));
      await act(async () => {
        fireEvent.click(infoButton);
      });

      expect(screen.getByText('Product')).toBeInTheDocument();
      expect(screen.getByText('Qty')).toBeInTheDocument();
      expect(screen.getByText('Unit Price')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });

    test('closes modal when close button clicked', async () => {
      await renderComponent();

      // Open modal
      const infoButtons = screen.getAllByRole('button');
      const infoButton = infoButtons.find(btn => btn.querySelector('svg'));
      await act(async () => {
        fireEvent.click(infoButton);
      });

      expect(screen.getByText(/Bundle Contents:/i)).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByText('Close');
      await act(async () => {
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Bundle Contents:/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('add to cart', () => {
    test('calls processBundleForCart when add to cart clicked', async () => {
      await renderComponent();

      const addButton = screen.getByRole('button', { name: /add bundle to cart/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(bundleService.processBundleForCart).toHaveBeenCalledWith(
        mockBundle,
        '' // No discount selected
      );
    });

    test('passes selected price type to processBundleForCart', async () => {
      await renderComponent();
      expect(screen.getByText('£100.00')).toBeInTheDocument();

      // Select retaker discount
      const retakerRadio = screen.getByLabelText(/Retaker/i);
      await act(async () => {
        fireEvent.click(retakerRadio);
      });

      const addButton = screen.getByRole('button', { name: /add bundle to cart/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(bundleService.processBundleForCart).toHaveBeenCalledWith(
        mockBundle,
        'retaker'
      );
    });

    test('adds each cart item individually', async () => {
      bundleService.processBundleForCart.mockResolvedValue({
        success: true,
        cartItems: [
          {
            product: { id: 'prod-1' },
            priceInfo: {
              variationId: 'var-1',
              variationName: 'Printed',
              priceType: 'standard',
              actualPrice: 50.00,
            },
            quantity: 1,
          },
          {
            product: { id: 'prod-2' },
            priceInfo: {
              variationId: 'var-2',
              variationName: 'eBook',
              priceType: 'standard',
              actualPrice: 30.00,
            },
            quantity: 1,
          },
        ],
      });

      await renderComponent();

      const addButton = screen.getByRole('button', { name: /add bundle to cart/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(mockAddToCart).toHaveBeenCalledTimes(2);
      });
    });

    test('handles error when adding to cart fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      bundleService.processBundleForCart.mockRejectedValue(new Error('Cart error'));

      await renderComponent();

      const addButton = screen.getByRole('button', { name: /add bundle to cart/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error adding bundle to cart:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('hover effects', () => {
    test('applies hover transform on mouse enter', async () => {
      await renderComponent();

      const card = screen.getByText('CM2 Study Bundle').closest('.MuiCard-root');
      fireEvent.mouseEnter(card);

      expect(card).toHaveStyle({ transform: 'scale(1.02)' });
    });

    test('removes hover transform on mouse leave', async () => {
      await renderComponent();

      const card = screen.getByText('CM2 Study Bundle').closest('.MuiCard-root');
      fireEvent.mouseEnter(card);
      fireEvent.mouseLeave(card);

      expect(card).toHaveStyle({ transform: 'scale(1)' });
    });
  });

  describe('edge cases', () => {
    test('handles bundle with no components', async () => {
      const emptyBundle = {
        ...mockBundle,
        components: [],
        components_count: 0,
      };

      await renderComponent({ bundle: emptyBundle });

      expect(screen.getByText(/What's included \(0 items\)/i)).toBeInTheDocument();
    });

    test('handles bundle without exam session code', async () => {
      const noSessionBundle = {
        ...mockBundle,
        exam_session_code: null,
      };

      await renderComponent({ bundle: noSessionBundle });

      expect(screen.queryByText('2024-04')).not.toBeInTheDocument();
    });

    test('shows contact for pricing when no prices available', async () => {
      bundleService.getBundleContents.mockResolvedValue({
        success: true,
        data: {
          total_components: 1,
          components: [{
            id: 'comp-1',
            name: 'No Price Item',
            product: { fullname: 'No Price Item' },
            prices: [],
          }],
        },
      });

      const noPriceBundle = {
        ...mockBundle,
        components: [{
          id: 'comp-1',
          name: 'No Price Item',
          product: { fullname: 'No Price Item' },
          prices: [],
        }],
      };

      await renderComponent({ bundle: noPriceBundle });

      expect(screen.getByText('Contact for pricing')).toBeInTheDocument();
    });
  });
});
