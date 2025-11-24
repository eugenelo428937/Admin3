import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MaterialProductCard from '../MaterialProductCard';
import { useCart } from '../../../../contexts/CartContext';

jest.mock('../../../../contexts/CartContext', () => ({ useCart: jest.fn() }));
jest.mock('../Tutorial/TutorialProductCard', () => ({ __esModule: true, default: () => null }));
jest.mock('../MarkingProductCard', () => ({ __esModule: true, default: () => null }));
jest.mock('../MarkingVoucherProductCard', () => ({ __esModule: true, default: () => null }));
jest.mock('../OnlineClassroomProductCard', () => ({ __esModule: true, default: () => null }));
jest.mock('../BundleCard', () => ({ __esModule: true, default: () => null }));

describe('MaterialProductCard', () => {
  beforeEach(() => {
    useCart.mockReturnValue({ cartData: { vat_calculations: { region_info: { region: 'UK' } } } });
  });

  const mockProduct = {
    id: 1,
    product_name: 'Test Product',
    price: 49.99,
    variations: [],
  };

  const renderWithTheme = (component) => {
    return render(<ThemeProvider theme={createTheme()}>{component}</ThemeProvider>);
  };

  test('renders product', () => {
    renderWithTheme(<MaterialProductCard product={mockProduct} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });
});
