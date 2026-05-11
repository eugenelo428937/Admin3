import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MaterialProductCard from '../MaterialProductCard';

// Mock the useCart hook to avoid Provider boilerplate.
vi.mock('../../../../contexts/CartContext.tsx', () => ({
  useCart: () => ({ cartData: {} }),
}));

const baseProduct: any = {
  id: 1,
  product_code: 'TEST/EBK/2099-04',
  is_bundle: false,
  name: 'Test Product',
  subject_code: 'ZZ1',
  subject_name: 'Test',
  session_code: '2099-04',
  variation_type: 'eBook',
  variation_name: 'Test',
  product_name: 'Test',
  product_shortname: 'Test',
  variations: [
    {
      id: 100,
      name: 'Test',
      prices: [{ price_type: 'standard', amount: '10.00' }],
    },
  ],
};

const renderCard = (overrides: object) => {
  return render(
    <ThemeProvider theme={createTheme()}>
      <MaterialProductCard product={{ ...baseProduct, ...overrides }} />
    </ThemeProvider>
  );
};

describe('MaterialProductCard sales window', () => {
  it('disables the standard Add to cart button when today is before start_date', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString();
    renderCard({ start_date: future, end_date: farFuture });
    // Find the standard Add-to-cart button (tier 3 fallback).
    const buttons = screen.queryAllByRole('button', { name: /add to cart/i });
    expect(buttons.length).toBeGreaterThan(0);
    // At least one Add-to-cart-named button must be disabled.
    expect(buttons.some(b => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('disables Add to cart when today is after end_date', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString();
    const lessPast = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
    renderCard({ start_date: past, end_date: lessPast });
    const buttons = screen.queryAllByRole('button', { name: /add to cart/i });
    expect(buttons.some(b => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('does not disable when today is inside the window', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    renderCard({ start_date: past, end_date: future });
    const buttons = screen.queryAllByRole('button', { name: /add to cart/i });
    // None of the Add-to-cart buttons should be disabled because of the
    // window. (currentVariation may still gate the main Add — the test
    // uses a fixture with a variation, so it should be enabled.)
    // Verify at least ONE Add-to-cart button is enabled.
    expect(buttons.some(b => !(b as HTMLButtonElement).disabled)).toBe(true);
  });
});
