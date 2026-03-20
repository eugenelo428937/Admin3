import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import StepMaterials from '../StepMaterials.tsx';

vi.mock('../../../../services/sessionSetupService', () => ({
  __esModule: true,
  default: {
    getPreviousSession: vi.fn(),
    copyProducts: vi.fn(),
  },
}));

vi.mock('../../../../services/storeProductService', () => ({
  __esModule: true,
  default: {
    adminList: vi.fn(),
  },
}));

vi.mock('../../../../services/storeBundleService', () => ({
  __esModule: true,
  default: {
    adminList: vi.fn(),
  },
}));

import sessionSetupService from '../../../../services/sessionSetupService';
import storeProductService from '../../../../services/storeProductService';
import storeBundleService from '../../../../services/storeBundleService';

import appTheme from '../../../../theme';
const theme = appTheme;

const renderWithProviders = (ui) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>
  );

describe('StepMaterials', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionSetupService.getPreviousSession.mockResolvedValue({
      id: 41, session_code: '2026-04',
    });
    storeProductService.adminList.mockResolvedValue({
      results: [
        { id: 1, product_code: 'CM2/PC/2026-09', subject_code: 'CM2', product_name: 'Core Reading', variation_name: 'Printed', is_active: true },
      ],
    });
    storeBundleService.adminList.mockResolvedValue({
      results: [
        { id: 1, name: 'CM2 Bundle', template_name: 'Standard Bundle', subject_code: 'CM2', is_active: true, component_count: 3 },
      ],
    });
  });

  it('renders dialog with Proceed and Set up later buttons', async () => {
    renderWithProviders(
      <StepMaterials sessionId={42} sessionCode="2026-09" onComplete={mockOnComplete} />
    );

    await waitFor(() => {
      expect(screen.getByText('Copy from 2026-04')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /proceed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set up later/i })).toBeInTheDocument();
  });

  it('calls copyProducts on Proceed and shows success summary with products and bundles', async () => {
    sessionSetupService.copyProducts.mockResolvedValue({
      products_created: 95,
      prices_created: 285,
      bundles_created: 28,
      bundle_products_created: 142,
      skipped_subjects: ['SP9'],
      message: 'Successfully created 95 products, 285 prices, and 28 bundles for session 2026-09.',
    });

    renderWithProviders(
      <StepMaterials sessionId={42} sessionCode="2026-09" onComplete={mockOnComplete} />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /proceed/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /proceed/i }));

    await waitFor(() => {
      expect(screen.getByText(/Successfully created 95 products/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Products created/)).toBeInTheDocument();
    expect(screen.getByText(/Prices created/)).toBeInTheDocument();
    expect(screen.getByText(/Skipped subjects/)).toBeInTheDocument();

    // Verify summary sections appear
    expect(screen.getByText('Products Created')).toBeInTheDocument();
    expect(screen.getByText('Bundles Created')).toBeInTheDocument();

    // Verify product summary table rendered
    await waitFor(() => {
      expect(storeProductService.adminList).toHaveBeenCalledWith({
        exam_session_id: 42,
        page_size: 500,
      });
    });
    expect(screen.getByText('CM2/PC/2026-09')).toBeInTheDocument();

    // Verify bundle summary table rendered
    await waitFor(() => {
      expect(storeBundleService.adminList).toHaveBeenCalledWith({
        exam_session_id: 42,
        page_size: 100,
      });
    });
    expect(screen.getByText('CM2 Bundle')).toBeInTheDocument();
  });

  it('Set up later skips copy and advances', async () => {
    renderWithProviders(
      <StepMaterials sessionId={42} sessionCode="2026-09" onComplete={mockOnComplete} />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /set up later/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /set up later/i }));

    expect(sessionSetupService.copyProducts).not.toHaveBeenCalled();
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('displays error message on copy failure', async () => {
    sessionSetupService.copyProducts.mockRejectedValue({
      response: { data: { error: 'Copy operation failed.' } },
    });

    renderWithProviders(
      <StepMaterials sessionId={42} sessionCode="2026-09" onComplete={mockOnComplete} />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /proceed/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /proceed/i }));

    await waitFor(() => {
      expect(screen.getByText('Copy operation failed.')).toBeInTheDocument();
    });
  });

  it('handles no previous session gracefully', async () => {
    sessionSetupService.getPreviousSession.mockResolvedValue(null);

    renderWithProviders(
      <StepMaterials sessionId={42} sessionCode="2026-09" onComplete={mockOnComplete} />
    );

    await waitFor(() => {
      expect(screen.getByText('No Previous Session')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /proceed/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set up later/i })).toBeInTheDocument();
  });
});
