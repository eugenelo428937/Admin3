// src/components/admin/products/__tests__/ProductTable.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminProductTable from '../ProductTable';

// Mock ProductVariationsPanel to avoid testing its internals here
jest.mock('../ProductVariationsPanel', () => {
  return function MockProductVariationsPanel({ productId }) {
    return <div data-testid={`expand-row-${productId}`}>Variations for {productId}</div>;
  };
});

const theme = createTheme();

const mockProducts = [
  {
    id: '1',
    code: 'CM2-SM',
    fullname: 'CM2 Study Material Bundle',
    shortname: 'CM2 Bundle',
    description: 'Study material for CM2',
    is_active: true,
    buy_both: true,
  },
  {
    id: '2',
    code: 'SA1-TUT',
    fullname: 'SA1 Tutorial Sessions',
    shortname: 'SA1 Tutorials',
    description: 'Tutorial sessions for SA1',
    is_active: false,
    buy_both: false,
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

      expect(screen.getByRole('columnheader', { name: 'Code' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Full Name' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Short Name' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Active' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Buy Both' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    });

    test('renders product rows', () => {
      renderComponent();

      expect(screen.getByText('CM2-SM')).toBeInTheDocument();
      expect(screen.getByText('CM2 Study Material Bundle')).toBeInTheDocument();
      expect(screen.getByText('CM2 Bundle')).toBeInTheDocument();
      expect(screen.getByText('SA1-TUT')).toBeInTheDocument();
      expect(screen.getByText('SA1 Tutorial Sessions')).toBeInTheDocument();
      expect(screen.getByText('SA1 Tutorials')).toBeInTheDocument();
    });

    test('displays active status correctly', () => {
      renderComponent();

      // Active column + Buy Both column both contain "Active"/"Inactive" and "Yes"/"No"
      expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Inactive')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
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
      expect(viewButtons[0]).toHaveAttribute('href', '/admin/products/1');
      expect(viewButtons[1]).toHaveAttribute('href', '/admin/products/2');
    });

    test('edit button links to correct edit page', () => {
      renderComponent();

      const editButtons = screen.getAllByRole('link', { name: /edit/i });
      expect(editButtons[0]).toHaveAttribute('href', '/admin/products/1/edit');
      expect(editButtons[1]).toHaveAttribute('href', '/admin/products/2/edit');
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

  describe('expandable rows', () => {
    test('renders expand button for each product', () => {
      renderComponent();
      const expandButtons = screen.getAllByLabelText(/expand/i);
      expect(expandButtons).toHaveLength(2);
    });

    test('expand button toggles row expansion', async () => {
      renderComponent();
      const expandButtons = screen.getAllByLabelText(/expand/i);

      // Click to expand first product
      fireEvent.click(expandButtons[0]);

      // The Collapse should now be open — ProductVariationsPanel renders inside
      expect(screen.getByTestId('expand-row-1')).toBeInTheDocument();
    });

    test('clicking expand on another row collapses the first', async () => {
      renderComponent();
      const expandButtons = screen.getAllByLabelText(/expand/i);

      fireEvent.click(expandButtons[0]); // expand row 1
      fireEvent.click(expandButtons[1]); // expand row 2

      // Row 2 should be expanded
      expect(screen.getByTestId('expand-row-2')).toBeInTheDocument();
      // Row 1 should be collapsed (wait for Collapse unmountOnExit animation)
      await waitFor(() => {
        expect(screen.queryByTestId('expand-row-1')).not.toBeInTheDocument();
      });
    });
  });
});
