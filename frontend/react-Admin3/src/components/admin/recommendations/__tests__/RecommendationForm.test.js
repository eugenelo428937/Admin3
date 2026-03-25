import { vi } from 'vitest';
// src/components/admin/recommendations/__tests__/RecommendationForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminRecommendationForm from '../RecommendationForm.tsx';

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

// Mock recommendationService
vi.mock('../../../../services/recommendationService', () => ({
  __esModule: true,
  default: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock productProductVariationService
vi.mock('../../../../services/productProductVariationService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
  },
}));

import recommendationService from '../../../../services/recommendationService';
import productProductVariationService from '../../../../services/productProductVariationService';

// import gets the mocked version since vi.mock is hoisted
import { useParams } from 'react-router-dom';

const setMockParams = (params) => {
  useParams.mockReturnValue(params);
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

  return render(<AdminRecommendationForm />);
};

describe('AdminRecommendationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
