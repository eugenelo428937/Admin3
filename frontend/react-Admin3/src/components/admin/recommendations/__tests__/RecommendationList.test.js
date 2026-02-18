// src/components/admin/recommendations/__tests__/RecommendationList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminRecommendationList from '../RecommendationList';

// Mock useAuth
jest.mock('../../../../hooks/useAuth', () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth';

// Mock recommendationService
jest.mock('../../../../services/recommendationService', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
  },
}));

import recommendationService from '../../../../services/recommendationService';

const theme = createTheme();

const mockRecommendations = [
  {
    id: '1',
    source_label: 'CM2 eBook',
    recommended_label: 'CM2 Printed',
  },
  {
    id: '2',
    source_label: 'SA1 eBook',
    recommended_label: 'SA1 Hub',
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AdminRecommendationList />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AdminRecommendationList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('renders add new recommendation button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /add new recommendation/i })).toBeInTheDocument();
      });
    });
  });

  describe('data display', () => {
    test('fetches and displays recommendations', async () => {
      renderComponent();

      await waitFor(() => {
        expect(recommendationService.list).toHaveBeenCalled();
        expect(screen.getByText('CM2 eBook')).toBeInTheDocument();
        expect(screen.getByText('CM2 Printed')).toBeInTheDocument();
        expect(screen.getByText('SA1 eBook')).toBeInTheDocument();
        expect(screen.getByText('SA1 Hub')).toBeInTheDocument();
      });
    });

    test('displays edit buttons for each recommendation', async () => {
      renderComponent();

      await waitFor(() => {
        const editButtons = screen.getAllByRole('link', { name: /edit/i });
        expect(editButtons).toHaveLength(2);
      });
    });

    test('displays delete buttons for each recommendation', async () => {
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
      recommendationService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 eBook')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this recommendation?');
        expect(recommendationService.delete).toHaveBeenCalledWith('1');
      });
    });

    test('does not delete when cancelled', async () => {
      window.confirm = jest.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 eBook')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

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
      window.confirm = jest.fn().mockReturnValue(true);
      recommendationService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2 eBook')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

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

  describe('links', () => {
    test('add new recommendation links to correct path', async () => {
      renderComponent();

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /add new recommendation/i });
        expect(link).toHaveAttribute('href', '/admin/recommendations/new');
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
