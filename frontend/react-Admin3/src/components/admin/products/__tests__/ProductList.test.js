import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminProductList from '../ProductList.tsx';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.tsx', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.tsx';

// Mock catalogProductService
vi.mock('../../../../services/catalogProductService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock ProductTable
vi.mock('../ProductTable.tsx', () => ({
  __esModule: true,
  default: function MockProductTable({ products, onDelete }) {
    return (
      <div data-testid="product-table">
        {products.map((product) => (
          <div key={product.id} data-testid={`product-row-${product.id}`}>
            <span>{product.fullname}</span>
            <button onClick={() => onDelete(product.id)}>Delete {product.code}</button>
          </div>
        ))}
      </div>
    );
  },
}));

import catalogProductService from '../../../../services/catalogProductService';

const mockProducts = [
  {
    id: '1',
    code: 'CM2-SM',
    fullname: 'CM2 Study Material Bundle',
    shortname: 'CM2 Bundle',
    active: true,
  },
  {
    id: '2',
    code: 'SA1-TUT',
    fullname: 'SA1 Tutorial Sessions',
    shortname: 'SA1 Tutorials',
    active: true,
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AdminProductList />
    </BrowserRouter>
  );
};

describe('AdminProductList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    catalogProductService.list.mockResolvedValue({ results: mockProducts, count: mockProducts.length });
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /products/i })).toBeInTheDocument();
      });
    });

    test('renders loading state initially', () => {
      catalogProductService.list.mockReturnValue(new Promise(() => {}));
      renderComponent();

      // AdminLoadingState renders skeletons, check the heading is still rendered
      expect(screen.getByRole('heading', { name: /products/i })).toBeInTheDocument();
    });

    test('renders add new product button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add new product/i })).toBeInTheDocument();
      });
    });

    test('renders import products button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import products/i })).toBeInTheDocument();
      });
    });
  });

  describe('data display', () => {
    test('fetches and displays products', async () => {
      renderComponent();

      await waitFor(() => {
        expect(catalogProductService.list).toHaveBeenCalled();
        expect(screen.getByTestId('product-table')).toBeInTheDocument();
        expect(screen.getByText('CM2 Study Material Bundle')).toBeInTheDocument();
        expect(screen.getByText('SA1 Tutorial Sessions')).toBeInTheDocument();
      });
    });

    test('passes products to ProductTable', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('product-row-1')).toBeInTheDocument();
        expect(screen.getByTestId('product-row-2')).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    test('displays empty message when no products', async () => {
      catalogProductService.list.mockResolvedValueOnce({ results: [], count: 0 });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no products found/i)).toBeInTheDocument();
      });
    });
  });

  describe('delete functionality', () => {
    test('calls delete when delete action triggered', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      catalogProductService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Study Material Bundle')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Delete CM2-SM'));

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this product?');
        expect(catalogProductService.delete).toHaveBeenCalledWith('1');
      });
    });

    test('does not delete when cancelled', async () => {
      window.confirm = vi.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Study Material Bundle')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Delete CM2-SM'));

      expect(catalogProductService.delete).not.toHaveBeenCalled();
    });

    test('removes product from list after successful delete', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      catalogProductService.delete.mockResolvedValue({});
      const remainingProducts = [mockProducts[1]];
      catalogProductService.list
        .mockResolvedValueOnce({ results: mockProducts, count: mockProducts.length })
        .mockResolvedValueOnce({ results: remainingProducts, count: remainingProducts.length });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Study Material Bundle')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Delete CM2-SM'));

      await waitFor(() => {
        expect(screen.queryByTestId('product-row-1')).not.toBeInTheDocument();
        expect(screen.getByTestId('product-row-2')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      catalogProductService.list.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to load products/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      catalogProductService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Study Material Bundle')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Delete CM2-SM'));

      await waitFor(() => {
        expect(screen.getByText(/failed to delete product/i)).toBeInTheDocument();
      });
    });
  });
});
