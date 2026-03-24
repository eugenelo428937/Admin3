import { vi } from 'vitest';
// src/components/admin/recommendations/__tests__/RecommendationList.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AdminRecommendationList from '../RecommendationList.tsx';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.tsx', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.tsx';

// Mock recommendationService
vi.mock('../../../../services/recommendationService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  },
}));

import recommendationService from '../../../../services/recommendationService';

const mockRecommendations = [
  {
    id: '1',
    product_product_variation: 10,
    source_product_code: 'CM2CR',
    source_variation_name: 'eBook',
    recommended_product_product_variation: 11,
    recommended_product_code: 'CM2CR',
    recommended_variation_name: 'Printed Copy',
  },
  {
    id: '2',
    product_product_variation: 20,
    source_product_code: 'SA1SN',
    source_variation_name: 'eBook',
    recommended_product_product_variation: 21,
    recommended_product_code: 'SA1SN',
    recommended_variation_name: 'Hub Access',
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AdminRecommendationList />
    </BrowserRouter>
  );
};

describe('AdminRecommendationList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    recommendationService.list.mockResolvedValue({ results: mockRecommendations, count: mockRecommendations.length });
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /recommendations/i })).toBeInTheDocument();
      });
    });

    test('renders loading state initially', () => {
      recommendationService.list.mockReturnValue(new Promise(() => {}));
      renderComponent();

      // AdminDataTable shows Skeleton loading state instead of data
      expect(screen.queryByText('CM2CR — eBook')).not.toBeInTheDocument();
    });

    test('renders add new recommendation button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add new recommendation/i })).toBeInTheDocument();
      });
    });
  });

  describe('data display', () => {
    test('fetches and displays recommendations with PPV labels', async () => {
      renderComponent();

      await waitFor(() => {
        expect(recommendationService.list).toHaveBeenCalled();
        // Source PPV labels: "ProductCode — VariationName"
        expect(screen.getByText(/CM2CR — eBook/)).toBeInTheDocument();
        expect(screen.getByText(/SA1SN — eBook/)).toBeInTheDocument();
        // Recommended PPV labels
        expect(screen.getByText(/CM2CR — Printed Copy/)).toBeInTheDocument();
        expect(screen.getByText(/SA1SN — Hub Access/)).toBeInTheDocument();
      });
    });

    test('displays action menus for each recommendation', async () => {
      renderComponent();

      await waitFor(() => {
        const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
        expect(menuButtons).toHaveLength(2);
      });
    });

    test('displays edit and delete items in dropdown menu', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/CM2CR — eBook/)).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });
    });
  });

  describe('delete functionality', () => {
    test('calls delete when delete menu item clicked and confirmed', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(true);
      recommendationService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/CM2CR — eBook/)).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete/i }));

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this recommendation?');
        expect(recommendationService.delete).toHaveBeenCalledWith('1');
      });
    });

    test('does not delete when cancelled', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/CM2CR — eBook/)).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete/i }));

      expect(recommendationService.delete).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      recommendationService.list.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch recommendations/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn().mockReturnValue(true);
      recommendationService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/CM2CR — eBook/)).toBeInTheDocument();
      });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to delete recommendation/i)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    test('displays empty message when no recommendations', async () => {
      recommendationService.list.mockResolvedValueOnce({ results: [], count: 0 });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no recommendations found/i)).toBeInTheDocument();
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

      expect(screen.queryByRole('heading', { name: /recommendations/i })).not.toBeInTheDocument();
    });
  });
});
