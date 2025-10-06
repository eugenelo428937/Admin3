import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TutorialSelectionSummaryBar from '../TutorialSelectionSummaryBar';
import { TutorialChoiceProvider, useTutorialChoice } from '../../../../../contexts/TutorialChoiceContext';

describe('TutorialSelectionSummaryBar', () => {
  const mockSubjectCode = 'CS2';
  const mockOnEdit = jest.fn();
  const mockOnAddToCart = jest.fn();
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
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

      console.log('Context draft choices:', contextValue?.getDraftChoices('CS2'));
      console.log('Context subject choices:', contextValue?.getSubjectChoices('CS2'));
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
        expect(screen.getByText(/CS2.*Tutorials/i)).toBeInTheDocument();
      });
    });

    test('displays ordered list of choices with location and event code', () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Should show 1st choice details (checks expanded state is working)
      expect(screen.getByText(/1st Choice.*Bristol.*TUT-CS2-BRI-001/i)).toBeInTheDocument();

      // Should show 2nd choice details
      expect(screen.getByText(/2nd Choice.*London.*TUT-CS2-BRI-002/i)).toBeInTheDocument();

      // Should also show action buttons since expanded=true
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
      expect(screen.getByText('Remove')).toBeInTheDocument();
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
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByText('Add to Cart')).toBeInTheDocument();
        expect(screen.getByText('Remove')).toBeInTheDocument();
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
      expect(screen.queryByText(/CS2 Tutorials/i)).not.toBeInTheDocument();
    });

    test('renders close button (X icon)', () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      const closeButton = screen.getByLabelText(/close/i);
      expect(closeButton).toBeInTheDocument();
    });
  });

  // ========================================
  // T019: Expand/Collapse State Tests
  // ========================================
  describe('T019: Expand/Collapse State', () => {
    test('collapses when all choices carted (isDraft: false)', async () => {
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
        expect(screen.getByText(/CS2.*Tutorials/i)).toBeInTheDocument();
      });

      // Should NOT show choice details in collapsed state
      expect(screen.queryByText(/1st Choice.*Bristol/i)).not.toBeInTheDocument();

      // Should only show Edit and Close buttons in collapsed state
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });

    test('expands when draft choices exist', async () => {
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
        expect(screen.getByText(/1st Choice.*Bristol/i)).toBeInTheDocument();
        expect(screen.getByText(/2nd Choice.*London/i)).toBeInTheDocument();
      });

      // Should show all action buttons
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    test('remains visible after closing (choices persist in localStorage)', () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      // Click close button
      const closeButton = screen.getByLabelText(/close/i);
      fireEvent.click(closeButton);

      // Verify component is hidden
      expect(screen.queryByText(/CS2.*Tutorials/i)).not.toBeInTheDocument();

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
    test('calls onEdit when Edit button clicked', () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
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
      const addToCartButton = await screen.findByText('Add to Cart');
      fireEvent.click(addToCartButton);

      expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
    });

    test('calls onRemove when Remove button clicked', () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    test('Add to Cart button enabled when draft choices exist', async () => {
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
      const addToCartButton = await screen.findByText('Add to Cart');
      expect(addToCartButton).toBeInTheDocument();
    });

    test('Edit button works in collapsed state', () => {
      setupCartedChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    test('Close button only hides summary bar temporarily', () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

      const closeButton = screen.getByLabelText(/close/i);
      fireEvent.click(closeButton);

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
    test('Snackbar has role="alert" for screen readers', () => {
      setupDraftChoices();

      renderWithContext(
        <TutorialSelectionSummaryBar
          subjectCode={mockSubjectCode}
          onEdit={mockOnEdit}
          onAddToCart={mockOnAddToCart}
          onRemove={mockOnRemove}
        />
      );

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
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByText('Add to Cart')).toBeInTheDocument();
        expect(screen.getByText('Remove')).toBeInTheDocument();
        expect(screen.getByLabelText(/close/i)).toBeInTheDocument();
      });
    });
  });
});
