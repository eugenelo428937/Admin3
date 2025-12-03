// src/components/Product/ProductCard/__tests__/MarkingVoucherProductCard.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock addVoucherToCart function
const mockAddVoucherToCart = jest.fn().mockResolvedValue({});

// Mock CartContext
jest.mock('../../../../contexts/CartContext', () => ({
  __esModule: true,
  useCart: () => ({
    addVoucherToCart: mockAddVoucherToCart,
    cartItems: [],
    cartData: null,
    loading: false,
  }),
}));

// Mock Chakra UI components to avoid ESM module resolution issues
jest.mock('@chakra-ui/react', () => {
  const React = require('react');
  return {
    __esModule: true,
    NumberInput: {
      Root: ({ children, value, onValueChange, ...props }) =>
        React.createElement('div', { 'data-testid': 'number-input-root', ...props }, children),
      DecrementTrigger: ({ children, asChild, ...props }) =>
        React.createElement('button', { 'data-testid': 'decrement-btn', ...props }, children),
      IncrementTrigger: ({ children, asChild, ...props }) =>
        React.createElement('button', { 'data-testid': 'increment-btn', ...props }, children),
      ValueText: ({ children, ...props }) =>
        React.createElement('span', { 'data-testid': 'value-text', ...props }, '1'),
    },
    HStack: ({ children, ...props }) =>
      React.createElement('div', { 'data-testid': 'hstack', ...props }, children),
    IconButton: ({ children, ...props }) =>
      React.createElement('button', { 'data-testid': 'chakra-icon-btn', ...props }, children),
    ChakraProvider: ({ children }) => children,
    defaultSystem: {},
  };
});

// Mock react-icons
jest.mock('react-icons/lu', () => {
  const React = require('react');
  return {
    __esModule: true,
    LuMinus: () => React.createElement('span', null, '-'),
    LuPlus: () => React.createElement('span', null, '+'),
  };
});

import MarkingVoucherProductCard from '../MarkingVoucherProductCard';

const theme = createTheme();

const mockVoucher = {
  id: 'voucher-2', // String ID format from unified search (voucher-{numeric_id})
  code: 'CM2-2024-MARK',
  name: 'CM2 Marking Voucher',
  subject_code: 'CM2',
  exam_session_code: '2024-04',
  description: 'Get your CM2 exam marked by our expert tutors',
  is_active: true,
  expiry_date: '2025-12-31',
  price: 75.00,
  variations: [
    {
      id: 1,
      name: 'Standard',
      prices: [{ price_type: 'standard', amount: 75.00 }],
    },
  ],
};

const renderComponent = async (props = {}) => {
  const defaultProps = {
    voucher: mockVoucher,
  };

  // Reset mock before each render
  mockAddVoucherToCart.mockClear();

  let result;
  await act(async () => {
    result = render(
      <ThemeProvider theme={theme}>
        <MarkingVoucherProductCard {...defaultProps} {...props} />
      </ThemeProvider>
    );
  });

  return result;
};

