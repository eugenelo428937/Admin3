// src/components/Product/ProductCard/__tests__/OnlineClassroomProductCard.test.js
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import OnlineClassroomProductCard from '../OnlineClassroomProductCard';

// Mock useCart
jest.mock('../../../../contexts/CartContext', () => ({
  useCart: () => ({
    cartData: {
      id: 'cart-123',
      vat_calculations: {
        region_info: { region: 'UK' }
      }
    },
  }),
}));

const theme = createTheme();

const mockProduct = {
  id: 'prod-1',
  subject_code: 'CM2',
  product_name: 'Online Classroom Course',
  type: 'online_classroom',
  vat_status_display: 'Price excludes VAT',
  variations: [
    {
      id: 1,
      name: 'Standard Access',
      variation_type: 'access',
      description: '6 months access',
      prices: [
        { price_type: 'standard', amount: 150.00 },
        { price_type: 'retaker', amount: 120.00 },
        { price_type: 'additional', amount: 100.00 },
      ],
    },
    {
      id: 2,
      name: 'Premium Access',
      variation_type: 'access',
      description: '12 months access with recordings',
      prices: [
        { price_type: 'standard', amount: 250.00 },
        { price_type: 'retaker', amount: 200.00 },
      ],
    },
  ],
};

const renderComponent = async (props = {}) => {
  const defaultProps = {
    product: mockProduct,
    onAddToCart: jest.fn(),
  };

  let result;
  await act(async () => {
    result = render(
      <ThemeProvider theme={theme}>
        <OnlineClassroomProductCard {...defaultProps} {...props} />
      </ThemeProvider>
    );
  });

  return result;
};

