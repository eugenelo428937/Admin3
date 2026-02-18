// src/components/admin/store-bundles/__tests__/StoreBundleList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminStoreBundleList from '../StoreBundleList';

// Mock useAuth
jest.mock('../../../../hooks/useAuth', () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth';

// Mock storeBundleService
jest.mock('../../../../services/storeBundleService', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
  },
}));

import storeBundleService from '../../../../services/storeBundleService';

const theme = createTheme();

const mockStoreBundles = [
  {
    id: '1',
    name: 'CM2 Complete',
    subject_code: 'CM2',
    exam_session_code: '2025-04',
    is_active: true,
    components_count: 3,
  },
  {
    id: '2',
    name: 'SA1 Complete',
    subject_code: 'SA1',
    exam_session_code: '2025-09',
    is_active: false,
    components_count: 2,
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AdminStoreBundleList />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AdminStoreBundleList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    storeBundleService.list.mockResolvedValue({ results: mockStoreBundles, count: mockStoreBundles.length });
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /store bundles/i })).toBeInTheDocument();
      });
    });

    test('renders loading state initially', () => {
      storeBundleService.list.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('renders add new store bundle button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /add new store bundle/i })).toBeInTheDocument();
      });
    });
  });

  describe('data display', () => {
    test('fetches and displays store bundles', async () => {
      renderComponent();

      await waitFor(() => {
        expect(storeBundleService.list).toHaveBeenCalled();
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
      window.confirm = jest.fn().mockReturnValue(true);
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
      window.confirm = jest.fn().mockReturnValue(false);

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
      storeBundleService.list.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch store bundles/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
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
      storeBundleService.list.mockResolvedValueOnce({ results: [], count: 0 });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no store bundles found/i)).toBeInTheDocument();
      });
    });
  });

  describe('links', () => {
    test('add new store bundle links to correct path', async () => {
      renderComponent();

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /add new store bundle/i });
        expect(link).toHaveAttribute('href', '/admin/store-bundles/new');
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
