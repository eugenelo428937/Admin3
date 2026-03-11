import { vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import SessionProductsSummary from '../SessionProductsSummary.js';

vi.mock('../../../../services/storeProductService.js', () => ({
  __esModule: true,
  default: {
    adminList: vi.fn(),
  },
}));

import storeProductService from '../../../../services/storeProductService.js';

import appTheme from '../../../../theme';
const theme = appTheme;

const renderWithProviders = (ui) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>
  );

const mockProducts = [
  { id: 1, product_code: 'CM2/PC/2026-09', subject_code: 'CM2', product_name: 'Core Reading', variation_name: 'Printed', is_active: true },
  { id: 2, product_code: 'CM2/EC/2026-09', subject_code: 'CM2', product_name: 'Core Reading', variation_name: 'eBook', is_active: true },
  { id: 3, product_code: 'SA1/PC/2026-09', subject_code: 'SA1', product_name: 'Specialist', variation_name: 'Printed', is_active: true },
];

describe('SessionProductsSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches products with session filter and renders table', async () => {
    storeProductService.adminList.mockResolvedValue({ results: mockProducts });

    renderWithProviders(<SessionProductsSummary sessionId={42} />);

    // Wait for table to render after async fetch
    await waitFor(() => {
      expect(screen.getByText('Product Code')).toBeInTheDocument();
    });

    expect(storeProductService.adminList).toHaveBeenCalledWith({
      exam_session_id: 42,
      page_size: 500,
    });

    // Table headers
    expect(screen.getByText('Subject')).toBeInTheDocument();
    expect(screen.getByText('Variation')).toBeInTheDocument();

    // Table data
    expect(screen.getByText('CM2/PC/2026-09')).toBeInTheDocument();
    expect(screen.getByText('CM2/EC/2026-09')).toBeInTheDocument();
    expect(screen.getByText('SA1/PC/2026-09')).toBeInTheDocument();
  });

  it('shows empty state when no products found', async () => {
    storeProductService.adminList.mockResolvedValue({ results: [] });

    renderWithProviders(<SessionProductsSummary sessionId={42} />);

    await waitFor(() => {
      expect(screen.getByText('No products found.')).toBeInTheDocument();
    });
  });

  it('shows error state on fetch failure', async () => {
    storeProductService.adminList.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<SessionProductsSummary sessionId={42} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load products')).toBeInTheDocument();
    });
  });

  it('shows View All link', async () => {
    storeProductService.adminList.mockResolvedValue({ results: mockProducts });

    renderWithProviders(<SessionProductsSummary sessionId={42} />);

    await waitFor(() => {
      expect(screen.getByText('View All Store Products')).toBeInTheDocument();
    });
  });
});
