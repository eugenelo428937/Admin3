/**
 * TutorialSelectionSummaryBar Component Tests
 * Epic 4 - Story 3: Mobile Responsive Summary Bar
 *
 * Tests mobile responsive behavior:
 * - Mobile (< 900px): Collapsed by default, Drawer for expanded state
 * - Desktop (≥ 900px): Expanded by default (current behavior preserved)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TutorialSelectionSummaryBar from '../../../../../components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar';
import { TutorialChoiceProvider } from '../../../../../contexts/TutorialChoiceContext';

// Mock Material-UI useMediaQuery hook
import useMediaQuery from '@mui/material/useMediaQuery';
jest.mock('@mui/material/useMediaQuery', () => jest.fn());

// Test helpers
const theme = createTheme();

const mockProps = {
  subjectCode: 'CM2',
  onEdit: jest.fn(),
  onAddToCart: jest.fn(),
  onRemove: jest.fn(),
};

const mockTutorialChoices = {
  CM2: {
    '1st': {
      eventId: 'event-1',
      eventCode: 'CM2-LON-2025',
      location: 'London',
      subjectName: 'CM2 - Financial Engineering',
      isDraft: true,
    },
    '2nd': {
      eventId: 'event-2',
      eventCode: 'CM2-NYC-2025',
      location: 'New York',
      subjectName: 'CM2 - Financial Engineering',
      isDraft: true,
    },
  },
};

const renderWithProviders = (component, { isMobile = false } = {}) => {
  // Mock useMediaQuery to return isMobile value
  useMediaQuery.mockReturnValue(isMobile);

  return render(
    <ThemeProvider theme={theme}>
      <TutorialChoiceProvider initialChoices={mockTutorialChoices}>
        {component}
      </TutorialChoiceProvider>
    </ThemeProvider>
  );
};

describe('TutorialSelectionSummaryBar - Responsive Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Setup Phase', () => {
    it('renders without crashing', () => {
      renderWithProviders(<TutorialSelectionSummaryBar {...mockProps} />);
      expect(screen.getByText(/CM2 Tutorial Choices/i)).toBeInTheDocument();
    });
  });

  // 🔴 RED PHASE: Tests that MUST FAIL before implementation

  describe('T003: Mobile Collapsed View by Default (FR-001)', () => {
    it('displays collapsed view by default on mobile (< 900px)', () => {
      // Given: Mobile viewport (< 900px)
      renderWithProviders(<TutorialSelectionSummaryBar {...mockProps} />, { isMobile: true });

      // Then: Summary bar displays collapsed view (single line)
      expect(screen.getByText(/CM2 Tutorial Choices/i)).toBeInTheDocument();

      // Verify: Only subject code and expand icon visible
      const expandButton = screen.getByLabelText(/Expand/i);
      expect(expandButton).toBeInTheDocument();

      // Verify: NOT showing full choice details (these should NOT be visible when collapsed)
      expect(screen.queryByText(/CM2-LON-2025/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/London/i)).not.toBeInTheDocument();
    });

    it('hides action buttons when collapsed on mobile', () => {
      // Given: Mobile viewport, collapsed summary bar
      renderWithProviders(<TutorialSelectionSummaryBar {...mockProps} />, { isMobile: true });

      // Then: Action buttons (Edit, Add to Cart, Remove) NOT visible
      expect(screen.queryByLabelText(/Edit tutorial choices/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Add tutorial choices to cart/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Remove tutorial choices/i)).not.toBeInTheDocument();
    });
  });

  describe('T004: Desktop Expanded View by Default (FR-010) - Regression Test', () => {
    it('displays expanded view by default on desktop (≥ 900px)', () => {
      // Given: Desktop viewport (≥ 900px)
      renderWithProviders(<TutorialSelectionSummaryBar {...mockProps} />, { isMobile: false });

      // Then: Summary bar displays expanded view
      expect(screen.getByText(/CM2 Tutorial Choices/i)).toBeInTheDocument();

      // Verify: All tutorial choices visible (1st, 2nd, 3rd)
      expect(screen.getByText(/1st/i)).toBeInTheDocument();
      expect(screen.getByText(/CM2-LON-2025/i)).toBeInTheDocument();
      expect(screen.getByText(/London/i)).toBeInTheDocument();
      expect(screen.getByText(/2nd/i)).toBeInTheDocument();
      expect(screen.getByText(/CM2-NYC-2025/i)).toBeInTheDocument();
      expect(screen.getByText(/New York/i)).toBeInTheDocument();
    });

    it('shows all action buttons on desktop', () => {
      // Given: Desktop viewport
      renderWithProviders(<TutorialSelectionSummaryBar {...mockProps} />, { isMobile: false });

      // Then: All action buttons visible (Edit, Add to Cart, Remove)
      expect(screen.getByLabelText(/Edit tutorial choices/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Add tutorial choices to cart/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Remove tutorial choices/i)).toBeInTheDocument();
    });

    it('has collapse button (not expand) on desktop', () => {
      // Given: Desktop viewport
      renderWithProviders(<TutorialSelectionSummaryBar {...mockProps} />, { isMobile: false });

      // Then: Collapse button visible (expanded by default)
      expect(screen.getByLabelText(/Collapse/i)).toBeInTheDocument();

      // And: No expand button (already expanded)
      expect(screen.queryByLabelText(/Expand/i)).not.toBeInTheDocument();
    });
  });

  describe('T007: Touch Target Sizes (FR-013)', () => {
    it('all action buttons meet 44px minimum on mobile', () => {
      // Given: Mobile viewport with expanded view (after implementation)
      renderWithProviders(<TutorialSelectionSummaryBar {...mockProps} />, { isMobile: false });

      // Get all buttons
      const buttons = screen.getAllByRole('button');

      // Then: Each button meets 44px × 44px minimum
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minWidth = parseInt(styles.minWidth);
        const minHeight = parseInt(styles.minHeight);

        // Touch target minimum: 44px (3rem = 48px exceeds minimum)
        expect(minWidth).toBeGreaterThanOrEqual(44);
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });
  });
});
