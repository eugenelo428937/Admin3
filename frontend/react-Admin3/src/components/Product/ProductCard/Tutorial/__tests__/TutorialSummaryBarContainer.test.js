// Mock httpService before importing anything else
jest.mock('../../../../../services/httpService', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

// Mock CartContext
const mockCartState = {
  addToCart: jest.fn(),
};

jest.mock('../../../../../contexts/CartContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    useCart: () => ({
      addToCart: mockCartState.addToCart,
      cartItems: [],
      loading: false,
    }),
    CartProvider: ({ children }) => React.createElement('div', null, children),
  };
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TutorialChoiceProvider } from '../../../../../contexts/TutorialChoiceContext';
import { CartProvider } from '../../../../../contexts/CartContext';
import TutorialSummaryBarContainer from '../TutorialSummaryBarContainer';

/**
 * Test Suite: TutorialSummaryBarContainer
 * Purpose: Verify global summary bar container behavior
 * Architecture: Context-driven, renders at App level
 */
describe('TutorialSummaryBarContainer', () => {
  /**
   * T003: RED Phase Test
   * Verify component renders nothing when no tutorial choices exist
   */
  describe('Rendering behavior', () => {
    it('should render nothing when tutorialChoices is empty', () => {
      const { container } = render(
        <CartProvider>
          <TutorialChoiceProvider>
            <TutorialSummaryBarContainer />
          </TutorialChoiceProvider>
        </CartProvider>
      );

      // Component should return null when no choices exist
      // CartProvider wraps with div, so check that div is empty
      expect(container.firstChild).toBeEmptyDOMElement();
    });

    /**
     * T004: RED Phase Test
     * Verify component renders TutorialSelectionSummaryBar for each subject with choices
     */
    it('should render TutorialSelectionSummaryBar for each subject with choices', () => {
      // Mock context with choices for 2 subjects
      const mockChoices = {
        'CS2': {
          '1st': {
            eventId: 'evt-cs2-bri-001',
            eventCode: 'TUT-CS2-BRI-001',
            location: 'Bristol',
            choiceLevel: '1st',
            isDraft: true,
            productId: 456,
            productName: 'CS2 - Actuarial Modelling',
            subjectName: 'CS2',
            variation: { id: 123, prices: [{ price_type: 'standard', amount: 95.00 }] }
          }
        },
        'CP1': {
          '1st': {
            eventId: 'evt-cp1-man-001',
            eventCode: 'TUT-CP1-MAN-001',
            location: 'Manchester',
            choiceLevel: '1st',
            isDraft: true,
            productId: 457,
            productName: 'CP1 - Actuarial Practice',
            subjectName: 'CP1',
            variation: { id: 124, prices: [{ price_type: 'standard', amount: 95.00 }] }
          }
        }
      };

      // Create a wrapper that provides the mock context
      const TestWrapper = ({ children }) => (
        <CartProvider>
          <TutorialChoiceProvider initialChoices={mockChoices}>
            {children}
          </TutorialChoiceProvider>
        </CartProvider>
      );

      const { getAllByRole } = render(
        <TutorialSummaryBarContainer />,
        { wrapper: TestWrapper }
      );

      // Should render 2 summary bars (one per subject)
      const summaryBars = getAllByRole('alert'); // Paper components with role="alert"
      expect(summaryBars).toHaveLength(2);
    });
  });

  /**
   * T005: RED Phase Test
   * Verify handleAddToCart calls addToCart and markChoicesAsAdded
   */
  describe('Handler: Add to Cart', () => {
    it('should call addToCart and markChoicesAsAdded when Add to Cart clicked', async () => {
      const user = userEvent.setup();
      mockCartState.addToCart.mockResolvedValue({});
      const mockMarkChoicesAsAdded = jest.fn();
      const mockGetDraftChoices = jest.fn((code) => {
        const choices = mockChoices[code] || {};
        return Object.values(choices).filter(c => c.isDraft);
      });

      const mockChoices = {
        'CS2': {
          '1st': {
            eventId: 'evt-cs2-bri-001',
            eventCode: 'TUT-CS2-BRI-001',
            location: 'Bristol',
            choiceLevel: '1st',
            isDraft: true,
            productId: 456,
            productName: 'CS2 - Actuarial Modelling',
            subjectName: 'CS2',
            variation: { id: 123, prices: [{ price_type: 'standard', amount: 95.00 }] }
          }
        }
      };

      // Mock TutorialChoiceContext
      jest.spyOn(require('../../../../../contexts/TutorialChoiceContext'), 'useTutorialChoice')
        .mockReturnValue({
          tutorialChoices: mockChoices,
          getSubjectChoices: jest.fn((code) => mockChoices[code] || {}),
          getDraftChoices: mockGetDraftChoices,
          hasCartedChoices: jest.fn(() => false),
          markChoicesAsAdded: mockMarkChoicesAsAdded,
          removeTutorialChoice: jest.fn(),
          openEditDialog: jest.fn()
        });

      render(<TutorialSummaryBarContainer />);

      // Find and click Add to Cart button
      const addButton = screen.getByRole('button', { name: /add.*cart/i });
      await user.click(addButton);

      // Verify addToCart was called with correct payload
      await waitFor(() => {
        expect(mockCartState.addToCart).toHaveBeenCalledWith(
          expect.objectContaining({ product_id: 456 }),
          expect.any(Object)
        );
      });

      // Verify choices marked as added
      expect(mockMarkChoicesAsAdded).toHaveBeenCalledWith('CS2');
    });
  });

  /**
   * T006: RED Phase Test
   * Verify handleEdit calls openEditDialog with subject code
   */
  describe('Handler: Edit', () => {
    it('should call openEditDialog with subject code when Edit clicked', async () => {
      const user = userEvent.setup();
      const mockOpenEditDialog = jest.fn();

      const mockChoices = {
        'CS2': {
          '1st': {
            eventId: 'evt-cs2-bri-001',
            isDraft: true,
            productId: 456,
            productName: 'CS2 - Actuarial Modelling',
            subjectName: 'CS2',
            choiceLevel: '1st',
            location: 'Bristol',
            eventCode: 'TUT-CS2-BRI-001',
            variation: { id: 123, prices: [{ price_type: 'standard', amount: 95.00 }] }
          }
        }
      };

      const mockGetDraftChoices = jest.fn((code) => {
        const choices = mockChoices[code] || {};
        return Object.values(choices).filter(c => c.isDraft);
      });

      jest.spyOn(require('../../../../../contexts/TutorialChoiceContext'), 'useTutorialChoice')
        .mockReturnValue({
          tutorialChoices: mockChoices,
          getSubjectChoices: jest.fn((code) => mockChoices[code] || {}),
          getDraftChoices: mockGetDraftChoices,
          hasCartedChoices: jest.fn(() => false),
          openEditDialog: mockOpenEditDialog,
          markChoicesAsAdded: jest.fn(),
          removeTutorialChoice: jest.fn()
        });

      render(<TutorialSummaryBarContainer />);

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      expect(mockOpenEditDialog).toHaveBeenCalledWith('CS2');
    });
  });

  /**
   * T007: RED Phase Test
   * Verify handleRemove removes all draft choices for subject
   */
  describe('Handler: Remove', () => {
    it('should remove all draft choices when Remove clicked', async () => {
      const user = userEvent.setup();
      const mockRemoveTutorialChoice = jest.fn();

      const mockChoices = {
        'CS2': {
          '1st': {
            eventId: 'evt-cs2-bri-001',
            isDraft: true,
            productId: 456,
            productName: 'CS2',
            subjectName: 'CS2',
            choiceLevel: '1st',
            location: 'Bristol',
            eventCode: 'TUT-CS2-BRI-001',
            variation: { id: 123, prices: [{ price_type: 'standard', amount: 95.00 }] }
          },
          '2nd': {
            eventId: 'evt-cs2-lon-002',
            isDraft: true,
            productId: 456,
            productName: 'CS2',
            subjectName: 'CS2',
            choiceLevel: '2nd',
            location: 'London',
            eventCode: 'TUT-CS2-LON-002',
            variation: { id: 123, prices: [{ price_type: 'standard', amount: 95.00 }] }
          }
        }
      };

      const mockGetDraftChoices = jest.fn((code) => {
        const choices = mockChoices[code] || {};
        return Object.values(choices).filter(c => c.isDraft);
      });

      jest.spyOn(require('../../../../../contexts/TutorialChoiceContext'), 'useTutorialChoice')
        .mockReturnValue({
          tutorialChoices: mockChoices,
          getSubjectChoices: jest.fn((code) => mockChoices[code] || {}),
          getDraftChoices: mockGetDraftChoices,
          hasCartedChoices: jest.fn(() => false),
          removeTutorialChoice: mockRemoveTutorialChoice,
          markChoicesAsAdded: jest.fn(),
          openEditDialog: jest.fn()
        });

      render(<TutorialSummaryBarContainer />);

      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      // Should remove both 1st and 2nd choices
      expect(mockRemoveTutorialChoice).toHaveBeenCalledTimes(2);
      expect(mockRemoveTutorialChoice).toHaveBeenCalledWith('CS2', '1st');
      expect(mockRemoveTutorialChoice).toHaveBeenCalledWith('CS2', '2nd');
    });
  });
});
