import { vi } from 'vitest';
// src/components/admin/prices/__tests__/PriceForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPriceForm from '../PriceForm.js';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.tsx', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.tsx';

// Mock navigate function
const mockNavigate = vi.fn();

// Create mock for react-router-dom
vi.mock('react-router-dom', () => {
  return {
    useNavigate: vi.fn(() => mockNavigate),
    useParams: vi.fn(() => ({})),
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
  };
});

// Mock priceService
vi.mock('../../../../services/priceService', () => ({
  __esModule: true,
  default: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock storeProductService
vi.mock('../../../../services/storeProductService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
  },
}));

import priceService from '../../../../services/priceService';
import storeProductService from '../../../../services/storeProductService';

// import gets the mocked version since vi.mock is hoisted
import { useParams } from 'react-router-dom';

const setMockParams = (params) => {
  useParams.mockReturnValue(params);
};

const mockStoreProductData = [
  { id: '1', product_code: 'CM2/PC/2025-04' },
  { id: '2', product_code: 'SA1/EB/2025-04' },
];

const renderComponent = (isEditMode = false) => {
  if (isEditMode) {
    setMockParams({ id: '1' });
  } else {
    setMockParams({});
  }

  return render(<AdminPriceForm />);
};

describe('AdminPriceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    storeProductService.getAll.mockResolvedValue(mockStoreProductData);
  });

  describe('create mode', () => {
    test('renders create form title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add new price/i })).toBeInTheDocument();
      });
    });

    test('renders cancel button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    test('renders create button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create price/i })).toBeInTheDocument();
      });
    });

    test('fetches dropdown data on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(storeProductService.getAll).toHaveBeenCalled();
      });
    });
  });

  describe('edit mode', () => {
    const mockPrice = {
      id: '1',
      product: 1,
      price_type: 'standard',
      amount: '99.99',
      currency: 'GBP',
    };

    beforeEach(() => {
      priceService.getById.mockResolvedValue(mockPrice);
    });

    test('renders edit form title', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit price/i })).toBeInTheDocument();
      });
    });

    test('fetches price data on mount', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(priceService.getById).toHaveBeenCalledWith('1');
      });
    });

    test('shows update button in edit mode', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update price/i })).toBeInTheDocument();
      });
    });

    test('displays fetched amount', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('99.99')).toBeInTheDocument();
      });
    });

    test('displays fetched currency', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('GBP')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    test('navigates to list on cancel', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/prices');
    });
  });

  describe('error handling', () => {
    test('shows error when fetch fails in edit mode', async () => {
      priceService.getById.mockRejectedValueOnce(new Error('Fetch error'));

      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByText(/failed to load price/i)).toBeInTheDocument();
      });
    });

    test('shows error when dropdown data fetch fails', async () => {
      storeProductService.getAll.mockRejectedValueOnce(new Error('Dropdown error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to load store products/i)).toBeInTheDocument();
      });
    });
  });

  describe('authorization', () => {
    test('redirects non-superuser to home', () => {
      useAuth.mockReturnValue({
        isSuperuser: false,
        isApprentice: false,
        isStudyPlus: false,
      });

      renderComponent();

      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
    });
  });
});
