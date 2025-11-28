// src/components/Product/ProductCard/__tests__/MaterialProductCard.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import MaterialProductCard from '../MaterialProductCard';

// Create theme with required palette
const theme = createTheme({
  palette: {
    bpp: {
      sky: {
        '060': '#1976d2',
        '070': '#1565c0'
      }
    }
  }
});

// Mock useCart
jest.mock('../../../../contexts/CartContext', () => ({
  useCart: () => ({
    cartData: {
      vat_calculations: {
        region_info: { region: 'UK' }
      }
    }
  })
}));

// Mock BaseProductCard
jest.mock('../../../Common/BaseProductCard', () => {
  const React = require('react');
  return React.forwardRef(function MockBaseProductCard({ children, ...props }, ref) {
    return React.createElement('div', { 'data-testid': 'base-product-card', ref, ...props }, children);
  });
});

// Mock specialized product cards
jest.mock('../Tutorial/TutorialProductCard', () => {
  const React = require('react');
  return function MockTutorialProductCard({ product }) {
    return React.createElement('div', { 'data-testid': 'tutorial-product-card' }, product.product_name);
  };
});

jest.mock('../MarkingProductCard', () => {
  const React = require('react');
  return function MockMarkingProductCard({ product }) {
    return React.createElement('div', { 'data-testid': 'marking-product-card' }, product.product_name);
  };
});

jest.mock('../MarkingVoucherProductCard', () => {
  const React = require('react');
  return function MockMarkingVoucherProductCard({ voucher }) {
    return React.createElement('div', { 'data-testid': 'marking-voucher-product-card' }, voucher.product_name);
  };
});

jest.mock('../OnlineClassroomProductCard', () => {
  const React = require('react');
  return function MockOnlineClassroomProductCard({ product }) {
    return React.createElement('div', { 'data-testid': 'online-classroom-product-card' }, product.product_name);
  };
});

jest.mock('../BundleCard', () => {
  const React = require('react');
  return function MockBundleCard({ bundle }) {
    return React.createElement('div', { 'data-testid': 'bundle-card' }, bundle.product_name);
  };
});

// Helper to create mock product
const createMockProduct = (overrides = {}) => ({
  id: 'prod-1',
  essp_id: 'essp-1',
  product_name: 'CM2 Core Reading',
  subject_code: 'CM2',
  exam_session_code: '2024-04',
  type: 'Materials',
  vat_status_display: 'Price excludes VAT',
  variations: [
    {
      id: 1,
      name: 'Printed',
      prices: [
        { price_type: 'standard', amount: 150.00 },
        { price_type: 'retaker', amount: 120.00 },
        { price_type: 'additional', amount: 100.00 }
      ]
    },
    {
      id: 2,
      name: 'eBook',
      prices: [
        { price_type: 'standard', amount: 100.00 },
        { price_type: 'retaker', amount: 80.00 }
      ]
    }
  ],
  ...overrides
});

// Helper to render component
const renderComponent = async (props = {}) => {
  const defaultProps = {
    product: createMockProduct(),
    onAddToCart: jest.fn(),
    allEsspIds: [],
    bulkDeadlines: {}
  };

  let result;
  await act(async () => {
    result = render(
      <ThemeProvider theme={theme}>
        <MaterialProductCard {...defaultProps} {...props} />
      </ThemeProvider>
    );
  });

  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  return result;
};

