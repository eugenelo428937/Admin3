import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CartPanel from '../CartPanel';
import { CartContext } from '../../../contexts/CartContext';
import { TutorialChoiceContext } from '../../../contexts/TutorialChoiceContext';
import { useAuth } from '../../../hooks/useAuth';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
jest.mock('../../../hooks/useAuth');
jest.mock('../../../services/cartService');
jest.mock('../../../utils/productCodeGenerator', () => ({
  generateProductCode: jest.fn(() => 'MOCK-CODE')
}));
jest.mock('../../../utils/vatUtils', () => ({
  formatVatLabel: jest.fn(() => 'VAT')
}));

describe('CartPanel Tutorial Item Removal (T022)', () => {
  let mockCartContext;
  let mockTutorialChoiceContext;

  beforeEach(() => {
    // Mock useAuth
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1 }
    });

    // Setup mock contexts
    mockCartContext = {
      cartItems: [],
      cartData: { fees: [], items: [] },
      clearCart: jest.fn(),
      removeFromCart: jest.fn()
    };

    mockTutorialChoiceContext = {
      removeAllChoices: jest.fn(),
      restoreChoicesToDraft: jest.fn(),
      tutorialChoices: {}
    };

    jest.clearAllMocks();
  });

  const renderCartPanel = (cartItems = []) => {
    mockCartContext.cartItems = cartItems;
    mockCartContext.cartData.items = cartItems;

    return render(
      <BrowserRouter>
        <CartContext.Provider value={mockCartContext}>
          <TutorialChoiceContext.Provider value={mockTutorialChoiceContext}>
            <CartPanel show={true} handleClose={jest.fn()} />
          </TutorialChoiceContext.Provider>
        </CartContext.Provider>
      </BrowserRouter>
    );
  };

  describe('Individual Item Removal', () => {
    it('T022-A: should restore tutorial choices to draft when removing item with subject_code field', () => {
      const cartItems = [{
        id: 999,
        product: 123,
        subject_code: 'CS2',
        product_type: 'tutorial',
        quantity: 1,
        metadata: {
          type: 'tutorial',
          subjectCode: 'CS2',
          totalChoiceCount: 2
        }
      }];

      renderCartPanel(cartItems);

      // Find and click remove button
      const removeButton = screen.getAllByTitle(/remove from cart/i)[0];
      fireEvent.click(removeButton);

      // Verify restoreChoicesToDraft was called with correct subject code
      expect(mockTutorialChoiceContext.restoreChoicesToDraft).toHaveBeenCalledWith('CS2');
      expect(mockCartContext.removeFromCart).toHaveBeenCalledWith(123);
    });

    it('T022-B: should restore tutorial choices when item only has metadata.subjectCode', () => {
      const cartItems = [{
        id: 999,
        product: 456,
        product_type: 'tutorial',
        quantity: 1,
        metadata: {
          type: 'tutorial',
          subjectCode: 'CP1',
          totalChoiceCount: 1
        }
        // Note: No subject_code field at top level
      }];

      renderCartPanel(cartItems);

      // Find and click remove button
      const removeButton = screen.getAllByTitle(/remove from cart/i)[0];
      fireEvent.click(removeButton);

      // THIS TEST SHOULD FAIL until we fix the code
      // The bug is that restoreChoicesToDraft won't be called because subject_code field is missing
      expect(mockTutorialChoiceContext.restoreChoicesToDraft).toHaveBeenCalledWith('CP1');
      expect(mockCartContext.removeFromCart).toHaveBeenCalledWith(456);
    });

    it('T022-C: should not call restoreChoicesToDraft for non-tutorial items', () => {
      const cartItems = [{
        id: 888,
        product: 789,
        product_type: 'material',
        quantity: 1,
        metadata: {
          type: 'material'
        }
      }];

      renderCartPanel(cartItems);

      // Find and click remove button
      const removeButton = screen.getAllByTitle(/remove from cart/i)[0];
      fireEvent.click(removeButton);

      // Should NOT call restoreChoicesToDraft for non-tutorial items
      expect(mockTutorialChoiceContext.restoreChoicesToDraft).not.toHaveBeenCalled();
      expect(mockCartContext.removeFromCart).toHaveBeenCalledWith(789);
    });

    it('T022-D: should handle multiple tutorial subjects independently', () => {
      const cartItems = [
        {
          id: 1,
          product: 123,
          subject_code: 'CS2',
          product_type: 'tutorial',
          metadata: { type: 'tutorial', subjectCode: 'CS2' }
        },
        {
          id: 2,
          product: 456,
          product_type: 'tutorial',
          metadata: { type: 'tutorial', subjectCode: 'CP1' }
        }
      ];

      renderCartPanel(cartItems);

      // Remove first item (CS2)
      const removeButtons = screen.getAllByTitle(/remove from cart/i);
      fireEvent.click(removeButtons[0]);

      // Only CS2 should be restored to draft
      expect(mockTutorialChoiceContext.restoreChoicesToDraft).toHaveBeenCalledWith('CS2');
      expect(mockTutorialChoiceContext.restoreChoicesToDraft).toHaveBeenCalledTimes(1);
    });
  });

  describe('Clear Cart', () => {
    it('T022-E: should remove all choices when clearing entire cart', () => {
      const cartItems = [
        {
          id: 1,
          product: 123,
          subject_code: 'CS2',
          product_type: 'tutorial',
          metadata: { type: 'tutorial', subjectCode: 'CS2' }
        },
        {
          id: 2,
          product: 456,
          product_type: 'tutorial',
          metadata: { type: 'tutorial', subjectCode: 'CP1' }
        }
      ];

      renderCartPanel(cartItems);

      // Find and click clear cart button
      const clearButton = screen.getByTitle(/clear cart/i);
      fireEvent.click(clearButton);

      // Should remove ALL choices
      expect(mockTutorialChoiceContext.removeAllChoices).toHaveBeenCalled();
      expect(mockCartContext.clearCart).toHaveBeenCalled();
    });
  });
});
