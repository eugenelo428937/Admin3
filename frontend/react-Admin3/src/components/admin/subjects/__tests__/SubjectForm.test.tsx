import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminSubjectForm from '../SubjectForm.tsx';

// Mock useAuth
vi.mock('../../../../hooks/useAuth.tsx', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../../hooks/useAuth.tsx';

// Mock navigate function
const mockNavigate = vi.fn();

// Create mock for react-router-dom
vi.mock('react-router-dom', () => {
  return {
    useNavigate: vi.fn(() => mockNavigate),
    useParams: vi.fn(() => ({})),
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock subjectService
vi.mock('../../../../services/subjectService', () => ({
  __esModule: true,
  default: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

import subjectService from '../../../../services/subjectService';

// import gets the mocked version since vi.mock is hoisted
import { useParams } from 'react-router-dom';

const setMockParams = (params: Record<string, string>) => {
  (useParams as any).mockReturnValue(params);
};

const renderComponent = (isEditMode = false) => {
  if (isEditMode) {
    setMockParams({ id: '1' });
  } else {
    setMockParams({});
  }

  return render(<AdminSubjectForm />);
};

describe('AdminSubjectForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });
  });

  describe('create mode', () => {
    test('renders create form title', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /add new subject/i })).toBeInTheDocument();
    });

    test('renders subject code label', () => {
      renderComponent();
      expect(screen.getByText('Subject Code')).toBeInTheDocument();
    });

    test('renders description label', () => {
      renderComponent();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    test('renders active checkbox', () => {
      renderComponent();
      expect(screen.getByRole('checkbox', { name: /active/i })).toBeInTheDocument();
    });

    test('active checkbox is checked by default', () => {
      renderComponent();
      expect(screen.getByRole('checkbox', { name: /active/i })).toBeChecked();
    });

    test('renders create button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /create subject/i })).toBeInTheDocument();
    });

    test('renders cancel button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    const mockSubject = {
      code: 'CM2',
      description: 'Financial Mathematics',
      active: true,
    };

    beforeEach(() => {
      (subjectService.getById as any).mockResolvedValue(mockSubject);
    });

    test('renders edit form title', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit subject/i })).toBeInTheDocument();
      });
    });

    test('fetches subject data on mount', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(subjectService.getById).toHaveBeenCalledWith('1');
      });
    });

    test('displays fetched subject code', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('CM2')).toBeInTheDocument();
      });
    });

    test('displays fetched description', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Financial Mathematics')).toBeInTheDocument();
      });
    });

    test('shows update button in edit mode', async () => {
      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update subject/i })).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    test('creates subject on submit in create mode', async () => {
      (subjectService.create as any).mockResolvedValue({});

      renderComponent();

      const codeInput = screen.getByPlaceholderText(/enter subject code/i);
      fireEvent.change(codeInput, { target: { name: 'code', value: 'SA1' } });

      const descInput = screen.getByPlaceholderText(/enter subject description/i);
      fireEvent.change(descInput, { target: { name: 'description', value: 'Subject description' } });

      fireEvent.click(screen.getByRole('button', { name: /create subject/i }));

      await waitFor(() => {
        expect(subjectService.create).toHaveBeenCalledWith({
          code: 'SA1',
          description: 'Subject description',
          active: true,
        });
        expect(mockNavigate).toHaveBeenCalledWith('/admin/subjects');
      });
    });

    test('shows validation error when code is empty', async () => {
      renderComponent();

      // Clear the code input and submit
      const codeInput = screen.getByPlaceholderText(/enter subject code/i);
      fireEvent.change(codeInput, { target: { name: 'code', value: '' } });

      const submitButton = screen.getByRole('button', { name: /create subject/i });
      fireEvent.submit(submitButton.closest('form')!);

      await waitFor(() => {
        // The error message appears as an Alert
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    test('navigates to list on cancel', () => {
      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/subjects');
    });
  });

  describe('error handling', () => {
    test('shows error when fetch fails in edit mode', async () => {
      (subjectService.getById as any).mockRejectedValueOnce(new Error('Fetch error'));

      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch subject details/i)).toBeInTheDocument();
      });
    });

    test('shows error when create fails', async () => {
      (subjectService.create as any).mockRejectedValueOnce(new Error('Create error'));

      renderComponent();

      const codeInput = screen.getByPlaceholderText(/enter subject code/i);
      fireEvent.change(codeInput, { target: { name: 'code', value: 'SA1' } });

      fireEvent.click(screen.getByRole('button', { name: /create subject/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to create subject/i)).toBeInTheDocument();
      });
    });
  });

  describe('checkbox interaction', () => {
    test('toggles active checkbox', () => {
      renderComponent();

      const checkbox = screen.getByRole('checkbox', { name: /active/i });
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });
});
