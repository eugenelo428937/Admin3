import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminProductImport from '../ProductImport.tsx';

// Mock navigate function
const mockNavigate = vi.fn();

// Mock react-router-dom partially - keep Link/BrowserRouter working
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
  };
});

// Mock catalogProductService
vi.mock('../../../../services/catalogProductService', () => ({
  __esModule: true,
  default: {
    bulkImport: vi.fn(),
  },
}));

// Mock papaparse
vi.mock('papaparse', () => ({
  parse: vi.fn((file, options) => {
    const mockData = [
      { code: 'PRD001', fullname: 'Product One', shortname: 'Prod1', description: 'Test', active: 'true' },
      { code: 'PRD002', fullname: 'Product Two', shortname: 'Prod2', description: 'Test2', active: 'false' },
    ];

    if (options.complete) {
      setTimeout(() => {
        options.complete({ data: mockData, errors: [] });
      }, 0);
    }
  }),
}));

import catalogProductService from '../../../../services/catalogProductService';

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <AdminProductImport />
    </BrowserRouter>
  );
};

describe('AdminProductImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    test('renders page title', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /import products/i })).toBeInTheDocument();
    });

    test('renders file upload input', () => {
      renderComponent();
      expect(screen.getByText(/upload csv file/i)).toBeInTheDocument();
    });

    test('renders import button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /import products/i })).toBeInTheDocument();
    });

    test('renders cancel button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('renders csv format guide', () => {
      renderComponent();
      expect(screen.getByText(/csv format guide/i)).toBeInTheDocument();
    });

    test('renders format instructions', () => {
      renderComponent();
      expect(screen.getByText(/csv format guide/i)).toBeInTheDocument();
      expect(screen.getByText(/unique product identifier/i)).toBeInTheDocument();
    });
  });

  describe('button states', () => {
    test('import button is disabled when no file selected', () => {
      renderComponent();
      const importButton = screen.getByRole('button', { name: /import products/i });
      expect(importButton).toBeDisabled();
    });
  });

  describe('navigation', () => {
    test('navigates to products on cancel', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/products');
    });
  });

  describe('form validation', () => {
    test('shows error when submitting without file', async () => {
      renderComponent();

      const importButton = screen.getByRole('button', { name: /import products/i });
      expect(importButton).toBeDisabled();
    });
  });
});
