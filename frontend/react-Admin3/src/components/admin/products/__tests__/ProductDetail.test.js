// src/components/admin/products/__tests__/ProductDetail.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdminProductDetail from '../ProductDetail';

// Mock navigate function
const mockNavigate = jest.fn();

// Create mock for react-router-dom
jest.mock('react-router-dom', () => {
  return {
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '1' }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// Mock productService
jest.mock('../../../../services/productService', () => ({
  __esModule: true,
  default: {
    getById: jest.fn(),
    delete: jest.fn(),
  },
}));

import productService from '../../../../services/productService';

const theme = createTheme();

const mockProduct = {
  id: '1',
  code: 'CM2-SM',
  fullname: 'CM2 Study Material Bundle',
  shortname: 'CM2 Bundle',
  description: 'Complete study material for CM2',
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-06-15T12:00:00Z',
};

const renderComponent = () => {
  return render(
    <ThemeProvider theme={theme}>
      <AdminProductDetail />
    </ThemeProvider>
  );
};

describe('AdminProductDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    productService.getById.mockResolvedValue(mockProduct);
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /product details/i })).toBeInTheDocument();
      });
    });

    test('renders loading state initially', () => {
      productService.getById.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('renders product fullname in card header', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Study Material Bundle')).toBeInTheDocument();
      });
    });
  });

  describe('product data display', () => {
    test('displays product code', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2-SM')).toBeInTheDocument();
      });
    });

    test('displays product short name', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Bundle')).toBeInTheDocument();
      });
    });

    test('displays product description', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Complete study material for CM2')).toBeInTheDocument();
      });
    });

    test('displays active status', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    test('displays inactive status when product is not active', async () => {
      productService.getById.mockResolvedValueOnce({ ...mockProduct, active: false });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Inactive')).toBeInTheDocument();
      });
    });

    test('displays "No description" when description is empty', async () => {
      productService.getById.mockResolvedValueOnce({ ...mockProduct, description: '' });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No description')).toBeInTheDocument();
      });
    });
  });

  describe('action buttons', () => {
    test('renders edit button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument();
      });
    });

    test('renders delete button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
    });

    test('renders back to list button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /back to list/i })).toBeInTheDocument();
      });
    });
  });

  describe('delete functionality', () => {
    test('calls delete when delete button clicked and confirmed', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      productService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Study Material Bundle')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this product?');
        expect(productService.delete).toHaveBeenCalledWith('1');
        expect(mockNavigate).toHaveBeenCalledWith('/products');
      });
    });

    test('does not delete when cancelled', async () => {
      window.confirm = jest.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Study Material Bundle')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      expect(productService.delete).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      productService.getById.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to load product details/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      productService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Study Material Bundle')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to delete product/i)).toBeInTheDocument();
      });
    });
  });
});
