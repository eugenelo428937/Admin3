// src/components/admin/product-bundles/__tests__/ProductBundleForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdminProductBundleForm from '../ProductBundleForm';

// Mock useAuth
jest.mock('../../../../hooks/useAuth', () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth';

// Mock navigate function
const mockNavigate = jest.fn();

// Create mock for react-router-dom
jest.mock('react-router-dom', () => {
  return {
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
  };
});

// Mock catalogBundleService
jest.mock('../../../../services/catalogBundleService', () => ({
  __esModule: true,
  default: {
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

import catalogBundleService from '../../../../services/catalogBundleService';

// Mock subjectService
jest.mock('../../../../services/subjectService', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
  },
}));

import subjectService from '../../../../services/subjectService';

const theme = createTheme();

// Helper to set mock useParams
const setMockParams = (params) => {
  require('react-router-dom').useParams = jest.fn().mockReturnValue(params);
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
    jest.clearAllMocks();
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

      fireEvent.click(screen.getByRole('button', { name: /create product bundle/i }));

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
