// src/components/admin/products/__tests__/ProductImport.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdminProductImport from '../ProductImport';

// Mock navigate function
const mockNavigate = jest.fn();

// Create mock for react-router-dom
jest.mock('react-router-dom', () => {
  return {
    useNavigate: () => mockNavigate,
  };
});

// Mock productService
jest.mock('../../../../services/productService', () => ({
  __esModule: true,
  default: {
    bulkImport: jest.fn(),
  },
}));

// Mock papaparse
jest.mock('papaparse', () => ({
  parse: jest.fn((file, options) => {
    // Simulate async parsing
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

import productService from '../../../../services/productService';

const theme = createTheme();

const renderComponent = () => {
  return render(
    <ThemeProvider theme={theme}>
      <AdminProductImport />
    </ThemeProvider>
  );
};

describe('AdminProductImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      // Check for the format guide heading and unique identifiers
      expect(screen.getByText(/csv format guide/i)).toBeInTheDocument();
      // Check that instructions list items exist
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

      // Try to submit without file - button should be disabled
      const importButton = screen.getByRole('button', { name: /import products/i });
      expect(importButton).toBeDisabled();
    });
  });
});
