import { vi } from 'vitest';
// src/components/admin/store-bundles/__tests__/StoreBundleList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminStoreBundleList from '../StoreBundleList.tsx';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.tsx', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.tsx';

// Mock storeBundleService
vi.mock('../../../../services/storeBundleService', () => ({
  __esModule: true,
  default: {
    adminList: vi.fn(),
    delete: vi.fn(),
  },
}));

import storeBundleService from '../../../../services/storeBundleService';

// Mock StoreBundleProductsPanel to avoid testing its internals here
vi.mock('../StoreBundleProductsPanel.tsx', () => ({
  __esModule: true,
  default: function MockStoreBundleProductsPanel({ bundleId }) {
    return <div data-testid="bundle-products-panel">Products for bundle {bundleId}</div>;
  },
}));

const mockStoreBundles = [
  {
    id: '1',
    name: 'CM2 Complete',
    bundle_template_name: 'Complete Bundle',
    subject_code: 'CM2',
    exam_session_code: '2025-04',
    is_active: true,
    components_count: 3,
  },
  {
    id: '2',
    name: 'SA1 Complete',
    bundle_template_name: 'Complete Bundle',
    subject_code: 'SA1',
    exam_session_code: '2025-09',
    is_active: false,
    components_count: 2,
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AdminStoreBundleList />
    </BrowserRouter>
  );
};

describe('AdminStoreBundleList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    storeBundleService.adminList.mockResolvedValue({ results: mockStoreBundles, count: mockStoreBundles.length });
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /store bundles/i })).toBeInTheDocument();
      });
    });

    test('renders loading state initially', () => {
      storeBundleService.adminList.mockReturnValue(new Promise(() => {}));
      renderComponent();

      // AdminLoadingState renders skeleton rows; heading is still visible
      expect(screen.getByRole('heading', { name: /store bundles/i })).toBeInTheDocument();
    });

    test('renders add new store bundle button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add new store bundle/i })).toBeInTheDocument();
      });
    });
  });

  describe('data display', () => {
    test('fetches and displays store bundles', async () => {
      renderComponent();

      await waitFor(() => {
        expect(storeBundleService.adminList).toHaveBeenCalled();
        expect(screen.getByText('CM2 Complete')).toBeInTheDocument();
        expect(screen.getByText('SA1 Complete')).toBeInTheDocument();
      });
    });

    test('displays edit buttons for each store bundle', async () => {
      renderComponent();

      await waitFor(() => {
        const editButtons = screen.getAllByRole('link', { name: /edit/i });
        expect(editButtons).toHaveLength(2);
      });
    });

    test('displays delete buttons for each store bundle', async () => {
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
      storeBundleService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Complete')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this store bundle?');
        expect(storeBundleService.delete).toHaveBeenCalledWith('1');
      });
    });

    test('does not delete when cancelled', async () => {
      window.confirm = vi.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Complete')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(storeBundleService.delete).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      storeBundleService.adminList.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch store bundles/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      storeBundleService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 Complete')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete store bundle/i)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    test('displays empty message when no store bundles', async () => {
      storeBundleService.adminList.mockResolvedValueOnce({ results: [], count: 0 });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no store bundles found/i)).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    test('edit links point to correct paths', async () => {
      renderComponent();

      await waitFor(() => {
        const editLinks = screen.getAllByRole('link', { name: /edit/i });
        expect(editLinks[0]).toHaveAttribute('href', '/admin/store-bundles/1/edit');
        expect(editLinks[1]).toHaveAttribute('href', '/admin/store-bundles/2/edit');
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

      expect(screen.queryByRole('heading', { name: /store bundles/i })).not.toBeInTheDocument();
    });
  });
});
