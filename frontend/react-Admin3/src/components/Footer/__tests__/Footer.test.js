import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Footer from '../Footer';
import theme from '../../../theme/theme';
import productService from '../../../services/productService';
import filtersReducer from '../../../store/slices/filtersSlice';

// Mock productService
jest.mock('../../../services/productService');

// Mock subjects data
const mockSubjects = [
  { id: 1, code: 'CB1', description: 'Business Finance', active: true },
  { id: 2, code: 'CB2', description: 'Business Economics', active: true },
  { id: 3, code: 'CM1', description: 'Actuarial Mathematics', active: true },
  { id: 4, code: 'CP1', description: 'Actuarial Practice', active: true },
  { id: 5, code: 'CP2', description: 'Modelling Practice', active: true },
  { id: 6, code: 'SP1', description: 'Health and Care', active: true },
  { id: 7, code: 'SP2', description: 'Life Insurance', active: true },
  { id: 8, code: 'SA1', description: 'Health and Care Advanced', active: true },
  { id: 9, code: 'SA2', description: 'Life Insurance Advanced', active: true },
];

// Mock navbar product groups data (as returned from API)
const mockNavbarProductGroups = [
  {
    id: 1,
    name: 'Core Study Materials',
    products: [
      { id: 101, shortname: 'Course Notes' },
      { id: 102, shortname: 'Assignment Guide' },
    ],
  },
  {
    id: 2,
    name: 'Revision Materials',
    products: [
      { id: 201, shortname: 'Flashcards' },
      { id: 202, shortname: 'Revision Notes' },
    ],
  },
  {
    id: 3,
    name: 'Marking',
    products: [
      { id: 301, shortname: 'Marking Service' },
    ],
  },
  {
    id: 4,
    name: 'Tutorial',
    products: [
      { id: 401, shortname: 'London' },
      { id: 402, shortname: 'Manchester' },
    ],
  },
];

// Mock navigation data response
const mockNavigationData = {
  subjects: mockSubjects,
  navbarProductGroups: mockNavbarProductGroups,
  distanceLearningData: [],
  tutorialData: null,
};

// Create a mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      filters: filtersReducer,
    },
  });
};

// Helper function to render Footer with all necessary providers
const renderFooter = (store = createMockStore()) => {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <Footer />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );
};