describe('OnlineClassroomProductCard', () => {
  describe('rendering', () => {
    test('renders product title', async () => {
      await renderComponent();
      expect(screen.getByText('Online Classroom')).toBeInTheDocument();
    });

    test('renders product subtitle with subject code', async () => {
      await renderComponent();
      expect(screen.getByText(/CM2 - Online Classroom Course/i)).toBeInTheDocument();
    });

    test('renders subject code badge', async () => {
      await renderComponent();
      expect(screen.getByText('CM2')).toBeInTheDocument();
    });

    test('renders exam session badge', async () => {
      await renderComponent();
      expect(screen.getByText('25S')).toBeInTheDocument();
    });

    test('renders access options title', async () => {
      await renderComponent();
      expect(screen.getByText('Access Options')).toBeInTheDocument();
    });

    test('renders variation options', async () => {
      await renderComponent();
      expect(screen.getByText('Standard Access')).toBeInTheDocument();
      expect(screen.getByText('Premium Access')).toBeInTheDocument();
    });

    test('renders variation descriptions', async () => {
      await renderComponent();
      expect(screen.getByText('6 months access')).toBeInTheDocument();
      expect(screen.getByText('12 months access with recordings')).toBeInTheDocument();
    });

    test('renders VAT status display', async () => {
      await renderComponent();
      expect(screen.getByText('Price excludes VAT')).toBeInTheDocument();
    });

    test('renders discount options', async () => {
      await renderComponent();
      expect(screen.getByText('Discount Options')).toBeInTheDocument();
      expect(screen.getByText('Retaker')).toBeInTheDocument();
      expect(screen.getByText('Additional Copy')).toBeInTheDocument();
    });

    test('renders add to cart button', async () => {
      await renderComponent();
      const button = screen.getByRole('button', { name: '' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('pricing', () => {
    test('displays standard price for first variation by default', async () => {
      await renderComponent();
      // Price displays show both in variation list and main price area
      const priceDisplays = screen.getAllByText(/£150/);
      expect(priceDisplays.length).toBeGreaterThan(0);
    });

    test('displays standard pricing text by default', async () => {
      await renderComponent();
      expect(screen.getByText('Standard pricing')).toBeInTheDocument();
    });

    test('updates price when retaker discount selected', async () => {
      await renderComponent();

      const retakerRadio = screen.getByText('Retaker').closest('label').querySelector('input');
      await act(async () => {
        fireEvent.click(retakerRadio);
      });

      const priceDisplays = screen.getAllByText(/£120/);
      expect(priceDisplays.length).toBeGreaterThan(0);
      expect(screen.getByText('Retaker discount applied')).toBeInTheDocument();
    });

    test('updates price when additional copy discount selected', async () => {
      await renderComponent();

      const additionalRadio = screen.getByText('Additional Copy').closest('label').querySelector('input');
      await act(async () => {
        fireEvent.click(additionalRadio);
      });

      const priceDisplays = screen.getAllByText(/£100/);
      expect(priceDisplays.length).toBeGreaterThan(0);
      expect(screen.getByText('Additional copy discount applied')).toBeInTheDocument();
    });

    test('toggles discount off when clicked again', async () => {
      await renderComponent();

      const retakerRadio = screen.getByText('Retaker').closest('label').querySelector('input');

      // Select retaker
      await act(async () => {
        fireEvent.click(retakerRadio);
      });
      const retakerPrices = screen.getAllByText(/£120/);
      expect(retakerPrices.length).toBeGreaterThan(0);

      // Deselect retaker
      await act(async () => {
        fireEvent.click(retakerRadio);
      });
      const standardPrices = screen.getAllByText(/£150/);
      expect(standardPrices.length).toBeGreaterThan(0);
      expect(screen.getByText('Standard pricing')).toBeInTheDocument();
    });
  });

  describe('variation selection', () => {
    test('selects first variation by default', async () => {
      await renderComponent();

      const radioButtons = screen.getAllByRole('radio');
      // First radio should be for Standard Access variation
      expect(radioButtons[0]).toBeChecked();
    });

    test('updates price when different variation selected', async () => {
      await renderComponent();

      // Click on Premium Access variation
      const premiumLabel = screen.getByText('Premium Access');
      const premiumRadio = premiumLabel.closest('label').querySelector('input');

      await act(async () => {
        fireEvent.click(premiumRadio);
      });

      // Price display should show £250 (the main price display has this class)
      const priceDisplays = screen.getAllByText(/£250/);
      expect(priceDisplays.length).toBeGreaterThan(0);
    });
  });

  describe('add to cart', () => {
    test('calls onAddToCart with correct context when clicked', async () => {
      const mockOnAddToCart = jest.fn();
      await renderComponent({ onAddToCart: mockOnAddToCart });

      const addButton = screen.getByRole('button', { name: '' });
      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(mockOnAddToCart).toHaveBeenCalledWith(
        mockProduct,
        expect.objectContaining({
          variationId: 1,
          variationName: 'Standard Access',
          priceType: 'standard',
          actualPrice: 150.00,
          metadata: expect.objectContaining({
            type: 'online_classroom',
            is_digital: true,
          }),
        })
      );
    });

    test('passes selected price type to onAddToCart', async () => {
      const mockOnAddToCart = jest.fn();
      await renderComponent({ onAddToCart: mockOnAddToCart });

      // Select retaker discount
      const retakerRadio = screen.getByText('Retaker').closest('label').querySelector('input');
      await act(async () => {
        fireEvent.click(retakerRadio);
      });

      const addButton = screen.getByRole('button', { name: '' });
      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(mockOnAddToCart).toHaveBeenCalledWith(
        mockProduct,
        expect.objectContaining({
          priceType: 'retaker',
          actualPrice: 120.00,
        })
      );
    });

    test('does not call onAddToCart when no variation selected', async () => {
      const productNoVariations = { ...mockProduct, variations: [] };
      const mockOnAddToCart = jest.fn();
      await renderComponent({ product: productNoVariations, onAddToCart: mockOnAddToCart });

      const addButton = screen.getByRole('button', { name: '' });
      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(mockOnAddToCart).not.toHaveBeenCalled();
    });
  });

  describe('hover effects', () => {
    test('applies hover transform on mouse enter', async () => {
      await renderComponent();

      const card = screen.getByText('Online Classroom').closest('.MuiCard-root');
      fireEvent.mouseEnter(card);

      expect(card).toHaveStyle({ transform: 'scale(1.02)' });
    });

    test('removes hover transform on mouse leave', async () => {
      await renderComponent();

      const card = screen.getByText('Online Classroom').closest('.MuiCard-root');
      fireEvent.mouseEnter(card);
      fireEvent.mouseLeave(card);

      expect(card).toHaveStyle({ transform: 'scale(1)' });
    });
  });

  describe('edge cases', () => {
    test('handles product with no variations', async () => {
      const productNoVariations = { ...mockProduct, variations: [] };
      await renderComponent({ product: productNoVariations });

      expect(screen.getByText('Online Classroom')).toBeInTheDocument();
      expect(screen.getByText('£0.00')).toBeInTheDocument();
    });

    test('handles variation without prices', async () => {
      const productNoPrices = {
        ...mockProduct,
        variations: [{ id: 1, name: 'Test', prices: [] }],
      };
      await renderComponent({ product: productNoPrices });

      expect(screen.getByText('£0.00')).toBeInTheDocument();
    });

    test('handles missing VAT status display', async () => {
      const productNoVat = { ...mockProduct, vat_status_display: null };
      await renderComponent({ product: productNoVat });

      expect(screen.getByText('Price includes VAT')).toBeInTheDocument();
    });
  });
});
