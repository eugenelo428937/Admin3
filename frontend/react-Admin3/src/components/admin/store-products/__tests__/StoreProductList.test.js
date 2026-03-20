import { vi } from 'vitest';
// src/components/admin/store-products/__tests__/StoreProductList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminStoreProductList from '../StoreProductList.js';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.tsx', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.tsx';

// Mock storeProductService
vi.mock('../../../../services/storeProductService', () => ({
  __esModule: true,
  default: {
    adminList: vi.fn(),
    delete: vi.fn(),
  },
}));

import storeProductService from '../../../../services/storeProductService';

import appTheme from '../../../../theme';
const theme = appTheme;

const mockStoreProducts = [
  {
    id: '1',
    product_code: 'CM2/PC/2025-04',
    subject_code: 'CM2',
    session_code: '2025-04',
    variation_type: 'Printed',
    variation_name: 'Printed Copy',
    product_name: 'CM2 Core Reading',
    catalog_product_id: 10,
    catalog_product_code: 'CM2CR',
    is_active: true,
  },
  {
    id: '2',
    product_code: 'CM2/EB/2025-04',
    subject_code: 'CM2',
    session_code: '2025-04',
    variation_type: 'eBook',
    variation_name: 'eBook',
    product_name: 'CM2 Core Reading',
    catalog_product_id: 10,
    catalog_product_code: 'CM2CR',
    is_active: true,
  },
  {
    id: '3',
    product_code: 'SA1/EB/2025-04',
    subject_code: 'SA1',
    session_code: '2025-04',
    variation_type: 'eBook',
    variation_name: 'eBook',
    product_name: 'SA1 Study Notes',
    catalog_product_id: 20,
    catalog_product_code: 'SA1SN',
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

/** Helper: toggle a session by clicking its header.
 *  Note: sessions start EXPANDED by default (component uses inverted logic). */
const toggleSession = (sessionCode) => {
  const sessionHeader = screen.getByText(new RegExp(`exam session: ${sessionCode}`, 'i')).closest('tr');
  fireEvent.click(sessionHeader);
};

/** Helper: toggle a subject by clicking its header.
 *  Note: subjects start COLLAPSED by default. */
const toggleSubject = (subjectCode) => {
  const subjectHeader = screen.getByText(new RegExp(`subject: ${subjectCode}`, 'i')).closest('tr');
  fireEvent.click(subjectHeader);
};

describe('AdminStoreProductList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    storeProductService.adminList.mockResolvedValue({ results: mockStoreProducts, count: mockStoreProducts.length });
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /store products/i })).toBeInTheDocument();
      });
    });

    test('renders loading state initially', () => {
      storeProductService.adminList.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('renders add new store product button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /add new store product/i })).toBeInTheDocument();
      });
    });

    test('displays total product count from API', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/3 store products total/i)).toBeInTheDocument();
      });
    });
  });

  describe('hierarchical grouping', () => {
    test('displays exam session group headers', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/exam session: 2025-04/i)).toBeInTheDocument();
      });
    });

    test('displays subject group headers when session is expanded', async () => {
      renderComponent();

      // Sessions are expanded by default, so subjects should be visible
      await waitFor(() => {
        expect(screen.getByText(/subject: cm2/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/subject: sa1/i)).toBeInTheDocument();
    });

    test('displays catalog product rows when session and subject are expanded', async () => {
      renderComponent();

      // Sessions are expanded by default; expand subject
      await waitFor(() => {
        expect(screen.getByText(/subject: cm2/i)).toBeInTheDocument();
      });

      toggleSubject('cm2');

      expect(screen.getByText('CM2 Core Reading')).toBeInTheDocument();
    });

    test('displays variation counts per catalog product', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/subject: cm2/i)).toBeInTheDocument();
      });

      toggleSubject('cm2');

      // CM2 Core Reading has 2 variations
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('groups same catalog product variations together', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/subject: cm2/i)).toBeInTheDocument();
      });

      toggleSubject('cm2');

      // CM2CR should appear once (grouped), not twice
      const productCodes = screen.getAllByText('CM2CR');
      expect(productCodes).toHaveLength(1);
    });

    test('displays session product counts in header', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/2 subjects, 3 products/)).toBeInTheDocument();
      });
    });

    test('displays subject product counts in header', async () => {
      renderComponent();

      // Sessions are expanded by default, so subject headers with counts are visible
      await waitFor(() => {
        expect(screen.getByText(/1 product, 2 variations/)).toBeInTheDocument();
      });
    });
  });

  describe('collapsible sessions', () => {
    test('sessions are expanded by default', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/exam session: 2025-04/i)).toBeInTheDocument();
      });

      // Subject headers should be visible (session is expanded by default)
      expect(screen.getByText(/subject: cm2/i)).toBeInTheDocument();
      expect(screen.getByText(/subject: sa1/i)).toBeInTheDocument();
    });

    test('clicking session header collapses its content', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/subject: cm2/i)).toBeInTheDocument();
      });

      toggleSession('2025-04');

      // Subject headers should now be hidden
      expect(screen.queryByText(/subject: cm2/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/subject: sa1/i)).not.toBeInTheDocument();
    });

    test('clicking collapsed session header re-expands it', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/subject: cm2/i)).toBeInTheDocument();
      });

      // Collapse
      toggleSession('2025-04');
      expect(screen.queryByText(/subject: cm2/i)).not.toBeInTheDocument();

      // Re-expand
      toggleSession('2025-04');
      expect(screen.getByText(/subject: cm2/i)).toBeInTheDocument();
    });
  });

  describe('collapsible subjects', () => {
    test('subjects are collapsed by default', async () => {
      renderComponent();

      // Sessions are expanded by default, subjects visible
      await waitFor(() => {
        expect(screen.getByText(/subject: cm2/i)).toBeInTheDocument();
      });

      // Product rows should NOT be visible (subjects collapsed by default)
      expect(screen.queryByText('CM2 Core Reading')).not.toBeInTheDocument();
    });

    test('clicking subject header expands its products', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/subject: cm2/i)).toBeInTheDocument();
      });

      toggleSubject('cm2');

      expect(screen.getByText('CM2 Core Reading')).toBeInTheDocument();
    });

    test('expanding one subject does not expand another', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/subject: cm2/i)).toBeInTheDocument();
      });

      toggleSubject('cm2');

      // CM2 products visible, SA1 products remain hidden
      expect(screen.getByText('CM2 Core Reading')).toBeInTheDocument();
      expect(screen.queryByText('SA1 Study Notes')).not.toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    test('passes pagination params to adminList', async () => {
      renderComponent();

      await waitFor(() => {
        expect(storeProductService.adminList).toHaveBeenCalledWith({
          page: 1,
          page_size: 400,
        });
      });
    });

    test('shows pagination when total exceeds page size', async () => {
      storeProductService.adminList.mockResolvedValueOnce({
        results: mockStoreProducts,
        count: 500,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('500 store products total')).toBeInTheDocument();
      });
    });
  });

  describe('data display', () => {
    test('displays view buttons for catalog products', async () => {
      renderComponent();

      // Sessions expanded by default; expand both subjects to see product rows
      await waitFor(() => {
        expect(screen.getByText(/subject: cm2/i)).toBeInTheDocument();
      });

      toggleSubject('cm2');
      toggleSubject('sa1');

      const viewButtons = screen.getAllByRole('link', { name: /view/i });
      expect(viewButtons).toHaveLength(2);
    });

    test('view button links to catalog product detail', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/subject: cm2/i)).toBeInTheDocument();
      });

      toggleSubject('cm2');

      const viewButtons = screen.getAllByRole('link', { name: /view/i });
      expect(viewButtons[0]).toHaveAttribute('href', '/admin/products/10');
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      storeProductService.adminList.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch store products/i)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    test('displays empty message when no store products', async () => {
      storeProductService.adminList.mockResolvedValueOnce({ results: [], count: 0 });

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