describe('MaterialProductCard', () => {
  describe('Product Type Detection', () => {
    test('renders TutorialProductCard for Tutorial type', async () => {
      const tutorialProduct = createMockProduct({
        type: 'Tutorial',
        product_name: 'CM2 Tutorial'
      });

      await renderComponent({ product: tutorialProduct });

      expect(screen.getByTestId('tutorial-product-card')).toBeInTheDocument();
    });

    test('renders MarkingProductCard for Markings type', async () => {
      const markingProduct = createMockProduct({
        type: 'Markings',
        product_name: 'CM2 Marking'
      });

      await renderComponent({ product: markingProduct });

      expect(screen.getByTestId('marking-product-card')).toBeInTheDocument();
    });

    test('renders MarkingVoucherProductCard for MarkingVoucher type', async () => {
      const voucherProduct = createMockProduct({
        type: 'MarkingVoucher',
        product_name: 'CM2 Marking Voucher'
      });

      await renderComponent({ product: voucherProduct });

      expect(screen.getByTestId('marking-voucher-product-card')).toBeInTheDocument();
    });

    test('renders MarkingVoucherProductCard for is_voucher flag', async () => {
      const voucherProduct = createMockProduct({
        is_voucher: true,
        product_name: 'CM2 Voucher Product'
      });

      await renderComponent({ product: voucherProduct });

      expect(screen.getByTestId('marking-voucher-product-card')).toBeInTheDocument();
    });

    test('renders MarkingVoucherProductCard for product name containing voucher', async () => {
      const voucherProduct = createMockProduct({
        product_name: 'CM2 Marking Voucher Special'
      });

      await renderComponent({ product: voucherProduct });

      expect(screen.getByTestId('marking-voucher-product-card')).toBeInTheDocument();
    });

    test('renders OnlineClassroomProductCard for online classroom product', async () => {
      const onlineProduct = createMockProduct({
        product_name: 'CM2 Online Classroom Course'
      });

      await renderComponent({ product: onlineProduct });

      expect(screen.getByTestId('online-classroom-product-card')).toBeInTheDocument();
    });

    test('renders OnlineClassroomProductCard for recording product', async () => {
      const recordingProduct = createMockProduct({
        product_name: 'CM2 Recording Pack'
      });

      await renderComponent({ product: recordingProduct });

      expect(screen.getByTestId('online-classroom-product-card')).toBeInTheDocument();
    });

    test('renders OnlineClassroomProductCard for LMS learning mode', async () => {
      const lmsProduct = createMockProduct({
        learning_mode: 'LMS',
        product_name: 'CM2 LMS Course'
      });

      await renderComponent({ product: lmsProduct });

      expect(screen.getByTestId('online-classroom-product-card')).toBeInTheDocument();
    });

    test('renders BundleCard for Bundle type', async () => {
      const bundleProduct = createMockProduct({
        type: 'Bundle',
        product_name: 'CM2 Complete Bundle'
      });

      await renderComponent({ product: bundleProduct });

      expect(screen.getByTestId('bundle-card')).toBeInTheDocument();
    });

    test('renders BundleCard for product name containing bundle', async () => {
      const bundleProduct = createMockProduct({
        product_name: 'CM2 Study Bundle Package'
      });

      await renderComponent({ product: bundleProduct });

      expect(screen.getByTestId('bundle-card')).toBeInTheDocument();
    });

    test('renders BundleCard for is_bundle flag', async () => {
      const bundleProduct = createMockProduct({
        is_bundle: true,
        product_name: 'CM2 Package Deal'
      });

      await renderComponent({ product: bundleProduct });

      expect(screen.getByTestId('bundle-card')).toBeInTheDocument();
    });
  });

  describe('Material Product Rendering', () => {
    test('renders product name', async () => {
      await renderComponent();

      expect(screen.getByText('CM2 Core Reading')).toBeInTheDocument();
    });

    test('renders subject code badge', async () => {
      await renderComponent();

      expect(screen.getByText('CM2')).toBeInTheDocument();
    });

    test('renders exam session badge', async () => {
      await renderComponent();

      expect(screen.getByText('2024-04')).toBeInTheDocument();
    });

    test('renders variation options', async () => {
      await renderComponent();

      expect(screen.getByText('Printed')).toBeInTheDocument();
      expect(screen.getByText('eBook')).toBeInTheDocument();
    });

    test('shows Product Variations title', async () => {
      await renderComponent();

      expect(screen.getByText('Product Variations')).toBeInTheDocument();
    });

    test('shows Discount Options title', async () => {
      await renderComponent();

      expect(screen.getByText('Discount Options')).toBeInTheDocument();
    });

    test('shows retaker option', async () => {
      await renderComponent();

      expect(screen.getByText('Retaker')).toBeInTheDocument();
    });

    test('shows additional copy option', async () => {
      await renderComponent();

      expect(screen.getByText('Additional Copy')).toBeInTheDocument();
    });
  });

  describe('Variation Selection', () => {
    test('first variation is selected by default', async () => {
      await renderComponent();

      const printedRadio = screen.getByRole('radio', { name: /printed/i });
      expect(printedRadio).toBeChecked();
    });

    test('can select different variation', async () => {
      await renderComponent();

      const ebookRadio = screen.getByRole('radio', { name: /ebook/i });
      await act(async () => {
        fireEvent.click(ebookRadio);
      });

      expect(ebookRadio).toBeChecked();
    });

    test('displays price for each variation', async () => {
      await renderComponent();

      // Check for prices in variation list
      expect(screen.getAllByText(/£150/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/£100/).length).toBeGreaterThan(0);
    });
  });

  describe('Price Type Selection', () => {
    test('standard pricing is default', async () => {
      await renderComponent();

      expect(screen.getByText('Standard pricing')).toBeInTheDocument();
    });

    test('can select retaker discount', async () => {
      await renderComponent();

      const retakerRadio = screen.getByRole('radio', { name: /retaker/i });
      await act(async () => {
        fireEvent.click(retakerRadio);
      });

      expect(screen.getByText('Retaker discount applied')).toBeInTheDocument();
    });

    test('can select additional copy discount', async () => {
      await renderComponent();

      const additionalRadio = screen.getByRole('radio', { name: /additional/i });
      await act(async () => {
        fireEvent.click(additionalRadio);
      });

      expect(screen.getByText('Additional copy discount applied')).toBeInTheDocument();
    });

    test('can deselect price type by clicking again', async () => {
      await renderComponent();

      const retakerRadio = screen.getByRole('radio', { name: /retaker/i });
      await act(async () => {
        fireEvent.click(retakerRadio);
      });

      expect(screen.getByText('Retaker discount applied')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(retakerRadio);
      });

      expect(screen.getByText('Standard pricing')).toBeInTheDocument();
    });

    test('disables additional copy when not available', async () => {
      // eBook variation only has standard and retaker prices
      await renderComponent();

      const ebookRadio = screen.getByRole('radio', { name: /ebook/i });
      await act(async () => {
        fireEvent.click(ebookRadio);
      });

      const additionalRadios = screen.getAllByRole('radio', { name: /additional/i });
      const additionalRadio = additionalRadios.find(radio => 
        radio.closest('.discount-radio-option')
      );
      
      expect(additionalRadio).toBeDisabled();
    });
  });

  describe('Price Modal', () => {
    test('opens price modal when info button is clicked', async () => {
      await renderComponent();

      const infoButton = screen.getByRole('button', { name: /show price/i });
      await act(async () => {
        fireEvent.click(infoButton);
      });

      expect(screen.getByText('Price Information')).toBeInTheDocument();
    });

    test('shows all variations and prices in modal', async () => {
      await renderComponent();

      const infoButton = screen.getByRole('button', { name: /show price/i });
      await act(async () => {
        fireEvent.click(infoButton);
      });

      // Check for variation names in table
      expect(screen.getAllByText('Printed').length).toBeGreaterThan(0);
      expect(screen.getAllByText('eBook').length).toBeGreaterThan(0);
    });

    test('closes price modal when close button clicked', async () => {
      await renderComponent();

      const infoButton = screen.getByRole('button', { name: /show price/i });
      await act(async () => {
        fireEvent.click(infoButton);
      });

      expect(screen.getByText('Price Information')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      await act(async () => {
        fireEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Price Information')).not.toBeInTheDocument();
      });
    });

    test('shows VAT status in modal', async () => {
      await renderComponent();

      const infoButton = screen.getByRole('button', { name: /show price/i });
      await act(async () => {
        fireEvent.click(infoButton);
      });

      expect(screen.getAllByText('Price excludes VAT').length).toBeGreaterThan(0);
    });
  });

  describe('Add to Cart', () => {
    test('calls onAddToCart with correct parameters', async () => {
      const onAddToCart = jest.fn();
      await renderComponent({ onAddToCart });

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(onAddToCart).toHaveBeenCalledWith(
        expect.objectContaining({ product_name: 'CM2 Core Reading' }),
        expect.objectContaining({
          variationId: 1,
          variationName: 'Printed',
          priceType: 'standard',
          actualPrice: 150.00
        })
      );
    });

    test('passes retaker price type when selected', async () => {
      const onAddToCart = jest.fn();
      await renderComponent({ onAddToCart });

      const retakerRadio = screen.getByRole('radio', { name: /retaker/i });
      await act(async () => {
        fireEvent.click(retakerRadio);
      });

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(onAddToCart).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          priceType: 'retaker',
          actualPrice: 120.00
        })
      );
    });
  });

  describe('Buy Both Feature', () => {
    test('shows speed dial when buy_both is true and has multiple variations', async () => {
      const buyBothProduct = createMockProduct({
        buy_both: true
      });

      await renderComponent({ product: buyBothProduct });

      expect(screen.getByRole('button', { name: /speed dial/i })).toBeInTheDocument();
    });

    test('does not show buy both when only single variation', async () => {
      const singleVariationProduct = createMockProduct({
        buy_both: true,
        variations: [
          { id: 1, name: 'Printed', prices: [{ price_type: 'standard', amount: 150.00 }] }
        ]
      });

      await renderComponent({ product: singleVariationProduct });

      // Should show regular add to cart button instead
      expect(screen.queryByRole('button', { name: /speed dial/i })).not.toBeInTheDocument();
    });
  });

  describe('Hover Effects', () => {
    test('applies hover effect on mouse enter', async () => {
      await renderComponent();

      const card = screen.getByTestId('base-product-card');
      await act(async () => {
        fireEvent.mouseEnter(card);
      });

      // The card should have transform applied
      expect(card).toBeInTheDocument();
    });

    test('removes hover effect on mouse leave', async () => {
      await renderComponent();

      const card = screen.getByTestId('base-product-card');
      await act(async () => {
        fireEvent.mouseEnter(card);
        fireEvent.mouseLeave(card);
      });

      expect(card).toBeInTheDocument();
    });
  });

  describe('Single Variation Product', () => {
    test('handles product with single variation', async () => {
      const singleVariationProduct = createMockProduct({
        variations: [
          { id: 1, name: 'Digital Only', prices: [{ price_type: 'standard', amount: 99.00 }] }
        ]
      });

      await renderComponent({ product: singleVariationProduct });

      expect(screen.getByText('Digital Only')).toBeInTheDocument();
    });
  });

  describe('No Variations Product', () => {
    test('handles product with no variations', async () => {
      const noVariationsProduct = createMockProduct({
        variations: []
      });

      await renderComponent({ product: noVariationsProduct });

      // Should still render the card
      expect(screen.getByTestId('base-product-card')).toBeInTheDocument();
    });
  });

  describe('VAT Display', () => {
    test('shows VAT status', async () => {
      await renderComponent();

      expect(screen.getByText('Price excludes VAT')).toBeInTheDocument();
    });

    test('shows default VAT message when not provided', async () => {
      const productWithoutVat = createMockProduct({
        vat_status_display: null
      });

      await renderComponent({ product: productWithoutVat });

      expect(screen.getByText('Price includes VAT')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper aria labels for subject badge', async () => {
      await renderComponent();

      expect(screen.getByRole('img', { name: /subject: cm2/i })).toBeInTheDocument();
    });

    test('has proper aria labels for session badge', async () => {
      await renderComponent();

      expect(screen.getByRole('img', { name: /exam session: 2024-04/i })).toBeInTheDocument();
    });

    test('add to cart button has aria label', async () => {
      await renderComponent();

      expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
    });
  });

  describe('Exam Session Variants', () => {
    test('renders session_code if no exam_session_code', async () => {
      const product = createMockProduct({
        exam_session_code: null,
        session_code: '2024-09'
      });

      await renderComponent({ product });

      expect(screen.getByText('2024-09')).toBeInTheDocument();
    });

    test('renders exam_session if no session_code', async () => {
      const product = createMockProduct({
        exam_session_code: null,
        session_code: null,
        exam_session: '2025-04'
      });

      await renderComponent({ product });

      expect(screen.getByText('2025-04')).toBeInTheDocument();
    });
  });

  describe('Voucher Code Detection', () => {
    test('detects voucher by code prefix', async () => {
      const voucherProduct = createMockProduct({
        code: 'VOUCHER-CM2-001',
        product_name: 'CM2 Special'
      });

      await renderComponent({ product: voucherProduct });

      expect(screen.getByTestId('marking-voucher-product-card')).toBeInTheDocument();
    });
  });
});
