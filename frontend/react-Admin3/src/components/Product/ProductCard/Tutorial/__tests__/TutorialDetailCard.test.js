import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TutorialDetailCard from '../TutorialDetailCard';

describe('TutorialDetailCard', () => {
  const mockEvent = {
    eventId: 1,
    eventTitle: 'CS2 Introduction Tutorial',
    eventCode: 'TUT-CS2-BRI-001',
    location: 'Bristol',
    venue: 'Room 101, Main Building',
    startDate: '2025-11-01T09:00:00Z',
    endDate: '2025-11-01T17:00:00Z',
  };

  const mockVariation = {
    variationId: 10,
    variationName: 'Standard Tutorial',
    prices: [{ price_type: 'Standard', amount: 49.99 }],
  };

  const mockOnSelectChoice = jest.fn();
  const subjectCode = 'CS2';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // T001: Contract Tests - Rendering
  // ========================================
  describe('T001: Contract Rendering', () => {
    test('renders event title correctly', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      expect(screen.getByText('CS2 Introduction Tutorial')).toBeInTheDocument();
    });

    test('renders event code correctly', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      expect(screen.getByText(/TUT-CS2-BRI-001/i)).toBeInTheDocument();
    });

    test('renders location correctly', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      expect(screen.getByText(/Bristol/i)).toBeInTheDocument();
    });

    test('renders venue correctly', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      expect(screen.getByText(/Room 101, Main Building/i)).toBeInTheDocument();
    });

    test('renders start and end dates correctly', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      // Dates should be formatted and displayed - check for both start and end dates
      expect(screen.getByText(/Start:/i)).toBeInTheDocument();
      expect(screen.getByText(/End:/i)).toBeInTheDocument();
      expect(screen.getByText(/Nov 01, 2025 09:00/i)).toBeInTheDocument();
      expect(screen.getByText(/Nov 01, 2025 17:00/i)).toBeInTheDocument();
    });

    test('renders three choice buttons with correct labels', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      expect(screen.getByRole('button', { name: /1st/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /2nd/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /3rd/i })).toBeInTheDocument();
    });

    test('handles null selectedChoiceLevel - all buttons outlined', () => {
      const { container } = render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      const firstButton = screen.getByRole('button', { name: /1st/i });
      const secondButton = screen.getByRole('button', { name: /2nd/i });
      const thirdButton = screen.getByRole('button', { name: /3rd/i });

      // All buttons should have MuiButton-outlined class
      expect(firstButton.className).toContain('MuiButton-outlined');
      expect(secondButton.className).toContain('MuiButton-outlined');
      expect(thirdButton.className).toContain('MuiButton-outlined');
    });
  });

  // ========================================
  // T002: Choice Selection Feedback Tests
  // ========================================
  describe('T002: Choice Selection Feedback', () => {
    test('applies "outlined" variant to unselected buttons', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel="1st"
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      const secondButton = screen.getByRole('button', { name: /2nd/i });
      const thirdButton = screen.getByRole('button', { name: /3rd/i });

      expect(secondButton.className).toContain('MuiButton-outlined');
      expect(thirdButton.className).toContain('MuiButton-outlined');
    });

    test('applies "contained" variant to selected button (1st choice)', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel="1st"
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      const firstButton = screen.getByRole('button', { name: /1st/i });
      expect(firstButton.className).toContain('MuiButton-contained');
    });

    test('applies "contained" variant to selected button (2nd choice)', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel="2nd"
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      const secondButton = screen.getByRole('button', { name: /2nd/i });
      expect(secondButton.className).toContain('MuiButton-contained');
    });

    test('applies "contained" variant to selected button (3rd choice)', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel="3rd"
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      const thirdButton = screen.getByRole('button', { name: /3rd/i });
      expect(thirdButton.className).toContain('MuiButton-contained');
    });

    test('calls onSelectChoice with correct parameters when 1st choice clicked', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      const firstButton = screen.getByRole('button', { name: /1st/i });
      fireEvent.click(firstButton);

      expect(mockOnSelectChoice).toHaveBeenCalledTimes(1);
      expect(mockOnSelectChoice).toHaveBeenCalledWith('1st', expect.objectContaining({
        eventId: 1,
        eventTitle: 'CS2 Introduction Tutorial',
        eventCode: 'TUT-CS2-BRI-001',
        location: 'Bristol',
        venue: 'Room 101, Main Building',
      }));
    });

    test('calls onSelectChoice with correct parameters when 2nd choice clicked', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      const secondButton = screen.getByRole('button', { name: /2nd/i });
      fireEvent.click(secondButton);

      expect(mockOnSelectChoice).toHaveBeenCalledTimes(1);
      expect(mockOnSelectChoice).toHaveBeenCalledWith('2nd', expect.objectContaining({
        eventId: 1,
        eventTitle: 'CS2 Introduction Tutorial',
      }));
    });

    test('calls onSelectChoice with correct parameters when 3rd choice clicked', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      const thirdButton = screen.getByRole('button', { name: /3rd/i });
      fireEvent.click(thirdButton);

      expect(mockOnSelectChoice).toHaveBeenCalledTimes(1);
      expect(mockOnSelectChoice).toHaveBeenCalledWith('3rd', expect.objectContaining({
        eventId: 1,
        eventTitle: 'CS2 Introduction Tutorial',
      }));
    });

    test('eventData includes variation data when passed to onSelectChoice', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      const firstButton = screen.getByRole('button', { name: /1st/i });
      fireEvent.click(firstButton);

      expect(mockOnSelectChoice).toHaveBeenCalledWith('1st', expect.objectContaining({
        variationId: 10,
        variationName: 'Standard Tutorial',
      }));
    });
  });

  // ========================================
  // T003: Accessibility Tests
  // ========================================
  describe('T003: Accessibility', () => {
    test('choice buttons have aria-pressed attribute based on selection state', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel="1st"
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      const firstButton = screen.getByRole('button', { name: /1st/i });
      const secondButton = screen.getByRole('button', { name: /2nd/i });
      const thirdButton = screen.getByRole('button', { name: /3rd/i });

      expect(firstButton).toHaveAttribute('aria-pressed', 'true');
      expect(secondButton).toHaveAttribute('aria-pressed', 'false');
      expect(thirdButton).toHaveAttribute('aria-pressed', 'false');
    });

    test('event title uses h3 semantic heading', () => {
      const { container } = render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      const heading = container.querySelector('h3');
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('CS2 Introduction Tutorial');
    });

    test('card maintains semantic HTML structure with section elements', () => {
      const { container } = render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      // Verify semantic structure exists
      const sections = container.querySelectorAll('section');
      expect(sections.length).toBeGreaterThan(0);
    });

    test('buttons are keyboard accessible', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      const firstButton = screen.getByRole('button', { name: /1st/i });

      // Buttons should not have tabIndex that prevents keyboard access
      expect(firstButton).not.toHaveAttribute('tabindex', '-1');

      // Focus should work
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
    });

    test('all choice buttons are focusable via keyboard navigation', () => {
      render(
        <TutorialDetailCard
          event={mockEvent}
          variation={mockVariation}
          selectedChoiceLevel={null}
          onSelectChoice={mockOnSelectChoice}
          subjectCode={subjectCode}
        />
      );

      const firstButton = screen.getByRole('button', { name: /1st/i });
      const secondButton = screen.getByRole('button', { name: /2nd/i });
      const thirdButton = screen.getByRole('button', { name: /3rd/i });

      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      secondButton.focus();
      expect(document.activeElement).toBe(secondButton);

      thirdButton.focus();
      expect(document.activeElement).toBe(thirdButton);
    });
  });
});