describe('MarkingVoucherProductCard', () => {
  describe('rendering', () => {
    test('renders voucher name', async () => {
      await renderComponent();
      expect(screen.getByText('CM2 Marking Voucher')).toBeInTheDocument();
    });

    test('renders validity badge', async () => {
      await renderComponent();
      expect(screen.getByText(/Valid for 4 years/i)).toBeInTheDocument();
    });

    test('renders important alert', async () => {
      await renderComponent();
      expect(screen.getByText('Important')).toBeInTheDocument();
    });

    test('renders quantity section', async () => {
      await renderComponent();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
    });

    test('renders discount options', async () => {
      await renderComponent();
      expect(screen.getByText('Discount Options')).toBeInTheDocument();
      expect(screen.getByText('Retaker')).toBeInTheDocument();
      expect(screen.getByText('Additional Copy')).toBeInTheDocument();
    });

    test('renders price', async () => {
      await renderComponent();
      expect(screen.getByText('£75.00')).toBeInTheDocument();
    });

    test('renders VAT status', async () => {
      await renderComponent();
      expect(screen.getByText('Price includes VAT')).toBeInTheDocument();
    });

    test('renders add to cart button', async () => {
      await renderComponent();
      expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
    });

    test('renders price breakdown text', async () => {
      await renderComponent();
      expect(screen.getByText(/1 voucher • £75.00 each/i)).toBeInTheDocument();
    });
  });

  describe('quantity functionality', () => {
    test('displays quantity input', async () => {
      await renderComponent();
      expect(screen.getByTestId('number-input-root')).toBeInTheDocument();
    });

    test('displays increment and decrement buttons', async () => {
      await renderComponent();
      expect(screen.getByTestId('increment-btn')).toBeInTheDocument();
      expect(screen.getByTestId('decrement-btn')).toBeInTheDocument();
    });

    test('shows correct breakdown text for quantity 1', async () => {
      await renderComponent();
      expect(screen.getByText(/1 voucher • £75.00 each/i)).toBeInTheDocument();
    });
  });

  describe('discount options', () => {
    test('renders two discount radio options', async () => {
      await renderComponent();
      const radios = screen.getAllByRole('radio');
      expect(radios.length).toBe(2);
    });

    test('discount options are deselected by default', async () => {
      await renderComponent();
      const radios = screen.getAllByRole('radio');
      radios.forEach(radio => {
        expect(radio).not.toBeChecked();
      });
    });

    test('can select retaker discount', async () => {
      await renderComponent();
      const radios = screen.getAllByRole('radio');

      await act(async () => {
        fireEvent.click(radios[0]);
      });

      expect(radios[0]).toBeChecked();
    });

    test('can toggle retaker discount off', async () => {
      await renderComponent();
      const radios = screen.getAllByRole('radio');

      // Click to select
      await act(async () => {
        fireEvent.click(radios[0]);
      });
      expect(radios[0]).toBeChecked();

      // Click again to deselect
      await act(async () => {
        fireEvent.click(radios[0]);
      });
      expect(radios[0]).not.toBeChecked();
    });
  });

  describe('alert expand/collapse', () => {
    test('renders show more link', async () => {
      await renderComponent();
      expect(screen.getByText(/Show more/i)).toBeInTheDocument();
    });

    test('can toggle alert expansion', async () => {
      await renderComponent();

      const showMoreLink = screen.getByText(/Show more/i);
      await act(async () => {
        fireEvent.click(showMoreLink);
      });

      expect(screen.getByText(/Show less/i)).toBeInTheDocument();
    });

    test('can collapse expanded alert', async () => {
      await renderComponent();

      // Expand
      const showMoreLink = screen.getByText(/Show more/i);
      await act(async () => {
        fireEvent.click(showMoreLink);
      });

      // Collapse
      const showLessLink = screen.getByText(/Show less/i);
      await act(async () => {
        fireEvent.click(showLessLink);
      });

      expect(screen.getByText(/Show more/i)).toBeInTheDocument();
    });
  });

  describe('availability', () => {
    test('add to cart button is enabled when voucher is available', async () => {
      await renderComponent();
      const addButton = screen.getByRole('button', { name: /add to cart/i });
      expect(addButton).not.toBeDisabled();
    });

    test('disables add to cart button when voucher is expired', async () => {
      const expiredVoucher = {
        ...mockVoucher,
        expiry_date: '2020-01-01',
      };
      await renderComponent({ voucher: expiredVoucher });

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      expect(addButton).toBeDisabled();
    });

    test('disables add to cart button when voucher is inactive', async () => {
      const inactiveVoucher = {
        ...mockVoucher,
        is_active: false,
        expiry_date: null,
      };
      await renderComponent({ voucher: inactiveVoucher });

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      expect(addButton).toBeDisabled();
    });
  });

  describe('pricing', () => {
    test('uses direct price when available', async () => {
      await renderComponent();
      expect(screen.getByText('£75.00')).toBeInTheDocument();
    });

    test('uses variation price when no direct price', async () => {
      const voucherWithVariationPrice = {
        ...mockVoucher,
        price: null,
        variations: [
          {
            id: 1,
            name: 'Standard',
            prices: [{ price_type: 'standard', amount: 85.00 }],
          },
        ],
      };
      await renderComponent({ voucher: voucherWithVariationPrice });
      expect(screen.getByText('£85.00')).toBeInTheDocument();
    });

    test('shows £0.00 when no price available', async () => {
      const noPriceVoucher = {
        ...mockVoucher,
        price: null,
        variations: [],
      };
      await renderComponent({ voucher: noPriceVoucher });
      expect(screen.getByText('£0.00')).toBeInTheDocument();
    });
  });

  describe('add to cart', () => {
    test('calls addVoucherToCart with extracted numeric voucher id and quantity', async () => {
      await renderComponent();

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      // mockVoucher.id is "voucher-2", so numeric ID should be 2
      await waitFor(() => {
        expect(mockAddVoucherToCart).toHaveBeenCalledWith(2, 1);
      });
    });

    test('discount selection does not affect cart call (discount handled separately)', async () => {
      await renderComponent();

      // Select retaker discount
      const radios = screen.getAllByRole('radio');
      await act(async () => {
        fireEvent.click(radios[0]); // First radio is Retaker
      });

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      // Cart call still uses extracted numeric voucher id (2) and quantity only
      // Discount type is handled separately in backend
      await waitFor(() => {
        expect(mockAddVoucherToCart).toHaveBeenCalledWith(2, 1);
      });
    });

    test('does not call addVoucherToCart when voucher is not available', async () => {
      const expiredVoucher = {
        ...mockVoucher,
        expiry_date: '2020-01-01',
      };
      await renderComponent({ voucher: expiredVoucher });

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(mockAddVoucherToCart).not.toHaveBeenCalled();
    });

    test('handles add to cart error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockAddVoucherToCart.mockRejectedValueOnce(new Error('Cart error'));
      await renderComponent();

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error adding voucher to cart:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    test('handles voucher without name', async () => {
      const noNameVoucher = {
        ...mockVoucher,
        name: null,
      };
      await renderComponent({ voucher: noNameVoucher });
      expect(screen.getByText('Marking Voucher')).toBeInTheDocument();
    });

    test('handles voucher with empty variations', async () => {
      const emptyVariationsVoucher = {
        ...mockVoucher,
        price: null,
        variations: [],
      };
      await renderComponent({ voucher: emptyVariationsVoucher });
      expect(screen.getByText('£0.00')).toBeInTheDocument();
    });

    test('handles voucher with numeric id (direct from API)', async () => {
      const directApiVoucher = {
        ...mockVoucher,
        id: 5, // Numeric ID from direct marking vouchers API
      };
      await renderComponent({ voucher: directApiVoucher });

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(mockAddVoucherToCart).toHaveBeenCalledWith(5, 1);
      });
    });

    test('handles voucher with voucher_id property', async () => {
      const voucherWithVoucherId = {
        ...mockVoucher,
        voucher_id: 7, // Explicit voucher_id property
      };
      await renderComponent({ voucher: voucherWithVoucherId });

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      // voucher_id takes precedence over id
      await waitFor(() => {
        expect(mockAddVoucherToCart).toHaveBeenCalledWith(7, 1);
      });
    });
  });

  describe('hover effect', () => {
    test('card has correct class structure', async () => {
      const { container } = await renderComponent();

      // The BaseProductCard should have the d-flex class
      const card = container.querySelector('.d-flex');
      expect(card).toBeInTheDocument();
    });
  });
});
