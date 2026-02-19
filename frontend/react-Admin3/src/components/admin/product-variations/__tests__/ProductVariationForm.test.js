// src/components/admin/product-variations/__tests__/ProductVariationForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdminProductVariationForm from '../ProductVariationForm';

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

// Mock productVariationService
jest.mock('../../../../services/productVariationService', () => ({
  __esModule: true,
  default: {
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

import productVariationService from '../../../../services/productVariationService';

const theme = createTheme();

// Helper to set mock useParams
const setMockParams = (params) => {
  require('react-router-dom').useParams = jest.fn().mockReturnValue(params);
};

const mockEditData = {
  id: '1',
  variation_type: 'eBook',
  name: 'eBook Version',
  description: 'Digital version',
  code: 'EB',
};

const renderComponent = (isEditMode = false) => {
  if (isEditMode) {
    setMockParams({ id: '1' });
  } else {
    setMockParams({});
  }

  return render(
    <ThemeProvider theme={theme}>
      <AdminProductVariationForm />
    </ThemeProvider>
  );
};

describe('AdminProductVariationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
  });

  describe('create mode', () => {
    test('renders create form title', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /create product variation/i })).toBeInTheDocument();
    });

    test('renders variation type label', () => {
      renderComponent();
      expect(screen.getByText('Variation Type')).toBeInTheDocument();
    });

    test('renders name label', () => {
      renderComponent();
      expect(screen.getByText(/^name$/i)).toBeInTheDocument();
    });

    test('renders description label', () => {
      renderComponent();
      expect(screen.getByText(/description/i)).toBeInTheDocument();
    });

    test('renders code label', () => {
      renderComponent();
      expect(screen.getByText(/code/i)).toBeInTheDocument();
    });

    test('renders form text inputs', () => {
      renderComponent();
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });

    test('renders create button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /create product variation/i })).toBeInTheDocument();
    });

    test('renders cancel button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('shows validation error when required fields are empty', async () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /create product variation/i }));

      await waitFor(() => {
        expect(screen.getByText(/please fill in all required fields/i)).toBeInTheDocument();
      });
    });
  });

  describe('edit mode', () => {
    beforeEach(() => {
      productVariationService.getById.mockResolvedValue(mockEditData);
    });

    test('renders edit form title', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit product variation/i })).toBeInTheDocument();
      });
    });

    test('fetches product variation data on mount', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(productVariationService.getById).toHaveBeenCalledWith('1');
      });
    });

    test('displays fetched name', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('eBook Version')).toBeInTheDocument();
      });
    });

    test('displays fetched description', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Digital version')).toBeInTheDocument();
      });
    });

    test('displays fetched code', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('EB')).toBeInTheDocument();
      });
    });

    test('shows update button in edit mode', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update product variation/i })).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    test('navigates to list on cancel', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/product-variations');
    });
  });

  describe('error handling', () => {
    test('shows error when fetch fails in edit mode', async () => {
      productVariationService.getById.mockRejectedValueOnce(new Error('Fetch error'));

      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch product variation/i)).toBeInTheDocument();
      });
    });
  });
});
