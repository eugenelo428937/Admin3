// src/components/admin/product-bundles/__tests__/BundleProductsPanel.test.js
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import BundleProductsPanel from '../BundleProductsPanel';

// Mock services
jest.mock('../../../../services/catalogBundleProductService', () => ({
  __esModule: true,
  default: {
    getByBundleId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../../../services/catalogProductService', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
  },
}));

jest.mock('../../../../services/productProductVariationService', () => ({
  __esModule: true,
  default: {
    getByProduct: jest.fn(),
  },
}));

import catalogBundleProductService from '../../../../services/catalogBundleProductService';
import catalogProductService from '../../../../services/catalogProductService';
import productProductVariationService from '../../../../services/productProductVariationService';

const theme = createTheme();

const mockBundleProducts = [
  {
    id: 10,
    bundle: 1,
    product_product_variation: 100,
    product_name: 'CM2 Core',
    product_code: 'CM2-CSM',
    variation_name: 'Standard eBook',
    variation_code: 'VAR-EBOOK',
    default_price_type: 'standard',
    quantity: 1,
    sort_order: 1,
    is_active: true,
  },
  {
    id: 11,
    bundle: 1,
    product_product_variation: 101,
    product_name: 'CM2 Marking',
    product_code: 'CM2-MARK',
    variation_name: 'Online Hub',
    variation_code: 'VAR-HUB',
    default_price_type: 'standard',
    quantity: 1,
    sort_order: 2,
    is_active: true,
  },
];

const mockProducts = [
  { id: 1, shortname: 'CM2 Core', code: 'CM2-CSM' },
  { id: 2, shortname: 'CM2 Marking', code: 'CM2-MARK' },
  { id: 3, shortname: 'CM2 Tutorial', code: 'CM2-TUT' },
];

const mockPPVsForProduct = [
  { id: 200, product: 3, product_variation: 5, variation_name: 'Printed Book', variation_code: 'VAR-PRINTED' },
  { id: 201, product: 3, product_variation: 6, variation_name: 'Online Hub', variation_code: 'VAR-HUB' },
];

const renderComponent = (props = {}) => {
  return render(
    <ThemeProvider theme={theme}>
      <BundleProductsPanel bundleId={1} {...props} />
    </ThemeProvider>
  );
};

describe('BundleProductsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    catalogBundleProductService.getByBundleId.mockResolvedValue(mockBundleProducts);
    catalogProductService.getAll.mockResolvedValue(mockProducts);
    productProductVariationService.getByProduct.mockResolvedValue(mockPPVsForProduct);
  });

  describe('loading and display', () => {
    test('shows loading spinner initially', () => {
      catalogBundleProductService.getByBundleId.mockReturnValue(new Promise(() => {}));
      renderComponent();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('fetches bundle products for the given bundle on mount', async () => {
      renderComponent();
      await waitFor(() => {
        expect(catalogBundleProductService.getByBundleId).toHaveBeenCalledWith(1);
      });
    });

    test('displays bundle products in a table', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('CM2 Core')).toBeInTheDocument();
        expect(screen.getByText('CM2-CSM')).toBeInTheDocument();
        expect(screen.getByText('Standard eBook')).toBeInTheDocument();
        expect(screen.getByText('VAR-EBOOK')).toBeInTheDocument();
        expect(screen.getByText('CM2 Marking')).toBeInTheDocument();
        expect(screen.getByText('CM2-MARK')).toBeInTheDocument();
      });
    });

    test('displays empty message when no products in bundle', async () => {
      catalogBundleProductService.getByBundleId.mockResolvedValue([]);
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/no products in this bundle/i)).toBeInTheDocument();
      });
    });
  });

  describe('remove product', () => {
    test('calls delete and refreshes on remove', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      catalogBundleProductService.delete.mockResolvedValue({});

      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('CM2 Core')).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByLabelText(/remove/i);
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(catalogBundleProductService.delete).toHaveBeenCalledWith(10);
        expect(catalogBundleProductService.getByBundleId).toHaveBeenCalledTimes(2);
      });
    });

    test('does not delete when confirm cancelled', async () => {
      window.confirm = jest.fn().mockReturnValue(false);

      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('CM2 Core')).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByLabelText(/remove/i);
      fireEvent.click(removeButtons[0]);

      expect(catalogBundleProductService.delete).not.toHaveBeenCalled();
    });
  });

  describe('add product', () => {
    test('renders product autocomplete for adding', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('CM2 Core')).toBeInTheDocument();
      });

      // There should be an autocomplete for selecting a product
      const productAutocomplete = screen.getByLabelText(/select product/i);
      expect(productAutocomplete).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      catalogBundleProductService.getByBundleId.mockRejectedValue(new Error('Network error'));

      renderComponent();
      await waitFor(() => {
        expect(screen.getByText(/failed to load bundle products/i)).toBeInTheDocument();
      });
    });
  });
});
