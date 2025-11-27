// src/components/admin/subjects/__tests__/SubjectList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import AdminSubjectList from '../SubjectList';

// Mock subjectService
jest.mock('../../../../services/subjectService', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    delete: jest.fn(),
  },
}));

import subjectService from '../../../../services/subjectService';

const theme = createTheme();

const mockSubjects = [
  {
    id: '1',
    code: 'CM2',
    description: 'Financial Mathematics and Communication',
    active: true,
  },
  {
    id: '2',
    code: 'SA1',
    description: 'Actuarial Statistics',
    active: false,
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AdminSubjectList />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AdminSubjectList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    subjectService.getAll.mockResolvedValue(mockSubjects);
  });

  describe('rendering', () => {
    test('renders page title', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /subjects/i })).toBeInTheDocument();
      });
    });

    test('renders loading state initially', () => {
      subjectService.getAll.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('renders add new subject button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /add new subject/i })).toBeInTheDocument();
      });
    });

    test('renders upload subject button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /upload subject/i })).toBeInTheDocument();
      });
    });

    test('renders table headers', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Code')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });
  });

  describe('data display', () => {
    test('fetches and displays subjects', async () => {
      renderComponent();

      await waitFor(() => {
        expect(subjectService.getAll).toHaveBeenCalled();
        expect(screen.getByText('CM2')).toBeInTheDocument();
        expect(screen.getByText('SA1')).toBeInTheDocument();
      });
    });

    test('displays subject descriptions', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Financial Mathematics and Communication')).toBeInTheDocument();
        expect(screen.getByText('Actuarial Statistics')).toBeInTheDocument();
      });
    });

    test('displays view buttons for each subject', async () => {
      renderComponent();

      await waitFor(() => {
        const viewButtons = screen.getAllByRole('link', { name: /view/i });
        expect(viewButtons).toHaveLength(2);
      });
    });

    test('displays edit buttons for each subject', async () => {
      renderComponent();

      await waitFor(() => {
        const editButtons = screen.getAllByRole('link', { name: /edit/i });
        expect(editButtons).toHaveLength(2);
      });
    });

    test('displays delete buttons for each subject', async () => {
      renderComponent();

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        expect(deleteButtons).toHaveLength(2);
      });
    });
  });

  describe('delete functionality', () => {
    test('calls delete when delete button clicked and confirmed', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      subjectService.delete.mockResolvedValue({});

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this subject?');
        expect(subjectService.delete).toHaveBeenCalledWith('1');
      });
    });

    test('does not delete when cancelled', async () => {
      window.confirm = jest.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(subjectService.delete).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      subjectService.getAll.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch subjects/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      subjectService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete subject/i)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    test('displays empty message when no subjects', async () => {
      subjectService.getAll.mockResolvedValueOnce([]);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no subjects found/i)).toBeInTheDocument();
      });
    });
  });

  describe('data format handling', () => {
    test('handles array response', async () => {
      subjectService.getAll.mockResolvedValueOnce(mockSubjects);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });
    });

    test('handles paginated response with results property', async () => {
      subjectService.getAll.mockResolvedValueOnce({ results: mockSubjects });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });
    });

    test('handles object response', async () => {
      subjectService.getAll.mockResolvedValueOnce({
        '1': mockSubjects[0],
        '2': mockSubjects[1],
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });
    });
  });

  describe('links', () => {
    test('add new subject links to correct path', async () => {
      renderComponent();

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /add new subject/i });
        expect(link).toHaveAttribute('href', '/subjects/new');
      });
    });

    test('upload subject links to correct path', async () => {
      renderComponent();

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /upload subject/i });
        expect(link).toHaveAttribute('href', '/subjects/import');
      });
    });
  });
});
