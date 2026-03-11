import { vi } from 'vitest';
// src/components/admin/prices/__tests__/PriceList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminPriceList from '../PriceList.js';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.js', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.js';

// Mock priceService
vi.mock('../../../../services/priceService.js', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  },
}));

import priceService from '../../../../services/priceService.js';

import appTheme from '../../../../theme';
const theme = appTheme;

const mockPrices = [
  {
    id: '1',
    product: 10,
    product_code: 'CM2/PC/2025-04',
    price_type: 'standard',
    amount: '99.99',
    currency: 'GBP',
  },
  {
    id: '2',
    product: 10,
    product_code: 'CM2/PC/2025-04',
    price_type: 'retaker',
    amount: '79.99',
    currency: 'GBP',
  },
  {
    id: '3',
    product: 20,
    product_code: 'SA1/EB/2025-04',
    price_type: 'standard',
    amount: '49.99',
    currency: 'GBP',
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AdminPriceList />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AdminPriceList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    priceService.list.mockResolvedValue({ results: mockPrices, count: mockPrices.length });
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /prices/i })).toBeInTheDocument();
      });
    });

    test('renders loading state initially', () => {
      priceService.list.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('renders add new price button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /add new price/i })).toBeInTheDocument();
      });
    });
  });

  describe('grouped data display', () => {
    test('groups prices by product and shows product codes', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
        expect(screen.getByText('SA1/EB/2025-04')).toBeInTheDocument();
      });
    });

    test('shows two grouped rows from three price records', async () => {
      renderComponent();

      await waitFor(() => {
        // 3 prices grouped into 2 product rows
        const rows = screen.getAllByRole('row');
        // 1 header row + 2 data rows = 3
        expect(rows).toHaveLength(3);
      });
    });

    test('pivots price types into columns', async () => {
      renderComponent();

      await waitFor(() => {
        // CM2 product has standard £99.99 and retaker £79.99
        expect(screen.getByText('£99.99')).toBeInTheDocument();
        expect(screen.getByText('£79.99')).toBeInTheDocument();
        // SA1 product has standard £49.99
        expect(screen.getByText('£49.99')).toBeInTheDocument();
      });
    });

    test('shows em-dash for missing price types', async () => {
      renderComponent();

      await waitFor(() => {
        // SA1 has no retaker or additional prices — should show em-dashes
        const dashes = screen.getAllByText('—');
        expect(dashes.length).toBeGreaterThanOrEqual(1);
      });
    });

    test('shows product and price count summary', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/2 products, 3 prices total/i)).toBeInTheDocument();
      });
    });

    test('displays edit icon buttons for each product row', async () => {
      renderComponent();

      await waitFor(() => {
        const editButtons = screen.getAllByRole('link', { name: /edit prices/i });
        expect(editButtons).toHaveLength(2);
      });
    });

    test('displays delete icon buttons for each product row', async () => {
      renderComponent();

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete prices/i });
        expect(deleteButtons).toHaveLength(2);
      });
    });
  });

  describe('delete functionality', () => {
    test('deletes all prices for a product when confirmed', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      priceService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete prices/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        // CM2 product has 2 prices (IDs 1 and 2), both should be deleted
        expect(priceService.delete).toHaveBeenCalledWith('1');
        expect(priceService.delete).toHaveBeenCalledWith('2');
        expect(priceService.delete).toHaveBeenCalledTimes(2);
      });
    });

    test('does not delete when cancelled', async () => {
      window.confirm = vi.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete prices/i });
      fireEvent.click(deleteButtons[0]);

      expect(priceService.delete).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      priceService.list.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch prices/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      priceService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete prices/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete prices/i)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    test('displays empty message when no prices', async () => {
      priceService.list.mockResolvedValueOnce({ results: [], count: 0 });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no prices found/i)).toBeInTheDocument();
      });
    });
  });

  describe('pagination', () => {
    test('passes pagination params with page_size 500', async () => {
      renderComponent();

      await waitFor(() => {
        expect(priceService.list).toHaveBeenCalledWith({
          page: 1,
          page_size: 500,
        });
      });
    });
  });

  describe('links', () => {
    test('add new price links to correct path', async () => {
      renderComponent();

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /add new price/i });
        expect(link).toHaveAttribute('href', '/admin/prices/new');
      });
    });

    test('edit button links to first price edit page', async () => {
      renderComponent();

      await waitFor(() => {
        const editButtons = screen.getAllByRole('link', { name: /edit prices/i });
        expect(editButtons[0]).toHaveAttribute('href', '/admin/prices/1/edit');
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

      expect(screen.queryByRole('heading', { name: /prices/i })).not.toBeInTheDocument();
    });
  });
});
