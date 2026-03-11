import { vi } from 'vitest';
// src/components/admin/product-bundles/__tests__/ProductBundleList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminProductBundleList from '../ProductBundleList.js';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.js', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.js';

// Mock catalogBundleService
vi.mock('../../../../services/catalogBundleService.js', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  },
}));

import catalogBundleService from '../../../../services/catalogBundleService.js';

import appTheme from '../../../../theme';
// Mock BundleProductsPanel to avoid testing its internals here
vi.mock('../BundleProductsPanel.js', () => ({
  __esModule: true,
  default: function MockBundleProductsPanel({ bundleId }) {
    return <div data-testid={`expand-row-${bundleId}`}>Products for {bundleId}</div>;
  },
}));

const theme = appTheme;

const mockBundles = [
  {
    id: '1',
    bundle_name: 'CM2 Bundle',
    subject: { code: 'CM2' },
    is_featured: true,
    is_active: true,
  },
  {
    id: '2',
    bundle_name: 'SA1 Bundle',
    subject: { code: 'SA1' },
    is_featured: false,
    is_active: false,
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AdminProductBundleList />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AdminProductBundleList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    catalogBundleService.list.mockResolvedValue({ results: mockBundles, count: mockBundles.length });
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /product bundles/i })).toBeInTheDocument();
      });
    });

    test('renders create new button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /create new product bundle/i })).toBeInTheDocument();
      });
    });

    test('renders table headers', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Bundle Name' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Subject' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Is Featured' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Is Active' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
      });
    });

    test('shows loading state initially', () => {
      catalogBundleService.list.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('data display', () => {
    test('fetches and displays product bundles', async () => {
      renderComponent();

      await waitFor(() => {
        expect(catalogBundleService.list).toHaveBeenCalled();
        expect(screen.getByText('CM2 Bundle')).toBeInTheDocument();
        expect(screen.getByText('SA1 Bundle')).toBeInTheDocument();
      });
    });

    test('displays edit buttons for each item', async () => {
      renderComponent();

      await waitFor(() => {
        const editButtons = screen.getAllByRole('link', { name: /edit/i });
        expect(editButtons).toHaveLength(2);
      });
    });

    test('displays delete buttons for each item', async () => {
      renderComponent();

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        expect(deleteButtons).toHaveLength(2);
      });
    });
  });

  describe('delete functionality', () => {
    test('calls delete when delete button clicked and confirmed', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      catalogBundleService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Bundle')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this product bundle?');
        expect(catalogBundleService.delete).toHaveBeenCalledWith('1');
      });
    });

    test('does not delete when cancelled', async () => {
      window.confirm = vi.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Bundle')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(catalogBundleService.delete).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      catalogBundleService.list.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch product bundles/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      catalogBundleService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Bundle')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete product bundle/i)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    test('renders empty state when no data', async () => {
      catalogBundleService.list.mockResolvedValueOnce({ results: [], count: 0 });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no product bundles found/i)).toBeInTheDocument();
      });
    });
  });

  describe('superuser check', () => {
    test('redirects non-superuser away from page', async () => {
      useAuth.mockReturnValue({
        isSuperuser: false,
        isApprentice: false,
        isStudyPlus: false,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /product bundles/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('expandable rows', () => {
    test('renders expand button for each bundle', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('CM2 Bundle')).toBeInTheDocument();
      });

      const expandButtons = screen.getAllByLabelText(/expand products for/i);
      expect(expandButtons).toHaveLength(2);
    });

    test('expand button toggles row expansion', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('CM2 Bundle')).toBeInTheDocument();
      });

      const expandButton = screen.getByLabelText(/expand products for CM2 Bundle/i);
      fireEvent.click(expandButton);

      expect(screen.getByTestId('expand-row-1')).toBeInTheDocument();
      expect(screen.getByLabelText(/collapse products for CM2 Bundle/i)).toBeInTheDocument();
    });

    test('clicking expand on another row collapses the first', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('CM2 Bundle')).toBeInTheDocument();
      });

      // Expand row 1
      fireEvent.click(screen.getByLabelText(/expand products for CM2 Bundle/i));
      expect(screen.getByTestId('expand-row-1')).toBeInTheDocument();

      // Expand row 2
      fireEvent.click(screen.getByLabelText(/expand products for SA1 Bundle/i));
      expect(screen.getByTestId('expand-row-2')).toBeInTheDocument();

      // Row 1 should be collapsed
      await waitFor(() => {
        expect(screen.queryByTestId('expand-row-1')).not.toBeInTheDocument();
      });
    });
  });
});
