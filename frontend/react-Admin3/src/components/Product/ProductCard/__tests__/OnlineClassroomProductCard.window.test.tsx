import { vi } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import OnlineClassroomProductCard from '../OnlineClassroomProductCard';

// Mock the useCart hook to avoid Provider boilerplate.
vi.mock('../../../../contexts/CartContext.tsx', () => ({
  useCart: () => ({ cartData: {} }),
}));

const baseProduct: any = {
  id: 1,
  subject_code: 'ZZ1',
  product_name: 'Test Online Classroom',
  type: 'online_classroom',
  variations: [
    {
      id: 100,
      name: 'Test',
      variation_type: 'access',
      prices: [{ price_type: 'standard', amount: '10.00' }],
    },
  ],
};

const renderCard = async (overrides: object) => {
  let result;
  await act(async () => {
    result = render(
      <ThemeProvider theme={createTheme()}>
        <OnlineClassroomProductCard
          product={{ ...baseProduct, ...overrides }}
          onAddToCart={() => {}}
        />
      </ThemeProvider>
    );
  });
  return result;
};

describe('OnlineClassroomProductCard sales window', () => {
  it('disables Add to cart button when today is before start_date', async () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString();
    await renderCard({ start_date: future, end_date: farFuture, session_code: '2099-04' });
    const buttons = screen.queryAllByRole('button');
    const addToCartButtons = buttons.filter(b => b.className.includes('add-to-cart-button'));
    expect(addToCartButtons.length).toBeGreaterThan(0);
    expect(addToCartButtons.some(b => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('disables Add to cart when today is after end_date', async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString();
    const lessPast = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
    await renderCard({ start_date: past, end_date: lessPast, session_code: '2010-04' });
    const buttons = screen.queryAllByRole('button');
    const addToCartButtons = buttons.filter(b => b.className.includes('add-to-cart-button'));
    expect(addToCartButtons.some(b => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('does not disable when today is inside the window', async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    await renderCard({ start_date: past, end_date: future, session_code: '2025-04' });
    const buttons = screen.queryAllByRole('button');
    const addToCartButtons = buttons.filter(b => b.className.includes('add-to-cart-button'));
    expect(addToCartButtons.length).toBeGreaterThan(0);
    expect(addToCartButtons.some(b => !(b as HTMLButtonElement).disabled)).toBe(true);
  });
});
