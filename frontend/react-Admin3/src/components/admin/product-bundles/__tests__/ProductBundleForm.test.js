import { vi } from 'vitest';
// src/components/admin/product-bundles/__tests__/ProductBundleForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import AdminProductBundleForm from '../ProductBundleForm.js';

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

// Mock catalogBundleService
vi.mock('../../../../services/catalogBundleService.js', () => ({
  __esModule: true,
  default: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

import catalogBundleService from '../../../../services/catalogBundleService.js';

// Mock subjectService
vi.mock('../../../../services/subjectService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
  },
}));

import subjectService from '../../../../services/subjectService';

const theme = appTheme;

// import gets the mocked version since vi.mock is hoisted
import { useParams } from 'react-router-dom';
import appTheme from '../../../../theme';
const setMockParams = (params) => {
  useParams.mockReturnValue(params);
};

const mockSubjects = [
  { id: '1', code: 'CM2' },
  { id: '2', code: 'SA1' },
];

const mockEditData = {
  id: '1',
  bundle_name: 'CM2 Bundle',
  subject: 1,
  description: 'Bundle for CM2',
  is_featured: true,
  is_active: true,
  display_order: 1,
};

const renderComponent = (isEditMode = false) => {
  if (isEditMode) {
    setMockParams({ id: '1' });
  } else {
    setMockParams({});
  }

  return render(
    <ThemeProvider theme={theme}>
      <AdminProductBundleForm />
    </ThemeProvider>
  );
};

describe('AdminProductBundleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    subjectService.getAll.mockResolvedValue(mockSubjects);
  });

  describe('create mode', () => {
    test('renders create form title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create product bundle/i })).toBeInTheDocument();
      });
    });

    test('renders bundle name label', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/bundle name/i)).toBeInTheDocument();
      });
    });

    test('renders subject label', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Subject')).toBeInTheDocument();
      });
    });

    test('renders description label', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/description/i)).toBeInTheDocument();
      });
    });

    test('renders featured checkbox', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /featured/i })).toBeInTheDocument();
      });
    });

    test('renders active checkbox', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /active/i })).toBeInTheDocument();
      });
    });

    test('active checkbox is checked by default', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /active/i })).toBeChecked();
      });
    });

    test('featured checkbox is unchecked by default', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /featured/i })).not.toBeChecked();
      });
    });

    test('renders display order label', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/display order/i)).toBeInTheDocument();
      });
    });

    test('renders create button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create product bundle/i })).toBeInTheDocument();
      });
    });

    test('renders cancel button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    test('fetches subjects on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(subjectService.getAll).toHaveBeenCalled();
      });
    });

    test('shows validation error when bundle name is empty', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create product bundle/i })).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /create product bundle/i });
      fireEvent.submit(submitButton.closest('form'));

      await waitFor(() => {
        expect(screen.getByText(/please provide a bundle name/i)).toBeInTheDocument();
      });
    });
  });

  describe('edit mode', () => {
    beforeEach(() => {
      catalogBundleService.getById.mockResolvedValue(mockEditData);
    });

    test('renders edit form title', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit product bundle/i })).toBeInTheDocument();
      });
    });

    test('fetches product bundle data on mount', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(catalogBundleService.getById).toHaveBeenCalledWith('1');
      });
    });

    test('displays fetched bundle name', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('CM2 Bundle')).toBeInTheDocument();
      });
    });

    test('displays fetched description', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Bundle for CM2')).toBeInTheDocument();
      });
    });

    test('shows update button in edit mode', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update product bundle/i })).toBeInTheDocument();
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

      expect(mockNavigate).toHaveBeenCalledWith('/admin/product-bundles');
    });
  });

  describe('error handling', () => {
    test('shows error when fetch fails in edit mode', async () => {
      catalogBundleService.getById.mockRejectedValueOnce(new Error('Fetch error'));

      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch product bundle/i)).toBeInTheDocument();
      });
    });
  });
});
