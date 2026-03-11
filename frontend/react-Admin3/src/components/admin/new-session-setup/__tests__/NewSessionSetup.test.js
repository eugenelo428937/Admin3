import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NewSessionSetup from '../NewSessionSetup.js';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

// Mock child components to isolate integration behavior
vi.mock('../StepExamSession.js', () => ({
  __esModule: true,
  default: function MockStepExamSession({ onSessionCreated }) {
    return (
      <div data-testid="step-exam-session">
        <button
          onClick={() => onSessionCreated(
            { id: 42, session_code: '2026-09' },
            { isExisting: false }
          )}
        >
          Create Session
        </button>
        <button
          onClick={() => onSessionCreated(
            { id: 41, session_code: '2026-04' },
            { isExisting: true }
          )}
        >
          Select Existing
        </button>
      </div>
    );
  },
}));

vi.mock('../StepSubjects.js', () => ({
  __esModule: true,
  default: function MockStepSubjects({ onComplete, isExistingSession }) {
    return (
      <div data-testid="step-subjects">
        <span data-testid="is-existing">{String(isExistingSession)}</span>
        <button onClick={onComplete}>Save Subjects</button>
      </div>
    );
  },
}));

vi.mock('../StepMaterials.js', () => ({
  __esModule: true,
  default: function MockStepMaterials({ onComplete }) {
    return (
      <div data-testid="step-materials">
        <button onClick={onComplete}>Complete Materials</button>
      </div>
    );
  },
}));

vi.mock('../StepTutorials.js', () => ({
  __esModule: true,
  default: function MockStepTutorials({ onComplete }) {
    return (
      <div data-testid="step-tutorials">
        <button onClick={onComplete}>Set up later</button>
      </div>
    );
  },
}));

import { useAuth } from '../../../../hooks/useAuth.js';

import appTheme from '../../../../theme';
const theme = appTheme;

const renderWithProviders = (initialPath = '/admin/new-session-setup') =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/admin/new-session-setup" element={<NewSessionSetup />} />
          <Route path="/admin/new-session-setup/:sessionId" element={<NewSessionSetup />} />
          <Route path="/admin/exam-sessions" element={<div data-testid="exam-sessions-page" />} />
          <Route path="/" element={<div data-testid="home-page" />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );

describe('NewSessionSetup - Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ isSuperuser: true });
  });

  it('redirects non-superusers to home', () => {
    useAuth.mockReturnValue({ isSuperuser: false });
    renderWithProviders();

    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('renders wizard with stepper and Step 1 initially', () => {
    renderWithProviders();

    expect(screen.getAllByText('New Session Setup').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Exam Session').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Subjects').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Materials & Marking').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tutorials').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('step-exam-session').length).toBeGreaterThanOrEqual(1);
  });

  it('advances from Step 1 to Step 2 after session creation', async () => {
    renderWithProviders();

    fireEvent.click(screen.getAllByText('Create Session')[0]);

    await waitFor(() => {
      expect(screen.getAllByTestId('step-subjects').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('passes isExistingSession=false for new session', async () => {
    renderWithProviders();

    fireEvent.click(screen.getAllByText('Create Session')[0]);

    await waitFor(() => {
      expect(screen.getByTestId('is-existing')).toHaveTextContent('false');
    });
  });

  it('passes isExistingSession=true for existing session', async () => {
    renderWithProviders();

    fireEvent.click(screen.getAllByText('Select Existing')[0]);

    await waitFor(() => {
      expect(screen.getByTestId('is-existing')).toHaveTextContent('true');
    });
  });

  it('advances through all 4 steps to completion', async () => {
    renderWithProviders();

    // Step 1 → Step 2
    fireEvent.click(screen.getAllByText('Create Session')[0]);
    await waitFor(() => {
      expect(screen.getAllByTestId('step-subjects').length).toBeGreaterThanOrEqual(1);
    });

    // Step 2 → Step 3
    fireEvent.click(screen.getAllByText('Save Subjects')[0]);
    await waitFor(() => {
      expect(screen.getAllByTestId('step-materials').length).toBeGreaterThanOrEqual(1);
    });

    // Step 3 → Step 4
    fireEvent.click(screen.getAllByText('Complete Materials')[0]);
    await waitFor(() => {
      expect(screen.getAllByTestId('step-tutorials').length).toBeGreaterThanOrEqual(1);
    });

    // Step 4 → Redirect to exam sessions
    fireEvent.click(screen.getAllByText('Set up later')[0]);
    await waitFor(() => {
      expect(screen.queryByTestId('exam-sessions-page')).toBeInTheDocument();
    });
  });
});
