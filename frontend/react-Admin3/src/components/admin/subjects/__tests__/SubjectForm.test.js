// src/components/admin/subjects/__tests__/SubjectForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdminSubjectForm from '../SubjectForm';

// Mock navigate function
const mockNavigate = jest.fn();

// Create mock for react-router-dom
jest.mock('react-router-dom', () => {
  return {
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
  };
});

// Mock subjectService
jest.mock('../../../../services/subjectService', () => ({
  __esModule: true,
  default: {
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

import subjectService from '../../../../services/subjectService';

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
      <AdminSubjectForm />
    </ThemeProvider>
  );
};

describe('AdminSubjectForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      subjectService.getById.mockResolvedValue(mockSubject);
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
      subjectService.create.mockResolvedValue({});

      renderComponent();

      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'SA1' } }); // code
      fireEvent.change(inputs[1], { target: { value: 'Subject description' } }); // description

      fireEvent.click(screen.getByRole('button', { name: /create subject/i }));

      await waitFor(() => {
        expect(subjectService.create).toHaveBeenCalledWith({
          code: 'SA1',
          description: 'Subject description',
          active: true,
        });
        expect(mockNavigate).toHaveBeenCalledWith('/subjects');
      });
    });

    test('shows validation error when code is empty', async () => {
      renderComponent();

      // Clear any default value and submit
      const codeInput = screen.getAllByRole('textbox')[0];
      fireEvent.change(codeInput, { target: { value: '' } });

      fireEvent.click(screen.getByRole('button', { name: /create subject/i }));

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

      expect(mockNavigate).toHaveBeenCalledWith('/subjects');
    });
  });

  describe('error handling', () => {
    test('shows error when fetch fails in edit mode', async () => {
      subjectService.getById.mockRejectedValueOnce(new Error('Fetch error'));

      renderComponent(true);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch subject details/i)).toBeInTheDocument();
      });
    });

    test('shows error when create fails', async () => {
      subjectService.create.mockRejectedValueOnce(new Error('Create error'));

      renderComponent();

      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'SA1' } });

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
