import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MarkingProductCard from '../MarkingProductCard';

vi.mock('../../../../services/productService', () => ({
  __esModule: true,
  default: {
    getMarkingDeadlines: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../../contexts/CartContext.tsx', () => ({
  useCart: () => ({ cartData: {} }),
}));

const baseProduct: any = {
  id: 1,
  essp_id: 'ESSP001',
  product_code: 'MARK-ZZ1',
  product_name: 'Test Marking',
  subject_code: 'ZZ1',
  exam_session_code: '25S',
  type: 'Marking',
  variations: [
    {
      id: 'var-1',
      name: 'Standard Marking',
      variation_type: 'marking',
      prices: [{ price_type: 'standard', amount: 150.0 }],
    },
  ],
};

const renderCard = (overrides: object) => {
  return render(
    <ThemeProvider theme={createTheme()}>
      <MarkingProductCard
        product={{ ...baseProduct, ...overrides }}
        onAddToCart={() => {}}
        allEsspIds={[1]}
        bulkDeadlines={{ 1: [] }}
      />
    </ThemeProvider>
  );
};

describe('MarkingProductCard sales window', () => {
  it('disables Add to cart button when today is before start_date', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString();
    renderCard({ start_date: future, end_date: farFuture, session_code: '2099-04' });
    const buttons = screen.queryAllByRole('button');
    const addToCartButtons = buttons.filter(b => b.className.includes('add-to-cart-button'));
    expect(addToCartButtons.length).toBeGreaterThan(0);
    expect(addToCartButtons.some(b => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('disables Add to cart when today is after end_date', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString();
    const lessPast = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
    renderCard({ start_date: past, end_date: lessPast, session_code: '2010-04' });
    const buttons = screen.queryAllByRole('button');
    const addToCartButtons = buttons.filter(b => b.className.includes('add-to-cart-button'));
    expect(addToCartButtons.some(b => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('does not disable when today is inside the window', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    renderCard({ start_date: past, end_date: future, session_code: '2025-04' });
    const buttons = screen.queryAllByRole('button');
    const addToCartButtons = buttons.filter(b => b.className.includes('add-to-cart-button'));
    expect(addToCartButtons.length).toBeGreaterThan(0);
    expect(addToCartButtons.some(b => !(b as HTMLButtonElement).disabled)).toBe(true);
  });
});
