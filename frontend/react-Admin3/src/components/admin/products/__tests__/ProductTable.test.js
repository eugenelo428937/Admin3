import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AdminProductTable from '../ProductTable.tsx';

// Mock ProductVariationsPanel to avoid testing its internals here
vi.mock('../ProductVariationsPanel.tsx', () => ({
  __esModule: true,
  default: function MockProductVariationsPanel({ productId }) {
    return <div data-testid={`expand-row-${productId}`}>Variations for {productId}</div>;
  },
}));

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
    onDelete: vi.fn(),
  };

  return render(
    <BrowserRouter>
      <AdminProductTable {...defaultProps} {...props} />
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

      expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Inactive')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    test('renders action menu button for each product', () => {
      renderComponent();

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      expect(menuButtons).toHaveLength(2);
    });

    test('action menu contains view, edit, delete options', async () => {
      const user = userEvent.setup();
      renderComponent();

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      expect(await screen.findByRole('menuitem', { name: /view/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
    });
  });

  describe('delete functionality', () => {
    test('calls onDelete with correct id when delete clicked', async () => {
      const user = userEvent.setup();
      const mockOnDelete = vi.fn();
      renderComponent({ onDelete: mockOnDelete });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[0]);

      const deleteItem = await screen.findByRole('menuitem', { name: /delete/i });
      await user.click(deleteItem);

      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });

    test('calls onDelete with second product id', async () => {
      const user = userEvent.setup();
      const mockOnDelete = vi.fn();
      renderComponent({ onDelete: mockOnDelete });

      const menuButtons = screen.getAllByRole('button', { name: /open menu/i });
      await user.click(menuButtons[1]);

      const deleteItem = await screen.findByRole('menuitem', { name: /delete/i });
      await user.click(deleteItem);

      expect(mockOnDelete).toHaveBeenCalledWith('2');
    });
  });

  describe('empty state', () => {
    test('renders empty table body when no products', () => {
      renderComponent({ products: [] });

      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.queryByText('CM2-SM')).not.toBeInTheDocument();
    });
  });

  describe('expandable rows', () => {
    test('renders expand button for each product', () => {
      renderComponent();
      const expandButtons = screen.getAllByLabelText(/expand variations for/i);
      expect(expandButtons).toHaveLength(2);
    });

    test('expand button toggles row expansion', () => {
      renderComponent();
      const expandButton = screen.getByLabelText(/expand variations for CM2-SM/i);

      fireEvent.click(expandButton);

      expect(screen.getByTestId('expand-row-1')).toBeInTheDocument();
      expect(screen.getByLabelText(/collapse variations for CM2-SM/i)).toBeInTheDocument();
    });

    test('clicking expand on another row collapses the first', async () => {
      renderComponent();

      // Expand row 1
      fireEvent.click(screen.getByLabelText(/expand variations for CM2-SM/i));
      expect(screen.getByTestId('expand-row-1')).toBeInTheDocument();

      // Expand row 2
      fireEvent.click(screen.getByLabelText(/expand variations for SA1-TUT/i));

      // Row 2 should be expanded
      expect(screen.getByTestId('expand-row-2')).toBeInTheDocument();
      // Row 1 should be collapsed
      await waitFor(() => {
        expect(screen.queryByTestId('expand-row-1')).not.toBeInTheDocument();
      });
    });
  });
});
