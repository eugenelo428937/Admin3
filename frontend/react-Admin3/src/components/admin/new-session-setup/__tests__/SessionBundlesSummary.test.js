import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import SessionBundlesSummary from '../SessionBundlesSummary';

jest.mock('../../../../services/storeBundleService', () => ({
  __esModule: true,
  default: {
    adminList: jest.fn(),
  },
}));

import storeBundleService from '../../../../services/storeBundleService';

const theme = createTheme();

const renderWithProviders = (ui) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>
  );

const mockBundles = [
  { id: 1, name: 'CM2 Standard Bundle', template_name: 'Standard Bundle', subject_code: 'CM2', is_active: true, component_count: 3 },
  { id: 2, name: 'SA1 Standard Bundle', template_name: 'Standard Bundle', subject_code: 'SA1', is_active: true, component_count: 4 },
];

describe('SessionBundlesSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches bundles with session filter and renders table', async () => {
    storeBundleService.adminList.mockResolvedValue({ results: mockBundles });

    renderWithProviders(<SessionBundlesSummary sessionId={42} />);

    // Wait for table to render after async fetch
    await waitFor(() => {
      expect(screen.getByText('CM2 Standard Bundle')).toBeInTheDocument();
    });

    expect(storeBundleService.adminList).toHaveBeenCalledWith({
      exam_session_id: 42,
      page_size: 100,
    });

    // Table headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText('Components')).toBeInTheDocument();

    // Table data
    expect(screen.getByText('SA1 Standard Bundle')).toBeInTheDocument();
  });

  it('shows empty state when no bundles found', async () => {
    storeBundleService.adminList.mockResolvedValue({ results: [] });

    renderWithProviders(<SessionBundlesSummary sessionId={42} />);

    await waitFor(() => {
      expect(screen.getByText('No bundles found.')).toBeInTheDocument();
    });
  });

  it('shows error state on fetch failure', async () => {
    storeBundleService.adminList.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<SessionBundlesSummary sessionId={42} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load bundles')).toBeInTheDocument();
    });
  });

  it('shows View All link', async () => {
    storeBundleService.adminList.mockResolvedValue({ results: mockBundles });

    renderWithProviders(<SessionBundlesSummary sessionId={42} />);

    await waitFor(() => {
      expect(screen.getByText('View All Store Bundles')).toBeInTheDocument();
    });
  });
});
