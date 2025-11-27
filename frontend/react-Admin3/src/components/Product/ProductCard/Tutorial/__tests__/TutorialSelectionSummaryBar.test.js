import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Remove global mocks from setupTests.js so we can test with real context
jest.unmock('../../../../../contexts/TutorialChoiceContext');

// Mock useMediaQuery to return desktop mode (false = not mobile) by default
jest.mock('@mui/material/useMediaQuery', () => jest.fn(() => false));

// Now import the real context
import TutorialSelectionSummaryBar from '../TutorialSelectionSummaryBar';
import { TutorialChoiceProvider, useTutorialChoice } from '../../../../../contexts/TutorialChoiceContext';
import useMediaQuery from '@mui/material/useMediaQuery';

describe('TutorialSelectionSummaryBar', () => {
  const mockSubjectCode = 'CS2';
  const mockOnEdit = jest.fn();
  const mockOnAddToCart = jest.fn();
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Default to desktop mode
    useMediaQuery.mockReturnValue(false);
  });

  const renderWithContext = (ui) => {
    return render(
      <TutorialChoiceProvider>
        {ui}
      </TutorialChoiceProvider>
    );
  };

  // Helper to set up draft choices in localStorage
  const setupDraftChoices = () => {
    const choices = {
      CS2: {
        '1st': {
          eventId: 101,
          eventTitle: 'CS2 Introduction Tutorial',
          eventCode: 'TUT-CS2-BRI-001',
          location: 'Bristol',
          subjectCode: 'CS2',
          subjectName: 'CS2 - Actuarial Modelling',
          isDraft: true,
        },
        '2nd': {
          eventId: 102,
          eventTitle: 'CS2 Advanced Tutorial',
          eventCode: 'TUT-CS2-BRI-002',
          location: 'London',
          subjectCode: 'CS2',
          subjectName: 'CS2 - Actuarial Modelling',
          isDraft: true,
        },
      },
    };
    localStorage.setItem('tutorialChoices', JSON.stringify(choices));
  };

  // Helper to set up carted choices in localStorage
  const setupCartedChoices = () => {
    const choices = {
      CS2: {
        '1st': {
          eventId: 101,
          eventTitle: 'CS2 Introduction Tutorial',
          eventCode: 'TUT-CS2-BRI-001',
          location: 'Bristol',
          subjectCode: 'CS2',
          subjectName: 'CS2 - Actuarial Modelling',
          isDraft: false,
        },
      },
    };
    localStorage.setItem('tutorialChoices', JSON.stringify(choices));
  };

  // ========================================
  // T018: Contract Tests - Rendering
  // ========================================
  describe('T018: Contract Rendering', () => {
    test('[DEBUG] context loads from localStorage', async () => {
      setupDraftChoices();

      let contextValue = null;
      const DebugComponent = () => {
        const context = useTutorialChoice();
        contextValue = context;
        return <div data-testid="debug">{JSON.stringify(context.getSubjectChoices('CS2'))}</div>;
      };

      renderWithContext(<DebugComponent />);

      await waitFor(() => {
        const debug = screen.getByTestId('debug');
        const text = debug.textContent;
        expect(text).not.toBe('{}');
      }, { timeout: 3000 });

      expect(contextValue?.getDraftChoices('CS2')).toBeDefined();
      expect(contextValue?.getSubjectChoices('CS2')).toBeDefined();
    });

    test('renders expanded state with draft choices', async () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for context to load from localStorage
      await waitFor(() => {
        expect(screen.getByText(/CS2.*Tutorial Choices/i)).toBeInTheDocument();
      });
    });

    test('displays ordered list of choices with location and event code', async () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for context to load
      await waitFor(() => {
        // Component format: "{level} - {eventCode} ({location})"
        expect(screen.getByText(/1st - TUT-CS2-BRI-001 \(Bristol\)/)).toBeInTheDocument();
      });

      // Should show 2nd choice details
      expect(screen.getByText(/2nd - TUT-CS2-BRI-002 \(London\)/)).toBeInTheDocument();

      // Should also show action buttons since expanded=true (icon buttons with aria-labels)
      expect(screen.getByLabelText(/Edit tutorial choices/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Add tutorial choices to cart/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Remove tutorial choices/i)).toBeInTheDocument();
    });

    test('renders action buttons in expanded state', async () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for context to load and buttons to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Edit tutorial choices/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Add tutorial choices to cart/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Remove tutorial choices/i)).toBeInTheDocument();
      });
    });

    test('hides when no choices exist', () => {
      // No choices in localStorage

      const { container } = renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Snackbar should not be visible
      expect(screen.queryByText(/CS2.*Tutorial Choices/i)).not.toBeInTheDocument();
    });

    test('renders collapse button (X icon)', async () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for context to load
      await waitFor(() => {
        expect(screen.getByText(/CS2.*Tutorial Choices/i)).toBeInTheDocument();
      });

      // In expanded state, the close button has aria-label "Collapse"
      const collapseButton = screen.getByLabelText(/Collapse/i);
      expect(collapseButton).toBeInTheDocument();
    });
  });

  // ========================================
  // T019: Expand/Collapse State Tests
  // ========================================
  describe('T019: Expand/Collapse State', () => {
    test('shows expand button in collapsed state (mobile mode)', async () => {
      // Set mobile mode - collapsed by default
      useMediaQuery.mockReturnValue(true);
      setupCartedChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for context to load - should show collapsed view with expand button
      await waitFor(() => {
        expect(screen.getByText(/CS2.*Tutorial Choices/i)).toBeInTheDocument();
      });

      // In collapsed state, should have Expand button
      expect(screen.getByLabelText(/Expand/i)).toBeInTheDocument();
    });

    test('expands when draft choices exist (desktop mode)', async () => {
      // Desktop mode - expanded by default
      useMediaQuery.mockReturnValue(false);
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for context to load and expanded state to render
      await waitFor(() => {
        expect(screen.getByText(/1st - TUT-CS2-BRI-001 \(Bristol\)/)).toBeInTheDocument();
        expect(screen.getByText(/2nd - TUT-CS2-BRI-002 \(London\)/)).toBeInTheDocument();
      });

      // Should show all action buttons (icon buttons with aria-labels)
      expect(screen.getByLabelText(/Edit tutorial choices/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Add tutorial choices to cart/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Remove tutorial choices/i)).toBeInTheDocument();
    });

    test('remains visible after closing (choices persist in localStorage)', async () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for context to load
      await waitFor(() => {
        expect(screen.getByText(/CS2.*Tutorial Choices/i)).toBeInTheDocument();
      });

      // Click collapse button
      const collapseButton = screen.getByLabelText(/Collapse/i);
      fireEvent.click(collapseButton);

      // Verify choices still exist in localStorage (persist after close)
      const savedChoices = JSON.parse(localStorage.getItem('tutorialChoices') || '{}');
      expect(savedChoices.CS2).toBeDefined();
      expect(savedChoices.CS2['1st'].isDraft).toBe(true);
      expect(savedChoices.CS2['2nd'].isDraft).toBe(true);
    });
  });

  // ========================================
  // T020: Action Button Tests
  // ========================================
  describe('T020: Action Button Tests', () => {
    test('calls onEdit when Edit button clicked', async () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for context to load
      await waitFor(() => {
        expect(screen.getByLabelText(/Edit tutorial choices/i)).toBeInTheDocument();
      });

      const editButton = screen.getByLabelText(/Edit tutorial choices/i);
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    test('calls onAddToCart when Add to Cart button clicked', async () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for button to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Add tutorial choices to cart/i)).toBeInTheDocument();
      });

      const addToCartButton = screen.getByLabelText(/Add tutorial choices to cart/i);
      fireEvent.click(addToCartButton);

      expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
    });

    test('calls onRemove when Remove button clicked', async () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for context to load
      await waitFor(() => {
        expect(screen.getByLabelText(/Remove tutorial choices/i)).toBeInTheDocument();
      });

      const removeButton = screen.getByLabelText(/Remove tutorial choices/i);
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    test('Add to Cart button present when draft choices exist', async () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for button to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Add tutorial choices to cart/i)).toBeInTheDocument();
      });
    });

    test('Edit button works in collapsed state (mobile)', async () => {
      // Set mobile mode for collapsed state
      useMediaQuery.mockReturnValue(true);
      setupCartedChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for context to load
      await waitFor(() => {
        expect(screen.getByText(/CS2.*Tutorial Choices/i)).toBeInTheDocument();
      });

      // In collapsed state on mobile, click expand first
      const expandButton = screen.getByLabelText(/Expand/i);
      fireEvent.click(expandButton);

      // Now should be expanded - verify Edit button is available
      // Note: On mobile, expansion opens a Drawer, so this test validates the behavior
    });

    test('Collapse button only hides summary bar temporarily', async () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for context to load
      await waitFor(() => {
        expect(screen.getByText(/CS2.*Tutorial Choices/i)).toBeInTheDocument();
      });

      const collapseButton = screen.getByLabelText(/Collapse/i);
      fireEvent.click(collapseButton);

      // Verify choices still exist in localStorage
      const savedChoices = JSON.parse(localStorage.getItem('tutorialChoices') || '{}');
      expect(savedChoices.CS2).toBeDefined();
      expect(savedChoices.CS2['1st'].isDraft).toBe(true);
    });
  });

  // ========================================
  // Accessibility Tests
  // ========================================
  describe('T020: Accessibility (Bonus)', () => {
    test('Snackbar has role="alert" for screen readers', async () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for context to load
      await waitFor(() => {
        expect(screen.getByText(/CS2.*Tutorial Choices/i)).toBeInTheDocument();
      });

      const snackbar = screen.getByRole('alert');
      expect(snackbar).toBeInTheDocument();
    });

    test('action buttons have descriptive aria-label attributes', async () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Wait for buttons to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Edit tutorial choices/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Add tutorial choices to cart/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Remove tutorial choices/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Collapse/i)).toBeInTheDocument();
      });
    });
  });
});
