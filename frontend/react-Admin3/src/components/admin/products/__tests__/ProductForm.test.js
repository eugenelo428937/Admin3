import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminProductForm from '../ProductForm.tsx';

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

// Mock catalogProductService
vi.mock('../../../../services/catalogProductService', () => ({
  __esModule: true,
  default: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

import catalogProductService from '../../../../services/catalogProductService';

// Helper to set mock useParams
import { useParams } from 'react-router-dom';
const setMockParams = (params) => {
  useParams.mockReturnValue(params);
};

const renderComponent = (isEditMode = false) => {
  if (isEditMode) {
    setMockParams({ id: '1' });
  } else {
    setMockParams({});
  }

  return render(<AdminProductForm />);
};

describe('AdminProductForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
  });

  describe('create mode', () => {
    test('renders create form title', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /add new product/i })).toBeInTheDocument();
    });

    test('renders code label', () => {
      renderComponent();
      expect(screen.getByText('Code')).toBeInTheDocument();
    });

    test('renders full name label', () => {
      renderComponent();
      expect(screen.getByText('Full Name')).toBeInTheDocument();
    });

    test('renders short name label', () => {
      renderComponent();
      expect(screen.getByText('Short Name')).toBeInTheDocument();
    });

    test('renders description label', () => {
      renderComponent();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    test('renders active checkbox', () => {
      renderComponent();
      expect(screen.getByRole('checkbox', { name: /active/i })).toBeInTheDocument();
    });

    test('active checkbox is checked by default', () => {
      renderComponent();
      expect(screen.getByRole('checkbox', { name: /active/i })).toBeChecked();
    });

    test('renders create button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /create product/i })).toBeInTheDocument();
    });

    test('renders cancel button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('code field is enabled in create mode', () => {
      renderComponent();
      const inputs = screen.getAllByRole('textbox');
      // First input is code
      expect(inputs[0]).not.toBeDisabled();
    });
  });

  describe('edit mode', () => {
    const mockProduct = {
      code: 'CM2-SM',
      fullname: 'CM2 Study Material Bundle',
      shortname: 'CM2 Bundle',
      description: 'Complete study material for CM2',
      active: true,
    };

    beforeEach(() => {
      catalogProductService.getById.mockResolvedValue(mockProduct);
    });

    test('renders edit form title', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit product/i })).toBeInTheDocument();
      });
    });

    test('fetches product data on mount', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(catalogProductService.getById).toHaveBeenCalledWith('1');
      });
    });

    test('displays fetched product code', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('CM2-SM')).toBeInTheDocument();
      });
    });

    test('displays fetched product fullname', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('CM2 Study Material Bundle')).toBeInTheDocument();
      });
    });

    test('shows update button in edit mode', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update product/i })).toBeInTheDocument();
      });
    });

    test('code field is disabled in edit mode', async () => {
      renderComponent(true);

      await waitFor(() => {
        const codeInput = screen.getByDisplayValue('CM2-SM');
        expect(codeInput).toBeDisabled();
      });
    });

    test('shows helper text for code in edit mode', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByText(/codes cannot be changed after creation/i)).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    test('creates product on submit in create mode', async () => {
      catalogProductService.create.mockResolvedValue({});

      renderComponent();

      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'NEW-CODE' } }); // code
      fireEvent.change(inputs[1], { target: { value: 'New Product Full Name' } }); // fullname
      fireEvent.change(inputs[2], { target: { value: 'New Product' } }); // shortname
      fireEvent.change(inputs[3], { target: { value: 'Product description' } }); // description

      fireEvent.click(screen.getByRole('button', { name: /create product/i }));

      await waitFor(() => {
        expect(catalogProductService.create).toHaveBeenCalledWith({
          code: 'NEW-CODE',
          fullname: 'New Product Full Name',
          shortname: 'New Product',
          description: 'Product description',
          active: true,
        });
        expect(mockNavigate).toHaveBeenCalledWith('/admin/products');
      });
    });

    test('updates product on submit in edit mode', async () => {
      const mockProduct = {
        code: 'CM2-SM',
        fullname: 'CM2 Study Material Bundle',
        shortname: 'CM2 Bundle',
        description: 'Original description',
        active: true,
      };
      catalogProductService.getById.mockResolvedValue(mockProduct);
      catalogProductService.update.mockResolvedValue({});

      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('CM2 Study Material Bundle')).toBeInTheDocument();
      });

      const fullnameInput = screen.getByDisplayValue('CM2 Study Material Bundle');
      fireEvent.change(fullnameInput, { target: { value: 'Updated Full Name' } });

      fireEvent.click(screen.getByRole('button', { name: /update product/i }));

      await waitFor(() => {
        expect(catalogProductService.update).toHaveBeenCalledWith('1', expect.objectContaining({
          fullname: 'Updated Full Name',
        }));
        expect(mockNavigate).toHaveBeenCalledWith('/admin/products');
      });
    });

    test('shows validation error when required fields are empty', async () => {
      renderComponent();

      const submitButton = screen.getByRole('button', { name: /create product/i });
      fireEvent.submit(submitButton.closest('form'));

      await waitFor(() => {
        expect(screen.getByText(/please fill in all required fields/i)).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    test('navigates to list on cancel', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/products');
    });
  });

  describe('error handling', () => {
    test('shows error when fetch fails in edit mode', async () => {
      catalogProductService.getById.mockRejectedValueOnce(new Error('Fetch error'));

      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByText(/failed to load product data/i)).toBeInTheDocument();
      });
    });

    test('shows error when create fails', async () => {
      catalogProductService.create.mockRejectedValueOnce({
        response: { data: { message: 'Create error' } },
        message: 'Request failed',
      });

      renderComponent();

      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'NEW-CODE' } });
      fireEvent.change(inputs[1], { target: { value: 'Full Name' } });
      fireEvent.change(inputs[2], { target: { value: 'Short' } });

      fireEvent.click(screen.getByRole('button', { name: /create product/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to create product/i)).toBeInTheDocument();
      });
    });
  });

  describe('checkbox interaction', () => {
    test('toggles active checkbox', () => {
      renderComponent();

      const checkbox = screen.getByRole('checkbox', { name: /active/i });
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });
});
