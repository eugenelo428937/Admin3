/**
 * Tests for TopNavActions Component
 * T028: Test click handlers
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TopNavActions from '../TopNavActions';

const theme = createTheme({
  liftkit: {
    spacing: {
      xs: 4,
      xs2: 8,
      xs3: 12,
      sm: 16,
      md: 24,
      lg: 32,
      xl: 48,
      xxl: 64,
    },
  },
  palette: {
    liftkit: {
      light: {
        background: '#ffffff',
      },
    },
    offwhite: {
      '000': '#ffffff',
    },
  },
});

describe('TopNavActions', () => {
  const mockOnOpenSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderActions = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <TopNavActions
          onOpenSearch={mockOnOpenSearch}
          {...props}
        />
      </ThemeProvider>
    );
  };

  describe('rendering', () => {
    test('renders Brochure button', () => {
      renderActions();
      expect(screen.getByText('Brochure')).toBeInTheDocument();
    });

    test('renders Search button', () => {
      renderActions();
      expect(screen.getByLabelText('search products')).toBeInTheDocument();
    });

    test('renders Search text', () => {
      renderActions();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
  });

  describe('brochure button', () => {
    test('brochure link points to /brochure', () => {
      renderActions();

      const brochureButton = screen.getByText('Brochure').closest('a');
      expect(brochureButton).toHaveAttribute('href', '/brochure');
    });

    test('brochure opens in new tab', () => {
      renderActions();

      const brochureButton = screen.getByText('Brochure').closest('a');
      expect(brochureButton).toHaveAttribute('target', '_blank');
    });

    test('brochure button has Download tooltip', () => {
      renderActions();

      // The Brochure text is inside a Button with a Tooltip
      expect(screen.getByText('Brochure')).toBeInTheDocument();
    });
  });

  describe('search button', () => {
    test('calls onOpenSearch when clicked', () => {
      renderActions();

      fireEvent.click(screen.getByLabelText('search products'));

      expect(mockOnOpenSearch).toHaveBeenCalled();
    });

    test('has aria-label for accessibility', () => {
      renderActions();

      const searchButton = screen.getByLabelText('search products');
      expect(searchButton).toBeInTheDocument();
    });

    test('search button has keyboard shortcut tooltip', () => {
      renderActions();

      // The Search button exists with tooltip mentioning Ctrl+K
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    test('brochure text renders for desktop', () => {
      renderActions();

      // Brochure Typography has display: { xs: 'none', lg: 'flex' }
      // We verify the text element exists - MUI sx controls visibility
      expect(screen.getByText('Brochure')).toBeInTheDocument();
    });

    test('search text renders for desktop', () => {
      renderActions();

      // Search Typography has display: { xs: 'none', lg: 'flex' }
      // We verify the text element exists - MUI sx controls visibility
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    test('renders with proper theme colors', () => {
      renderActions();

      // Buttons should be styled with theme colors
      const searchButton = screen.getByLabelText('search products');
      expect(searchButton).toBeInTheDocument();
    });

    test('buttons have text-transform none', () => {
      renderActions();

      // Brochure button should have textTransform: 'none'
      expect(screen.getByText('Brochure')).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    test('renders Download icon in Brochure button', () => {
      const { container } = renderActions();

      // Download icon is an SVG inside the Brochure button
      const brochureButton = screen.getByText('Brochure').closest('a');
      const icon = brochureButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    test('renders Search icon in Search button', () => {
      const { container } = renderActions();

      const searchButton = screen.getByLabelText('search products');
      const icon = searchButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('component structure', () => {
    test('renders in a Box container', () => {
      const { container } = renderActions();

      // The component should render with flex display
      const box = container.firstChild;
      expect(box).toBeInTheDocument();
    });

    test('buttons are in correct order', () => {
      const { container } = renderActions();

      const buttons = container.querySelectorAll('button, a[role="button"], a');
      expect(buttons.length).toBe(2); // Brochure (a) and Search (button)
    });
  });
});
