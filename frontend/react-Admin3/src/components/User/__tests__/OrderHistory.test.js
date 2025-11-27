// src/components/User/__tests__/OrderHistory.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import OrderHistory from '../OrderHistory';

// Mock cartService
jest.mock('../../../services/cartService', () => ({
  __esModule: true,
  default: {
    fetchOrders: jest.fn(),
  },
}));

// Mock productCodeGenerator
jest.mock('../../../utils/productCodeGenerator', () => ({
  generateProductCode: jest.fn((item) => `CODE-${item.id || '001'}`),
}));

import cartService from '../../../services/cartService';

const theme = createTheme();

const renderComponent = () => {
  return render(
    <ThemeProvider theme={theme}>
      <OrderHistory />
    </ThemeProvider>
  );
};

describe('OrderHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    test('shows loading spinner while fetching orders', () => {
      cartService.fetchOrders.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: [] }), 1000))
      );

      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    test('shows message when no orders found', async () => {
      cartService.fetchOrders.mockResolvedValueOnce({ data: [] });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no orders found/i)).toBeInTheDocument();
      });
    });
  });

  describe('error state', () => {
    test('shows error message when fetch fails', async () => {
      cartService.fetchOrders.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to load order history/i)).toBeInTheDocument();
      });
    });
  });

  describe('with orders', () => {
    const mockOrders = [
      {
        id: 'ORD001',
        created_at: '2024-01-15T10:30:00Z',
        items: [
          {
            id: 'ITEM001',
            product_name: 'CM2 Study Material',
            quantity: 1,
            actual_price: '125.00',
          },
        ],
      },
      {
        id: 'ORD002',
        created_at: '2024-01-20T14:00:00Z',
        items: [
          {
            id: 'ITEM002',
            product_name: 'SP1 Printed Notes',
            quantity: 2,
            actual_price: '89.99',
            price_type: 'retaker',
          },
        ],
      },
    ];

    test('renders order history title', async () => {
      cartService.fetchOrders.mockResolvedValueOnce({ data: mockOrders });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Order History')).toBeInTheDocument();
      });
    });

    test('renders order table headers', async () => {
      cartService.fetchOrders.mockResolvedValueOnce({ data: mockOrders });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Order #')).toBeInTheDocument();
        expect(screen.getByText('Date')).toBeInTheDocument();
        expect(screen.getByText('Items')).toBeInTheDocument();
      });
    });

    test('renders order IDs', async () => {
      cartService.fetchOrders.mockResolvedValueOnce({ data: mockOrders });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('ORD001')).toBeInTheDocument();
        expect(screen.getByText('ORD002')).toBeInTheDocument();
      });
    });

    test('renders product names', async () => {
      cartService.fetchOrders.mockResolvedValueOnce({ data: mockOrders });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Study Material')).toBeInTheDocument();
        expect(screen.getByText('SP1 Printed Notes')).toBeInTheDocument();
      });
    });

    test('renders prices', async () => {
      cartService.fetchOrders.mockResolvedValueOnce({ data: mockOrders });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('£125.00')).toBeInTheDocument();
        expect(screen.getByText('£89.99')).toBeInTheDocument();
      });
    });

    test('renders retaker badge for retaker price type', async () => {
      cartService.fetchOrders.mockResolvedValueOnce({ data: mockOrders });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Retaker')).toBeInTheDocument();
      });
    });
  });

  describe('tutorial orders', () => {
    const mockTutorialOrder = {
      id: 'ORD003',
      created_at: '2024-02-01T09:00:00Z',
      items: [
        {
          id: 'ITEM003',
          metadata: {
            type: 'tutorial',
            title: 'CM2 Bristol Tutorial',
            subjectCode: 'CM2',
            location: 'Bristol',
            eventCode: 'CM2-BRI-2024',
            venue: 'Bristol Conference Centre',
            startDate: '2024-03-15',
            endDate: '2024-03-17',
            choice: '1st',
          },
          quantity: 1,
          actual_price: '450.00',
        },
      ],
    };

    test('renders tutorial title', async () => {
      cartService.fetchOrders.mockResolvedValueOnce({ data: [mockTutorialOrder] });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Bristol Tutorial')).toBeInTheDocument();
      });
    });

    test('renders tutorial location and subject', async () => {
      cartService.fetchOrders.mockResolvedValueOnce({ data: [mockTutorialOrder] });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/CM2 - Bristol/i)).toBeInTheDocument();
      });
    });

    test('renders choice badge', async () => {
      cartService.fetchOrders.mockResolvedValueOnce({ data: [mockTutorialOrder] });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('1st Choice')).toBeInTheDocument();
      });
    });
  });
});
