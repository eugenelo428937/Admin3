import { vi } from 'vitest';
// src/components/admin/product-variations/__tests__/ProductVariationList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminProductVariationList from '../ProductVariationList.js';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.tsx', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.tsx';

// Mock productVariationService
vi.mock('../../../../services/productVariationService.js', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
    delete: vi.fn(),
  },
}));

import productVariationService from '../../../../services/productVariationService.js';

import appTheme from '../../../../theme';
const theme = appTheme;

const mockProductVariations = [
  {
    id: '1',
    variation_type: 'eBook',
    name: 'eBook Version',
    code: 'EB',
  },
  {
    id: '2',
    variation_type: 'Printed',
    name: 'Printed Version',
    code: 'PR',
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AdminProductVariationList />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AdminProductVariationList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    productVariationService.getAll.mockResolvedValue(mockProductVariations);
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /product variations/i })).toBeInTheDocument();
      });
    });

    test('renders create new button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /create new product variation/i })).toBeInTheDocument();
      });
    });

    test('renders table headers', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Variation Type' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Code' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
      });
    });

    test('shows loading state initially', () => {
      productVariationService.getAll.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('data display', () => {
    test('fetches and displays product variations', async () => {
      renderComponent();

      await waitFor(() => {
        expect(productVariationService.getAll).toHaveBeenCalled();
        expect(screen.getByText('eBook Version')).toBeInTheDocument();
        expect(screen.getByText('Printed Version')).toBeInTheDocument();
        expect(screen.getByText('EB')).toBeInTheDocument();
        expect(screen.getByText('PR')).toBeInTheDocument();
      });
    });

    test('displays edit buttons for each item', async () => {
      renderComponent();

      await waitFor(() => {
        const editButtons = screen.getAllByRole('link', { name: /edit/i });
        expect(editButtons).toHaveLength(2);
      });
    });

    test('displays delete buttons for each item', async () => {
      renderComponent();

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        expect(deleteButtons).toHaveLength(2);
      });
    });
  });

  describe('delete functionality', () => {
    test('calls delete when delete button clicked and confirmed', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      productVariationService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('eBook Version')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this product variation?');
        expect(productVariationService.delete).toHaveBeenCalledWith('1');
      });
    });

    test('does not delete when cancelled', async () => {
      window.confirm = vi.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('eBook Version')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(productVariationService.delete).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      productVariationService.getAll.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch product variations/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      productVariationService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('eBook Version')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete product variation/i)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    test('renders empty state when no data', async () => {
      productVariationService.getAll.mockResolvedValueOnce([]);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no product variations found/i)).toBeInTheDocument();
      });
    });
  });

  describe('superuser check', () => {
    test('redirects non-superuser away from page', async () => {
      useAuth.mockReturnValue({
        isSuperuser: false,
        isApprentice: false,
        isStudyPlus: false,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /product variations/i })).not.toBeInTheDocument();
      });
    });
  });
});
