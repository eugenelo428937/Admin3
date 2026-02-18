// src/components/admin/store-products/__tests__/StoreProductList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminStoreProductList from '../StoreProductList';

// Mock useAuth
jest.mock('../../../../hooks/useAuth', () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth';

// Mock storeProductService
jest.mock('../../../../services/storeProductService', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
  },
}));

import storeProductService from '../../../../services/storeProductService';

const theme = createTheme();

const mockStoreProducts = [
  {
    id: '1',
    product_code: 'CM2/PC/2025-04',
    subject_code: 'CM2',
    session_code: '2025-04',
    variation_type: 'Printed',
    product_name: 'CM2 Printed Material',
    is_active: true,
  },
  {
    id: '2',
    product_code: 'SA1/EB/2025-04',
    subject_code: 'SA1',
    session_code: '2025-04',
    variation_type: 'eBook',
    product_name: 'SA1 eBook Material',
    is_active: false,
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AdminStoreProductList />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AdminStoreProductList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    storeProductService.list.mockResolvedValue({ results: mockStoreProducts, count: mockStoreProducts.length });
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /store products/i })).toBeInTheDocument();
      });
    });

    test('renders loading state initially', () => {
      storeProductService.list.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('renders add new store product button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /add new store product/i })).toBeInTheDocument();
      });
    });
  });

  describe('data display', () => {
    test('fetches and displays store products', async () => {
      renderComponent();

      await waitFor(() => {
        expect(storeProductService.list).toHaveBeenCalled();
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
        expect(screen.getByText('SA1/EB/2025-04')).toBeInTheDocument();
      });
    });

    test('displays edit buttons for each store product', async () => {
      renderComponent();

      await waitFor(() => {
        const editButtons = screen.getAllByRole('link', { name: /edit/i });
        expect(editButtons).toHaveLength(2);
      });
    });

    test('displays delete buttons for each store product', async () => {
      renderComponent();

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        expect(deleteButtons).toHaveLength(2);
      });
    });
  });

  describe('delete functionality', () => {
    test('calls delete when delete button clicked and confirmed', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      storeProductService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this store product?');
        expect(storeProductService.delete).toHaveBeenCalledWith('1');
      });
    });

    test('does not delete when cancelled', async () => {
      window.confirm = jest.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(storeProductService.delete).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      storeProductService.list.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch store products/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      storeProductService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete store product/i)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    test('displays empty message when no store products', async () => {
      storeProductService.list.mockResolvedValueOnce({ results: [], count: 0 });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no store products found/i)).toBeInTheDocument();
      });
    });
  });

  describe('links', () => {
    test('add new store product links to correct path', async () => {
      renderComponent();

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /add new store product/i });
        expect(link).toHaveAttribute('href', '/admin/store-products/new');
      });
    });
  });

  describe('superuser access', () => {
    test('redirects non-superuser away', () => {
      useAuth.mockReturnValue({
        isSuperuser: false,
        isApprentice: false,
        isStudyPlus: false,
      });

      renderComponent();

      expect(screen.queryByRole('heading', { name: /store products/i })).not.toBeInTheDocument();
    });
  });
});
