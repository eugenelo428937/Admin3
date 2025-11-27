// src/components/admin/products/__tests__/ProductTable.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminProductTable from '../ProductTable';

const theme = createTheme();

const mockProducts = [
  {
    id: '1',
    code: 'CM2-SM',
    name: 'CM2 Study Material Bundle',
    active: true,
  },
  {
    id: '2',
    code: 'SA1-TUT',
    name: 'SA1 Tutorial Sessions',
    active: false,
  },
];

const renderComponent = (props = {}) => {
  const defaultProps = {
    products: mockProducts,
    onDelete: jest.fn(),
  };

  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AdminProductTable {...defaultProps} {...props} />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AdminProductTable', () => {
  describe('rendering', () => {
    test('renders table headers', () => {
      renderComponent();

      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    test('renders product rows', () => {
      renderComponent();

      expect(screen.getByText('CM2-SM')).toBeInTheDocument();
      expect(screen.getByText('CM2 Study Material Bundle')).toBeInTheDocument();
      expect(screen.getByText('SA1-TUT')).toBeInTheDocument();
      expect(screen.getByText('SA1 Tutorial Sessions')).toBeInTheDocument();
    });

    test('displays active status correctly', () => {
      renderComponent();

      const statusCells = screen.getAllByText(/Active|Inactive/);
      expect(statusCells).toHaveLength(2);
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    test('renders view button for each product', () => {
      renderComponent();

      const viewButtons = screen.getAllByRole('link', { name: /view/i });
      expect(viewButtons).toHaveLength(2);
    });

    test('renders edit button for each product', () => {
      renderComponent();

      const editButtons = screen.getAllByRole('link', { name: /edit/i });
      expect(editButtons).toHaveLength(2);
    });

    test('renders delete button for each product', () => {
      renderComponent();

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(2);
    });

    test('view button links to correct product detail page', () => {
      renderComponent();

      const viewButtons = screen.getAllByRole('link', { name: /view/i });
      expect(viewButtons[0]).toHaveAttribute('href', '/products/1');
      expect(viewButtons[1]).toHaveAttribute('href', '/products/2');
    });

    test('edit button links to correct edit page', () => {
      renderComponent();

      const editButtons = screen.getAllByRole('link', { name: /edit/i });
      expect(editButtons[0]).toHaveAttribute('href', '/products/edit/1');
      expect(editButtons[1]).toHaveAttribute('href', '/products/edit/2');
    });
  });

  describe('delete functionality', () => {
    test('calls onDelete with correct id when delete clicked', () => {
      const mockOnDelete = jest.fn();
      renderComponent({ onDelete: mockOnDelete });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });

    test('calls onDelete with second product id', () => {
      const mockOnDelete = jest.fn();
      renderComponent({ onDelete: mockOnDelete });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[1]);

      expect(mockOnDelete).toHaveBeenCalledWith('2');
    });
  });

  describe('empty state', () => {
    test('renders empty table body when no products', () => {
      renderComponent({ products: [] });

      // Headers should still be present
      expect(screen.getByText('Code')).toBeInTheDocument();

      // No product rows
      expect(screen.queryByText('CM2-SM')).not.toBeInTheDocument();
    });
  });
});
