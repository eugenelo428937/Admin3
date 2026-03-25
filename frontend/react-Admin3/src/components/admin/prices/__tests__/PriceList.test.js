import { vi } from 'vitest';
// src/components/admin/prices/__tests__/PriceList.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AdminPriceList from '../PriceList.js';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.tsx', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.tsx';

// Mock priceService
vi.mock('../../../../services/priceService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  },
}));

import priceService from '../../../../services/priceService';

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
      <AdminPriceList />
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

      // AdminDataTable shows Skeleton loading state — data not yet rendered
      expect(screen.queryByText('CM2/PC/2025-04')).not.toBeInTheDocument();
    });

    test('renders add new price button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add new price/i })).toBeInTheDocument();
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

    test('displays action menu buttons for each product row', async () => {
      renderComponent();

      await waitFor(() => {
        const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
        expect(menuButtons).toHaveLength(2);
      });
    });

    test('displays edit action in dropdown menu', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /edit prices/i })).toBeInTheDocument();
      });
    });

    test('displays delete action in dropdown menu', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete prices/i })).toBeInTheDocument();
      });
    });
  });

  describe('delete functionality', () => {
    test('deletes all prices for a product when confirmed', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(true);
      priceService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete prices/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete prices/i }));

      await waitFor(() => {
        // CM2 product has 2 prices (IDs 1 and 2), both should be deleted
        expect(priceService.delete).toHaveBeenCalledWith('1');
        expect(priceService.delete).toHaveBeenCalledWith('2');
        expect(priceService.delete).toHaveBeenCalledTimes(2);
      });
    });

    test('does not delete when cancelled', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete prices/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete prices/i }));

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
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(true);
      priceService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete prices/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete prices/i }));

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