describe('Footer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    productService.getNavigationData.mockResolvedValue(mockNavigationData);
  });

  describe('Rendering', () => {
    test('renders without crashing', async () => {
      renderFooter();
      await waitFor(() => {
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      });
    });

    test('renders structure even before data loads', () => {
      productService.getNavigationData.mockResolvedValue({ subjects: [], navbarProductGroups: [] });
      renderFooter();
      // Should still render structure even without data
      expect(screen.getByText('Subjects')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Support')).toBeInTheDocument();
    });

    test('fetches navigation data on mount', async () => {
      renderFooter();
      await waitFor(() => {
        expect(productService.getNavigationData).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Subject Categories', () => {
    test('renders all subject category headers', async () => {
      renderFooter();
      await waitFor(() => {
        expect(screen.getByText('Core Principles')).toBeInTheDocument();
        expect(screen.getByText('Core Practices')).toBeInTheDocument();
        expect(screen.getByText('Specialist Principles')).toBeInTheDocument();
        expect(screen.getByText('Specialist Advanced')).toBeInTheDocument();
      });
    });

    test('renders Core Principles subjects (CB, CS, CM)', async () => {
      renderFooter();
      await waitFor(() => {
        // Subject text is split across multiple elements, so check for codes
        expect(screen.getByText(/CB1/)).toBeInTheDocument();
        expect(screen.getByText(/CB2/)).toBeInTheDocument();
        expect(screen.getByText(/CM1/)).toBeInTheDocument();
        // Also verify descriptions are present
        expect(screen.getByText(/Business Finance/)).toBeInTheDocument();
        expect(screen.getByText(/Business Economics/)).toBeInTheDocument();
        expect(screen.getByText(/Actuarial Mathematics/)).toBeInTheDocument();
      });
    });

    test('renders Core Practices subjects (CP1-3)', async () => {
      renderFooter();
      await waitFor(() => {
        expect(screen.getByText(/CP1/)).toBeInTheDocument();
        expect(screen.getByText(/CP2/)).toBeInTheDocument();
        expect(screen.getByText(/Actuarial Practice/)).toBeInTheDocument();
        expect(screen.getByText(/Modelling Practice/)).toBeInTheDocument();
      });
    });

    test('renders Specialist Principles subjects (SP)', async () => {
      renderFooter();
      await waitFor(() => {
        expect(screen.getByText(/SP1/)).toBeInTheDocument();
        expect(screen.getByText(/SP2/)).toBeInTheDocument();
        expect(screen.getByText(/Health and Care(?! Advanced)/)).toBeInTheDocument();
        expect(screen.getByText(/Life Insurance(?! Advanced)/)).toBeInTheDocument();
      });
    });

    test('renders Specialist Advanced subjects (SA)', async () => {
      renderFooter();
      await waitFor(() => {
        expect(screen.getByText(/SA1/)).toBeInTheDocument();
        expect(screen.getByText(/SA2/)).toBeInTheDocument();
        expect(screen.getByText(/Health and Care Advanced/)).toBeInTheDocument();
        expect(screen.getByText(/Life Insurance Advanced/)).toBeInTheDocument();
      });
    });
  });

  describe('Product Sections', () => {
    test('renders product section headers', async () => {
      renderFooter();
      await waitFor(() => {
        expect(screen.getByText('Core Study Materials')).toBeInTheDocument();
        expect(screen.getByText('Revision Materials')).toBeInTheDocument();
        expect(screen.getByText('Marking Products')).toBeInTheDocument();
      });
    });

    test('renders tutorial section with Location and Format', async () => {
      renderFooter();
      await waitFor(() => {
        expect(screen.getByText('Tutorial')).toBeInTheDocument();
        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('Format')).toBeInTheDocument();
      });
    });

    test('renders core study materials products', async () => {
      renderFooter();
      await waitFor(() => {
        expect(screen.getByText('Course Notes')).toBeInTheDocument();
        expect(screen.getByText('Assignment Guide')).toBeInTheDocument();
      });
    });

    test('renders tutorial locations', async () => {
      renderFooter();
      await waitFor(() => {
        expect(screen.getByText('London')).toBeInTheDocument();
        expect(screen.getByText('Manchester')).toBeInTheDocument();
      });
    });

    test('renders tutorial formats', async () => {
      renderFooter();
      await waitFor(() => {
        expect(screen.getByText('Online')).toBeInTheDocument();
        expect(screen.getByText('Classroom')).toBeInTheDocument();
        expect(screen.getByText('Distance Learning')).toBeInTheDocument();
      });
    });
  });

  describe('Support Section', () => {
    test('renders support links', () => {
      renderFooter();
      expect(screen.getByText('FAQ')).toBeInTheDocument();
      expect(screen.getByText('Student Brochure 2026 Exam')).toBeInTheDocument();
      expect(screen.getByText('Materials Application Form')).toBeInTheDocument();
      expect(screen.getByText('Tutorial Application Form')).toBeInTheDocument();
    });
  });

  describe('Social Media Section', () => {
    test('renders social media icons with correct aria-labels', () => {
      renderFooter();
      expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
      expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
      expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument();
      expect(screen.getByLabelText('YouTube')).toBeInTheDocument();
      expect(screen.getByLabelText('Comments')).toBeInTheDocument();
    });

    test('social media links have correct href attributes', () => {
      renderFooter();
      expect(screen.getByLabelText('Facebook')).toHaveAttribute(
        'href',
        'https://www.facebook.com/bppacted'
      );
      expect(screen.getByLabelText('Twitter')).toHaveAttribute(
        'href',
        'https://twitter.com/bppacted'
      );
      expect(screen.getByLabelText('LinkedIn')).toHaveAttribute(
        'href',
        'https://www.linkedin.com/company/bpp-actuarial-education'
      );
      expect(screen.getByLabelText('YouTube')).toHaveAttribute(
        'href',
        'https://www.youtube.com/bppacted'
      );
    });

    test('social media links open in new tab', () => {
      renderFooter();
      expect(screen.getByLabelText('Facebook')).toHaveAttribute('target', '_blank');
      expect(screen.getByLabelText('Facebook')).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Copyright Section', () => {
    test('renders copyright text', () => {
      renderFooter();
      expect(screen.getByText(/BPP Actuarial Education/)).toBeInTheDocument();
      expect(screen.getByText(/BPP Professional Education Group/)).toBeInTheDocument();
    });

    test('renders email link', () => {
      renderFooter();
      const emailLink = screen.getByText('acted@bpp.com');
      expect(emailLink).toBeInTheDocument();
      expect(emailLink).toHaveAttribute('href', 'mailto:acted@bpp.com');
    });
  });

  describe('Bottom Links Section', () => {
    test('renders policy links', () => {
      renderFooter();
      expect(screen.getByText('General Terms of Use')).toBeInTheDocument();
      expect(screen.getByText('Cookie Use')).toBeInTheDocument();
      expect(screen.getByText('Complaints')).toBeInTheDocument();
    });

    test('renders pipe separators between links', () => {
      renderFooter();
      // Check for pipe separators (there should be 2 for 3 links)
      const pipes = screen.getAllByText('|');
      expect(pipes.length).toBe(2);
    });
  });

  describe('Click Handlers and Navigation', () => {
    test('subject links dispatch Redux action on click', async () => {
      const store = createMockStore();
      renderFooter(store);

      await waitFor(() => {
        expect(screen.getByText(/CB1/)).toBeInTheDocument();
      });

      // Subject text is split across elements, find link by role
      const cb1Link = screen.getByRole('link', { name: /CB1.*Business Finance/i });
      fireEvent.click(cb1Link);

      // Verify Redux action was dispatched by checking store state
      const state = store.getState();
      expect(state.filters.subjects).toContain('CB1');
    });

    test('product links dispatch Redux action on click', async () => {
      const store = createMockStore();
      renderFooter(store);

      await waitFor(() => {
        expect(screen.getByText('Course Notes')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Course Notes'));

      // Verify Redux action was dispatched by checking store state
      const state = store.getState();
      expect(state.filters.products).toContain(101);
    });

    test('tutorial format links dispatch Redux action on click', async () => {
      const store = createMockStore();
      renderFooter(store);

      await waitFor(() => {
        expect(screen.getByText('Online')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Online'));

      // Verify Redux action was dispatched by checking store state
      const state = store.getState();
      expect(state.filters.product_types).toContain('Online');
    });
  });

  describe('Link Navigation', () => {
    test('subject links have correct href', async () => {
      renderFooter();
      await waitFor(() => {
        // Subject text is split across elements, find link by href pattern
        const cb1Link = screen.getByRole('link', { name: /CB1.*Business Finance/i });
        expect(cb1Link).toHaveAttribute('href', '/products?subject_code=CB1');
      });
    });

    test('support links have correct href', () => {
      renderFooter();
      const faqLink = screen.getByText('FAQ');
      expect(faqLink).toHaveAttribute('href', '/faq');
    });

    test('policy links have correct href', () => {
      renderFooter();
      expect(screen.getByText('General Terms of Use')).toHaveAttribute('href', '/terms-of-use');
      expect(screen.getByText('Cookie Use')).toHaveAttribute('href', '/cookie-policy');
      expect(screen.getByText('Complaints')).toHaveAttribute('href', '/complaints');
    });
  });

  describe('Accessibility', () => {
    test('footer has correct semantic role', () => {
      renderFooter();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    test('all social media icons have aria-labels', () => {
      renderFooter();
      const socialIcons = ['Facebook', 'Twitter', 'LinkedIn', 'YouTube', 'Comments'];
      socialIcons.forEach((label) => {
        expect(screen.getByLabelText(label)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles API error gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      productService.getNavigationData.mockRejectedValue(new Error('API Error'));

      renderFooter();

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Error fetching footer navigation data:',
          expect.any(Error)
        );
      });

      // Footer should still render without data
      expect(screen.getByText('Subjects')).toBeInTheDocument();

      consoleError.mockRestore();
    });
  });
});
