import { vi } from 'vitest';
// src/components/admin/store-products/__tests__/StoreProductForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import AdminStoreProductForm from '../StoreProductForm.js';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.js', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.js';

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

// Mock storeProductService
vi.mock('../../../../services/storeProductService.js', () => ({
  __esModule: true,
  default: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock examSessionSubjectService
vi.mock('../../../../services/examSessionSubjectService.js', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
  },
}));

// Mock productProductVariationService
vi.mock('../../../../services/productProductVariationService.js', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
  },
}));

import storeProductService from '../../../../services/storeProductService.js';
import examSessionSubjectService from '../../../../services/examSessionSubjectService.js';
import productProductVariationService from '../../../../services/productProductVariationService.js';

const theme = appTheme;

// import gets the mocked version since vi.mock is hoisted
import { useParams } from 'react-router-dom';
import appTheme from '../../../../theme';
const setMockParams = (params) => {
  useParams.mockReturnValue(params);
};

const mockEssData = [
  { id: '1', subject_code: 'CM2', session_code: '2025-04' },
  { id: '2', subject_code: 'SA1', session_code: '2025-09' },
];

const mockPpvData = [
  { id: '1', product_code: 'CM2-SM', variation_code: 'EB' },
  { id: '2', product_code: 'SA1-SM', variation_code: 'PR' },
];

const renderComponent = (isEditMode = false) => {
  if (isEditMode) {
    setMockParams({ id: '1' });
  } else {
    setMockParams({});
  }

  return render(
    <ThemeProvider theme={theme}>
      <AdminStoreProductForm />
    </ThemeProvider>
  );
};

describe('AdminStoreProductForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    examSessionSubjectService.getAll.mockResolvedValue(mockEssData);
    productProductVariationService.getAll.mockResolvedValue(mockPpvData);
  });

  describe('create mode', () => {
    test('renders create form title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add new store product/i })).toBeInTheDocument();
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
        expect(screen.getByRole('button', { name: /create store product/i })).toBeInTheDocument();
      });
    });

    test('fetches dropdown data on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(examSessionSubjectService.getAll).toHaveBeenCalled();
        expect(productProductVariationService.getAll).toHaveBeenCalled();
      });
    });
  });

  describe('edit mode', () => {
    const mockStoreProduct = {
      id: '1',
      product_code: 'CM2/PC/2025-04',
      exam_session_subject: 1,
      product_product_variation: 1,
      is_active: true,
    };

    beforeEach(() => {
      storeProductService.getById.mockResolvedValue(mockStoreProduct);
    });

    test('renders edit form title', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit store product/i })).toBeInTheDocument();
      });
    });

    test('fetches store product data on mount', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(storeProductService.getById).toHaveBeenCalledWith('1');
      });
    });

    test('shows update button in edit mode', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update store product/i })).toBeInTheDocument();
      });
    });

    test('displays fetched product code', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('CM2/PC/2025-04')).toBeInTheDocument();
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

      expect(mockNavigate).toHaveBeenCalledWith('/admin/store-products');
    });
  });

  describe('error handling', () => {
    test('shows error when fetch fails in edit mode', async () => {
      storeProductService.getById.mockRejectedValueOnce(new Error('Fetch error'));

      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByText(/failed to load store product/i)).toBeInTheDocument();
      });
    });

    test('shows error when dropdown data fetch fails', async () => {
      examSessionSubjectService.getAll.mockRejectedValueOnce(new Error('Dropdown error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to load dropdown options/i)).toBeInTheDocument();
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
