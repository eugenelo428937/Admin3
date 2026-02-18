// src/components/admin/prices/__tests__/PriceList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminPriceList from '../PriceList';

// Mock useAuth
jest.mock('../../../../hooks/useAuth', () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth';

// Mock priceService
jest.mock('../../../../services/priceService', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
  },
}));

import priceService from '../../../../services/priceService';

const theme = createTheme();

const mockPrices = [
  {
    id: '1',
    product_code: 'CM2/PC/2025-04',
    price_type: 'standard',
    amount: '99.99',
    currency: 'GBP',
  },
  {
    id: '2',
    product_code: 'SA1/EB/2025-04',
    price_type: 'retaker',
    amount: '79.99',
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
    jest.clearAllMocks();
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

  describe('data display', () => {
    test('fetches and displays prices', async () => {
      renderComponent();

      await waitFor(() => {
        expect(priceService.list).toHaveBeenCalled();
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
        expect(screen.getByText('SA1/EB/2025-04')).toBeInTheDocument();
        expect(screen.getByText('99.99')).toBeInTheDocument();
        expect(screen.getByText('79.99')).toBeInTheDocument();
      });
    });

    test('displays edit buttons for each price', async () => {
      renderComponent();

      await waitFor(() => {
        const editButtons = screen.getAllByRole('link', { name: /edit/i });
        expect(editButtons).toHaveLength(2);
      });
    });

    test('displays delete buttons for each price', async () => {
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
      priceService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this price?');
        expect(priceService.delete).toHaveBeenCalledWith('1');
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
      window.confirm = jest.fn().mockReturnValue(true);
      priceService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2/PC/2025-04')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete price/i)).toBeInTheDocument();
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

  describe('links', () => {
    test('add new price links to correct path', async () => {
      renderComponent();

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /add new price/i });
        expect(link).toHaveAttribute('href', '/admin/prices/new');
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
