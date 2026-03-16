import { vi } from 'vitest';
// src/components/admin/store-bundles/__tests__/StoreBundleForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import AdminStoreBundleForm from '../StoreBundleForm.js';

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

// Mock storeBundleService
vi.mock('../../../../services/storeBundleService.js', () => ({
  __esModule: true,
  default: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock catalogBundleService
vi.mock('../../../../services/catalogBundleService.js', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
  },
}));

// Mock examSessionSubjectService
vi.mock('../../../../services/examSessionSubjectService.js', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
  },
}));

import storeBundleService from '../../../../services/storeBundleService.js';
import catalogBundleService from '../../../../services/catalogBundleService.js';
import examSessionSubjectService from '../../../../services/examSessionSubjectService.js';

const theme = appTheme;

// import gets the mocked version since vi.mock is hoisted
import { useParams } from 'react-router-dom';
import appTheme from '../../../../theme';
const setMockParams = (params) => {
  useParams.mockReturnValue(params);
};

const mockCatalogBundleData = [
  { id: '1', bundle_name: 'CM2 Bundle' },
  { id: '2', bundle_name: 'SA1 Bundle' },
];

const mockEssData = [
  { id: '1', subject_code: 'CM2', session_code: '2025-04' },
];

const renderComponent = (isEditMode = false) => {
  if (isEditMode) {
    setMockParams({ id: '1' });
  } else {
    setMockParams({});
  }

  return render(
    <ThemeProvider theme={theme}>
      <AdminStoreBundleForm />
    </ThemeProvider>
  );
};

describe('AdminStoreBundleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    catalogBundleService.getAll.mockResolvedValue(mockCatalogBundleData);
    examSessionSubjectService.getAll.mockResolvedValue(mockEssData);
  });

  describe('create mode', () => {
    test('renders create form title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add new store bundle/i })).toBeInTheDocument();
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
        expect(screen.getByRole('button', { name: /create store bundle/i })).toBeInTheDocument();
      });
    });

    test('fetches dropdown data on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(catalogBundleService.getAll).toHaveBeenCalled();
        expect(examSessionSubjectService.getAll).toHaveBeenCalled();
      });
    });
  });

  describe('edit mode', () => {
    const mockStoreBundle = {
      id: '1',
      bundle_template: 1,
      exam_session_subject: 1,
      override_name: 'Custom Name',
      is_active: true,
    };

    beforeEach(() => {
      storeBundleService.getById.mockResolvedValue(mockStoreBundle);
    });

    test('renders edit form title', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit store bundle/i })).toBeInTheDocument();
      });
    });

    test('fetches store bundle data on mount', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(storeBundleService.getById).toHaveBeenCalledWith('1');
      });
    });

    test('shows update button in edit mode', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update store bundle/i })).toBeInTheDocument();
      });
    });

    test('displays fetched override name', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Custom Name')).toBeInTheDocument();
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

      expect(mockNavigate).toHaveBeenCalledWith('/admin/store-bundles');
    });
  });

  describe('error handling', () => {
    test('shows error when fetch fails in edit mode', async () => {
      storeBundleService.getById.mockRejectedValueOnce(new Error('Fetch error'));

      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByText(/failed to load store bundle/i)).toBeInTheDocument();
      });
    });

    test('shows error when dropdown data fetch fails', async () => {
      catalogBundleService.getAll.mockRejectedValueOnce(new Error('Dropdown error'));

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
