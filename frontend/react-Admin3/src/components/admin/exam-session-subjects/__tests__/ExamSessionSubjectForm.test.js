import { vi } from 'vitest';
// src/components/admin/exam-session-subjects/__tests__/ExamSessionSubjectForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import AdminExamSessionSubjectForm from '../ExamSessionSubjectForm.js';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.js', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.js';

// Mock navigate function
const mockNavigate = vi.fn();

// Create mock for react-router-dom
vi.mock('react-router-dom', () => {
  return {
    useNavigate: vi.fn(() => mockNavigate),
    useParams: vi.fn(() => ({})),
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
  };
});

// Mock examSessionSubjectService
vi.mock('../../../../services/examSessionSubjectService.js', () => ({
  __esModule: true,
  default: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

import examSessionSubjectService from '../../../../services/examSessionSubjectService.js';

// Mock examSessionService
vi.mock('../../../../services/examSessionService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
  },
}));

import examSessionService from '../../../../services/examSessionService';

// Mock subjectService
vi.mock('../../../../services/subjectService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
  },
}));

import subjectService from '../../../../services/subjectService';

const theme = appTheme;

// import gets the mocked version since vi.mock is hoisted
import { useParams } from 'react-router-dom';
import appTheme from '../../../../theme';
const setMockParams = (params) => {
  useParams.mockReturnValue(params);
};

const mockExamSessions = [
  { id: '1', session_code: '2025-04' },
  { id: '2', session_code: '2025-09' },
];

const mockSubjects = [
  { id: '1', code: 'CM2' },
  { id: '2', code: 'SA1' },
];

const mockEditData = {
  id: '1',
  exam_session: 1,
  subject: 1,
  is_active: true,
};

const renderComponent = (isEditMode = false) => {
  if (isEditMode) {
    setMockParams({ id: '1' });
  } else {
    setMockParams({});
  }

  return render(
    <ThemeProvider theme={theme}>
      <AdminExamSessionSubjectForm />
    </ThemeProvider>
  );
};

describe('AdminExamSessionSubjectForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
    examSessionService.getAll.mockResolvedValue(mockExamSessions);
    subjectService.getAll.mockResolvedValue(mockSubjects);
  });

  describe('create mode', () => {
    test('renders create form title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create exam session subject/i })).toBeInTheDocument();
      });
    });

    test('renders exam session label', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Exam Session')).toBeInTheDocument();
      });
    });

    test('renders subject label', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Subject')).toBeInTheDocument();
      });
    });

    test('renders active checkbox', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /active/i })).toBeInTheDocument();
      });
    });

    test('active checkbox is checked by default', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /active/i })).toBeChecked();
      });
    });

    test('renders create button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create exam session subject/i })).toBeInTheDocument();
      });
    });

    test('renders cancel button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    test('fetches dropdown data on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(examSessionService.getAll).toHaveBeenCalled();
        expect(subjectService.getAll).toHaveBeenCalled();
      });
    });
  });

  describe('edit mode', () => {
    beforeEach(() => {
      examSessionSubjectService.getById.mockResolvedValue(mockEditData);
    });

    test('renders edit form title', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit exam session subject/i })).toBeInTheDocument();
      });
    });

    test('fetches exam session subject data on mount', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(examSessionSubjectService.getById).toHaveBeenCalledWith('1');
      });
    });

    test('shows update button in edit mode', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update exam session subject/i })).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    test('navigates to list on cancel', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/exam-session-subjects');
    });
  });

  describe('error handling', () => {
    test('shows error when fetch fails in edit mode', async () => {
      examSessionSubjectService.getById.mockRejectedValueOnce(new Error('Fetch error'));

      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch exam session subject/i)).toBeInTheDocument();
      });
    });
  });
});
