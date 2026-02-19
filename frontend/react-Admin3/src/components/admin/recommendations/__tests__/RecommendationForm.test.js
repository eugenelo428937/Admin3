// src/components/admin/recommendations/__tests__/RecommendationForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdminRecommendationForm from '../RecommendationForm';

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

// Mock recommendationService
jest.mock('../../../../services/recommendationService', () => ({
  __esModule: true,
  default: {
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock productProductVariationService
jest.mock('../../../../services/productProductVariationService', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
  },
}));

import recommendationService from '../../../../services/recommendationService';
import productProductVariationService from '../../../../services/productProductVariationService';

const theme = createTheme();

// Helper to set mock useParams
const setMockParams = (params) => {
  require('react-router-dom').useParams = jest.fn().mockReturnValue(params);
};

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
      <AdminRecommendationForm />
    </ThemeProvider>
  );
};

describe('AdminRecommendationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    productProductVariationService.getAll.mockResolvedValue(mockPpvData);
  });

  describe('create mode', () => {
    test('renders create form title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add new recommendation/i })).toBeInTheDocument();
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
        expect(screen.getByRole('button', { name: /create recommendation/i })).toBeInTheDocument();
      });
    });

    test('fetches dropdown data on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(productProductVariationService.getAll).toHaveBeenCalled();
      });
    });
  });

  describe('edit mode', () => {
    const mockRecommendation = {
      id: '1',
      source_ppv: 1,
      recommended_ppv: 2,
    };

    beforeEach(() => {
      recommendationService.getById.mockResolvedValue(mockRecommendation);
    });

    test('renders edit form title', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit recommendation/i })).toBeInTheDocument();
      });
    });

    test('fetches recommendation data on mount', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(recommendationService.getById).toHaveBeenCalledWith('1');
      });
    });

    test('shows update button in edit mode', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update recommendation/i })).toBeInTheDocument();
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

      expect(mockNavigate).toHaveBeenCalledWith('/admin/recommendations');
    });
  });

  describe('error handling', () => {
    test('shows error when fetch fails in edit mode', async () => {
      recommendationService.getById.mockRejectedValueOnce(new Error('Fetch error'));

      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByText(/failed to load recommendation/i)).toBeInTheDocument();
      });
    });

    test('shows error when dropdown data fetch fails', async () => {
      productProductVariationService.getAll.mockRejectedValueOnce(new Error('Dropdown error'));

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
