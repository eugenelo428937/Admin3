import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductVariationsPanel from '../ProductVariationsPanel.tsx';

// Mock productProductVariationService
vi.mock('../../../../services/productProductVariationService', () => ({
  __esModule: true,
  default: {
    getByProduct: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock productVariationService
vi.mock('../../../../services/productVariationService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
  },
}));

import productProductVariationService from '../../../../services/productProductVariationService';
import productVariationService from '../../../../services/productVariationService';

const mockPPVs = [
  { id: 10, product: 1, product_variation: 1, variation_name: 'eBook', variation_code: 'EB', variation_type: 'eBook' },
  { id: 11, product: 1, product_variation: 2, variation_name: 'Printed', variation_code: 'PC', variation_type: 'Printed' },
];

const mockAllVariations = [
  { id: 1, name: 'eBook', code: 'EB', variation_type: 'eBook' },
  { id: 2, name: 'Printed', code: 'PC', variation_type: 'Printed' },
  { id: 3, name: 'Hub', code: 'HB', variation_type: 'Hub' },
  { id: 4, name: 'Marking', code: 'MK', variation_type: 'Marking' },
];

const renderComponent = (props = {}) => render(
  <ProductVariationsPanel productId={1} {...props} />
);

describe('ProductVariationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productProductVariationService.getByProduct.mockResolvedValue(mockPPVs);
    productVariationService.getAll.mockResolvedValue(mockAllVariations);
  });

  describe('loading state', () => {
    test('shows loading skeleton initially', () => {
      productProductVariationService.getByProduct.mockReturnValue(new Promise(() => {}));
      productVariationService.getAll.mockReturnValue(new Promise(() => {}));

      renderComponent();

      // Skeleton loading state renders div elements, not a progressbar
      expect(screen.queryByText('Product Variations')).not.toBeInTheDocument();
    });
  });

  describe('data fetching', () => {
    test('fetches PPVs for given product on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(productProductVariationService.getByProduct).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('displaying variations', () => {
    test('displays assigned variations in table', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByText('eBook').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Printed').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('EB')).toBeInTheDocument();
        expect(screen.getByText('PC')).toBeInTheDocument();
      });
    });

    test('displays "No variations assigned" when empty', async () => {
      productProductVariationService.getByProduct.mockResolvedValue([]);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no variations assigned/i)).toBeInTheDocument();
      });
    });
  });

  describe('remove variation', () => {
    test('calls delete and refreshes on confirm', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      productProductVariationService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('EB')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/remove variation/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith(
          expect.stringContaining('remove')
        );
        expect(productProductVariationService.delete).toHaveBeenCalledWith(10);
        expect(productProductVariationService.getByProduct).toHaveBeenCalledTimes(2);
      });
    });

    test('does not delete when cancelled', async () => {
      window.confirm = vi.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('EB')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText(/remove variation/i);
      fireEvent.click(deleteButtons[0]);

      expect(productProductVariationService.delete).not.toHaveBeenCalled();
    });
  });

  describe('add variation', () => {
    test('add variation select is present', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText('Add variation')).toBeInTheDocument();
      });
    });
  });

  describe('edit variation', () => {
    test('clicking edit shows select and save/cancel buttons', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('EB')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit variation/i);
      fireEvent.click(editButtons[0]);

      expect(screen.getByLabelText('Select variation')).toBeInTheDocument();
      expect(screen.getByLabelText('save edit')).toBeInTheDocument();
      expect(screen.getByLabelText('cancel edit')).toBeInTheDocument();
    });

    test('cancel edit returns to view mode', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('EB')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText(/edit variation/i);
      fireEvent.click(editButtons[0]);

      expect(screen.getByLabelText('cancel edit')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('cancel edit'));

      await waitFor(() => {
        expect(screen.getByText('EB')).toBeInTheDocument();
        expect(screen.getAllByText('eBook').length).toBeGreaterThanOrEqual(1);
      });

      expect(screen.queryByLabelText('save edit')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('cancel edit')).not.toBeInTheDocument();

      expect(screen.getAllByLabelText(/edit variation/i)).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    test('displays error message when fetch fails', async () => {
      productProductVariationService.getByProduct.mockRejectedValue(
        new Error('Network error')
      );

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to load variations/i)).toBeInTheDocument();
      });
    });
  });
});
