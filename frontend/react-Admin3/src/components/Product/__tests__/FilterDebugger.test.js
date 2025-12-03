// src/components/Product/__tests__/FilterDebugger.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import FilterDebugger from '../FilterDebugger';

const theme = createTheme();

const renderComponent = (props = {}) => {
  const defaultProps = {
    urlFilters: {},
    panelFilters: {},
    navbarFilters: {},
    finalParams: '',
  };

  return render(
    <ThemeProvider theme={theme}>
      <FilterDebugger {...defaultProps} {...props} />
    </ThemeProvider>
  );
};

describe('FilterDebugger', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Set to development mode for tests
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('in development mode', () => {
    test('renders debug header', () => {
      renderComponent();
      expect(screen.getByText(/filter debug/i)).toBeInTheDocument();
    });

    test('renders URL Filters section', () => {
      renderComponent();
      expect(screen.getByText('URL Filters:')).toBeInTheDocument();
    });

    test('renders Panel Filters section', () => {
      renderComponent();
      expect(screen.getByText('Panel Filters:')).toBeInTheDocument();
    });

    test('renders Navbar Filters section', () => {
      renderComponent();
      expect(screen.getByText('Navbar Filters:')).toBeInTheDocument();
    });

    test('renders Final API Params section', () => {
      renderComponent();
      expect(screen.getByText('Final API Params:')).toBeInTheDocument();
    });
  });

  describe('URL Filters display', () => {
    test('displays URL filter chips', () => {
      renderComponent({
        urlFilters: {
          subject: 'CM2',
          category: 'Bundle',
        },
      });

      expect(screen.getByText('subject: CM2')).toBeInTheDocument();
      expect(screen.getByText('category: Bundle')).toBeInTheDocument();
    });

    test('does not display empty URL filter values', () => {
      renderComponent({
        urlFilters: {
          subject: 'CM2',
          empty: '',
          nullValue: null,
        },
      });

      expect(screen.getByText('subject: CM2')).toBeInTheDocument();
      expect(screen.queryByText(/empty:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/nullValue:/)).not.toBeInTheDocument();
    });
  });

  describe('Panel Filters display', () => {
    test('displays panel filter chips with arrays', () => {
      renderComponent({
        panelFilters: {
          subjects: ['CM2', 'SA1'],
          categories: ['Bundle'],
        },
      });

      expect(screen.getByText('subjects: [CM2, SA1]')).toBeInTheDocument();
      expect(screen.getByText('categories: [Bundle]')).toBeInTheDocument();
    });

    test('does not display empty panel filter arrays', () => {
      renderComponent({
        panelFilters: {
          subjects: ['CM2'],
          emptyArray: [],
        },
      });

      expect(screen.getByText('subjects: [CM2]')).toBeInTheDocument();
      expect(screen.queryByText(/emptyArray:/)).not.toBeInTheDocument();
    });
  });

  describe('Navbar Filters display', () => {
    test('displays navbar filter chips', () => {
      renderComponent({
        navbarFilters: {
          selectedSubject: 'CM2',
          producttype: 'Study Material',
        },
      });

      expect(screen.getByText('selectedSubject: CM2')).toBeInTheDocument();
      expect(screen.getByText('producttype: Study Material')).toBeInTheDocument();
    });
  });

  describe('Final Params display', () => {
    test('displays final API params string', () => {
      renderComponent({
        finalParams: 'subject=CM2&category=Bundle',
      });

      expect(screen.getByText('subject=CM2&category=Bundle')).toBeInTheDocument();
    });

    test('displays "No params" when finalParams is empty', () => {
      renderComponent({
        finalParams: '',
      });

      expect(screen.getByText('No params')).toBeInTheDocument();
    });

    test('displays "No params" when finalParams is null', () => {
      renderComponent({
        finalParams: null,
      });

      expect(screen.getByText('No params')).toBeInTheDocument();
    });
  });

  describe('in production mode', () => {
    test('renders nothing in production', () => {
      process.env.NODE_ENV = 'production';

      const { container } = renderComponent();

      // Should render nothing
      expect(container.firstChild).toBeNull();
    });
  });
});
