// src/components/Product/ProductCard/__tests__/MarkingVoucherProductCard.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MarkingVoucherProductCard from '../MarkingVoucherProductCard';

const theme = createTheme();

const mockVoucher = {
  id: 'voucher-1',
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
    onAddToCart: jest.fn(),
  };

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

    test('renders voucher code chip', async () => {
      await renderComponent();
      expect(screen.getByText('CM2-2024-MARK')).toBeInTheDocument();
    });

    test('renders subject code badge', async () => {
      await renderComponent();
      expect(screen.getByText('CM2')).toBeInTheDocument();
    });

    test('renders exam session badge', async () => {
      await renderComponent();
      expect(screen.getByText('2024-04')).toBeInTheDocument();
    });

    test('renders description', async () => {
      await renderComponent();
      expect(screen.getByText('Get your CM2 exam marked by our expert tutors')).toBeInTheDocument();
    });

    test('renders price', async () => {
      await renderComponent();
      expect(screen.getByText('£75.00')).toBeInTheDocument();
    });

    test('renders VAT status', async () => {
      await renderComponent();
      expect(screen.getByText('Inc. VAT')).toBeInTheDocument();
    });

    test('renders add to cart button', async () => {
      await renderComponent();
      expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
    });
  });

  describe('availability', () => {
    test('shows available status when voucher is active and not expired', async () => {
      await renderComponent();
      expect(screen.getByText('Available for purchase')).toBeInTheDocument();
    });

    test('shows expired status when voucher has past expiry date', async () => {
      const expiredVoucher = {
        ...mockVoucher,
        expiry_date: '2020-01-01',
      };
      await renderComponent({ voucher: expiredVoucher });
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });

    test('shows not available status when voucher is inactive', async () => {
      const inactiveVoucher = {
        ...mockVoucher,
        is_active: false,
        expiry_date: null,
      };
      await renderComponent({ voucher: inactiveVoucher });
      expect(screen.getByText('Not available')).toBeInTheDocument();
    });

    test('applies reduced opacity when not available', async () => {
      const expiredVoucher = {
        ...mockVoucher,
        expiry_date: '2020-01-01',
      };
      await renderComponent({ voucher: expiredVoucher });

      const card = screen.getByText('CM2 Marking Voucher').closest('.MuiCard-root');
      expect(card).toHaveStyle({ opacity: '0.6' });
    });

    test('displays expiry date when present', async () => {
      await renderComponent();
      expect(screen.getByText(/Valid until: 31 Dec 2025/i)).toBeInTheDocument();
    });

    test('does not display expiry info when no expiry date', async () => {
      const noExpiryVoucher = {
        ...mockVoucher,
        expiry_date: null,
      };
      await renderComponent({ voucher: noExpiryVoucher });
      expect(screen.queryByText(/Valid until/i)).not.toBeInTheDocument();
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
    test('calls onAddToCart when button clicked', async () => {
      const mockOnAddToCart = jest.fn().mockResolvedValue({});
      await renderComponent({ onAddToCart: mockOnAddToCart });

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(mockOnAddToCart).toHaveBeenCalledWith(
          mockVoucher,
          expect.objectContaining({
            type: 'MarkingVoucher',
            code: 'CM2-2024-MARK',
            name: 'CM2 Marking Voucher',
            price: 75.00,
          })
        );
      });
    });

    test('disables add to cart button when voucher is not available', async () => {
      const expiredVoucher = {
        ...mockVoucher,
        expiry_date: '2020-01-01',
      };
      await renderComponent({ voucher: expiredVoucher });

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      expect(addButton).toBeDisabled();
    });

    test('does not call onAddToCart when voucher is not available', async () => {
      const mockOnAddToCart = jest.fn();
      const expiredVoucher = {
        ...mockVoucher,
        expiry_date: '2020-01-01',
      };
      await renderComponent({ voucher: expiredVoucher, onAddToCart: mockOnAddToCart });

      const addButton = screen.getByRole('button', { name: /add to cart/i });
      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(mockOnAddToCart).not.toHaveBeenCalled();
    });

    test('handles add to cart error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockOnAddToCart = jest.fn().mockRejectedValue(new Error('Cart error'));
      await renderComponent({ onAddToCart: mockOnAddToCart });

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
    test('handles voucher without subject code', async () => {
      const noSubjectVoucher = {
        ...mockVoucher,
        subject_code: null,
      };
      await renderComponent({ voucher: noSubjectVoucher });
      expect(screen.getByText('CM2 Marking Voucher')).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: /Subject/i })).not.toBeInTheDocument();
    });

    test('handles voucher without exam session', async () => {
      const noSessionVoucher = {
        ...mockVoucher,
        exam_session_code: null,
      };
      await renderComponent({ voucher: noSessionVoucher });
      expect(screen.getByText('CM2 Marking Voucher')).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: /Exam session/i })).not.toBeInTheDocument();
    });

    test('handles voucher without description', async () => {
      const noDescVoucher = {
        ...mockVoucher,
        description: null,
      };
      await renderComponent({ voucher: noDescVoucher });
      expect(screen.getByText('CM2 Marking Voucher')).toBeInTheDocument();
    });
  });
});
