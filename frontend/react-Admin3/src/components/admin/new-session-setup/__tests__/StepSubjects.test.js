import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import StepSubjects from '../StepSubjects.tsx';

// Mock services
vi.mock('../../../../services/httpService', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../../../services/sessionSetupService', () => ({
  __esModule: true,
  default: {
    getPreviousSession: vi.fn(),
    getSessionSubjects: vi.fn(),
    getSessionDataCounts: vi.fn(),
    deactivateSessionData: vi.fn(),
  },
}));

vi.mock('../../../../config.js', () => ({
  __esModule: true,
  default: { catalogUrl: '/api/catalog' },
}));

import httpService from '../../../../services/httpService';
import sessionSetupService from '../../../../services/sessionSetupService';

import appTheme from '../../../../theme';
const theme = appTheme;

const renderWithProviders = (ui) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>
  );

const mockSubjects = [
  { id: 1, code: 'CM2', description: 'Financial Mathematics' },
  { id: 2, code: 'SA1', description: 'Health and Care' },
  { id: 3, code: 'CB1', description: 'Business Finance' },
];

describe('StepSubjects', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    httpService.get.mockResolvedValue({ data: mockSubjects });
    httpService.post.mockResolvedValue({ data: { id: 1 } });
    sessionSetupService.getPreviousSession.mockResolvedValue({
      id: 41, session_code: '2026-04',
    });
    sessionSetupService.getSessionDataCounts.mockResolvedValue({
      exam_session_subjects: 0, products: 0, bundles: 0, has_data: false,
    });
    sessionSetupService.deactivateSessionData.mockResolvedValue({
      exam_session_subjects_deactivated: 5,
      products_deactivated: 95,
      prices_deactivated: 285,
      bundles_deactivated: 28,
      bundle_products_deactivated: 142,
    });
  });

  it('renders transfer list with available subjects', async () => {
    renderWithProviders(
      <StepSubjects sessionId={42} sessionCode="2026-09" onComplete={mockOnComplete} />
    );

    await waitFor(() => {
      expect(screen.getByText('Available Subjects (3)')).toBeInTheDocument();
    });
    expect(screen.getByText(/CM2 - Financial Mathematics/)).toBeInTheDocument();
    expect(screen.getByText(/SA1 - Health and Care/)).toBeInTheDocument();
  });

  it('shows copy from previous session button', async () => {
    renderWithProviders(
      <StepSubjects sessionId={42} sessionCode="2026-09" onComplete={mockOnComplete} />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy from 2026-04/i })).toBeInTheDocument();
    });
  });

  it('moves all subjects right', async () => {
    renderWithProviders(
      <StepSubjects sessionId={42} sessionCode="2026-09" onComplete={mockOnComplete} />
    );

    await waitFor(() => {
      expect(screen.getByText('Available Subjects (3)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /move all right/i }));

    expect(screen.getByText('Available Subjects (0)')).toBeInTheDocument();
    expect(screen.getByText('Assigned Subjects (3)')).toBeInTheDocument();
  });

  it('copy from previous replaces assigned (FR-008)', async () => {
    sessionSetupService.getSessionSubjects.mockResolvedValue([
      { subject: { id: 1, code: 'CM2' } },
      { subject: { id: 2, code: 'SA1' } },
    ]);

    renderWithProviders(
      <StepSubjects sessionId={42} sessionCode="2026-09" onComplete={mockOnComplete} />
    );

    await waitFor(() => {
      expect(screen.getByText('Available Subjects (3)')).toBeInTheDocument();
    });

    // First assign all subjects
    fireEvent.click(screen.getByRole('button', { name: /move all right/i }));
    expect(screen.getByText('Assigned Subjects (3)')).toBeInTheDocument();

    // Then copy from previous - should REPLACE, not add
    fireEvent.click(screen.getByRole('button', { name: /copy from 2026-04/i }));

    await waitFor(() => {
      expect(screen.getByText('Assigned Subjects (2)')).toBeInTheDocument();
    });
  });

  it('disables save button when no subjects assigned', async () => {
    renderWithProviders(
      <StepSubjects sessionId={42} sessionCode="2026-09" onComplete={mockOnComplete} />
    );

    await waitFor(() => {
      expect(screen.getByText('Available Subjects (3)')).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: /save & continue/i });
    expect(saveBtn).toBeDisabled();
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('creates ESS records on save', async () => {
    renderWithProviders(
      <StepSubjects sessionId={42} sessionCode="2026-09" onComplete={mockOnComplete} />
    );

    await waitFor(() => {
      expect(screen.getByText('Available Subjects (3)')).toBeInTheDocument();
    });

    // Move all right
    fireEvent.click(screen.getByRole('button', { name: /move all right/i }));

    // Save
    fireEvent.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => {
      // Should create 3 ESS records (one per subject)
      expect(httpService.post).toHaveBeenCalledTimes(3);
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  // Warning dialog tests for existing sessions
  it('does NOT show warning dialog for new session', async () => {
    renderWithProviders(
      <StepSubjects
        sessionId={42}
        sessionCode="2026-09"
        isExistingSession={false}
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Available Subjects (3)')).toBeInTheDocument();
    });

    expect(sessionSetupService.getSessionDataCounts).not.toHaveBeenCalled();
    expect(screen.queryByText('Existing Data Found')).not.toBeInTheDocument();
  });

  it('shows warning dialog for existing session with data', async () => {
    sessionSetupService.getSessionDataCounts.mockResolvedValue({
      exam_session_subjects: 5,
      products: 95,
      bundles: 28,
      has_data: true,
    });

    renderWithProviders(
      <StepSubjects
        sessionId={42}
        sessionCode="2026-09"
        isExistingSession={true}
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Existing Data Found')).toBeInTheDocument();
    });

    expect(screen.getByText(/5 subject assignments/)).toBeInTheDocument();
    expect(screen.getByText(/95 products/)).toBeInTheDocument();
    expect(screen.getByText(/28 bundles/)).toBeInTheDocument();
    expect(screen.getByText(/Proceed if you want to clear/)).toBeInTheDocument();
  });

  it('does NOT show warning dialog for existing session without data', async () => {
    sessionSetupService.getSessionDataCounts.mockResolvedValue({
      exam_session_subjects: 0,
      products: 0,
      bundles: 0,
      has_data: false,
    });

    renderWithProviders(
      <StepSubjects
        sessionId={42}
        sessionCode="2026-09"
        isExistingSession={true}
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Available Subjects (3)')).toBeInTheDocument();
    });

    expect(screen.queryByText('Existing Data Found')).not.toBeInTheDocument();
  });

  it('calls deactivateSessionData on Proceed in warning dialog', async () => {
    sessionSetupService.getSessionDataCounts.mockResolvedValue({
      exam_session_subjects: 5,
      products: 95,
      bundles: 28,
      has_data: true,
    });

    renderWithProviders(
      <StepSubjects
        sessionId={42}
        sessionCode="2026-09"
        isExistingSession={true}
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Existing Data Found')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /proceed/i }));

    await waitFor(() => {
      expect(sessionSetupService.deactivateSessionData).toHaveBeenCalledWith(42);
    });

    // Dialog should close after deactivation
    await waitFor(() => {
      expect(screen.queryByText('Existing Data Found')).not.toBeInTheDocument();
    });
  });
});
