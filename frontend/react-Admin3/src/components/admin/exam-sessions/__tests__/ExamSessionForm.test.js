// src/components/admin/exam-sessions/__tests__/ExamSessionForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdminExamSessionForm from '../ExamSessionForm';

// Mock navigate function
const mockNavigate = jest.fn();

// Create mock for react-router-dom
jest.mock('react-router-dom', () => {
  return {
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
  };
});

// Mock examSessionService
jest.mock('../../../../services/examSessionService', () => ({
  __esModule: true,
  default: {
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

import examSessionService from '../../../../services/examSessionService';

const theme = createTheme();

// Helper to set mock useParams
const setMockParams = (params) => {
  require('react-router-dom').useParams = jest.fn().mockReturnValue(params);
};

const renderComponent = (isEditMode = false) => {
  if (isEditMode) {
    setMockParams({ id: '1' });
  } else {
    setMockParams({});
  }

  return render(
    <ThemeProvider theme={theme}>
      <AdminExamSessionForm />
    </ThemeProvider>
  );
};

describe('AdminExamSessionForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create mode', () => {
    test('renders create form title', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /create exam session/i })).toBeInTheDocument();
    });

    test('renders session code label', () => {
      renderComponent();
      expect(screen.getByText(/session code/i)).toBeInTheDocument();
    });

    test('renders start date label', () => {
      renderComponent();
      expect(screen.getByText(/start date/i)).toBeInTheDocument();
    });

    test('renders end date label', () => {
      renderComponent();
      expect(screen.getByText(/end date/i)).toBeInTheDocument();
    });

    test('renders create button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /create exam session/i })).toBeInTheDocument();
    });

    test('renders cancel button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('renders form inputs', () => {
      renderComponent();
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edit mode', () => {
    const mockSession = {
      session_code: 'SEPT2024',
      start_date: '2024-09-01T00:00:00Z',
      end_date: '2024-09-30T23:59:59Z',
    };

    beforeEach(() => {
      examSessionService.getById.mockResolvedValue(mockSession);
    });

    test('renders edit form title', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit exam session/i })).toBeInTheDocument();
      });
    });

    test('fetches session data on mount', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(examSessionService.getById).toHaveBeenCalledWith('1');
      });
    });

    test('displays fetched session code', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('SEPT2024')).toBeInTheDocument();
      });
    });

    test('shows update button in edit mode', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update exam session/i })).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    test('navigates to list on cancel', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/exam-sessions');
    });
  });

  describe('error handling', () => {
    test('shows error when fetch fails in edit mode', async () => {
      examSessionService.getById.mockRejectedValueOnce(new Error('Fetch error'));

      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch exam session/i)).toBeInTheDocument();
      });
    });
  });
});
