// src/components/admin/subjects/__tests__/SubjectDetail.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdminSubjectDetail from '../SubjectDetail';

// Mock navigate function
const mockNavigate = jest.fn();

// Create mock for react-router-dom
jest.mock('react-router-dom', () => {
  return {
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '1' }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// Mock subjectService
jest.mock('../../../../services/subjectService', () => ({
  __esModule: true,
  default: {
    getById: jest.fn(),
    delete: jest.fn(),
  },
}));

import subjectService from '../../../../services/subjectService';

const theme = createTheme();

const mockSubject = {
  id: '1',
  code: 'CM2',
  description: 'Financial Mathematics and Communication',
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-06-15T12:00:00Z',
};

const renderComponent = () => {
  return render(
    <ThemeProvider theme={theme}>
      <AdminSubjectDetail />
    </ThemeProvider>
  );
};

describe('AdminSubjectDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    subjectService.getById.mockResolvedValue(mockSubject);
  });

  describe('rendering', () => {
    test('renders loading state initially', () => {
      subjectService.getById.mockReturnValue(new Promise(() => {}));
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('renders subject code in card header', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });
    });
  });

  describe('subject data display', () => {
    test('displays subject description', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Financial Mathematics and Communication')).toBeInTheDocument();
      });
    });

    test('displays active status', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    test('displays inactive status when subject is not active', async () => {
      subjectService.getById.mockResolvedValueOnce({ ...mockSubject, active: false });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Inactive')).toBeInTheDocument();
      });
    });

    test('displays "No description available" when description is empty', async () => {
      subjectService.getById.mockResolvedValueOnce({ ...mockSubject, description: '' });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No description available.')).toBeInTheDocument();
      });
    });
  });

  describe('action buttons', () => {
    test('renders edit button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument();
      });
    });

    test('renders delete button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
    });

    test('renders back to subjects button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to subjects/i })).toBeInTheDocument();
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

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this subject?');
        expect(subjectService.delete).toHaveBeenCalledWith('1');
        expect(mockNavigate).toHaveBeenCalledWith('/subjects');
      });
    });

    test('does not delete when cancelled', async () => {
      window.confirm = jest.fn().mockReturnValue(false);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      expect(subjectService.delete).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    test('navigates to subjects list on back button click', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /back to subjects/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/subjects');
    });
  });

  describe('error handling', () => {
    test('displays error when fetch fails', async () => {
      subjectService.getById.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch subject details/i)).toBeInTheDocument();
      });
    });

    test('displays error when delete fails', async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      subjectService.delete.mockRejectedValueOnce(new Error('Delete error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('CM2')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to delete subject/i)).toBeInTheDocument();
      });
    });
  });
});
