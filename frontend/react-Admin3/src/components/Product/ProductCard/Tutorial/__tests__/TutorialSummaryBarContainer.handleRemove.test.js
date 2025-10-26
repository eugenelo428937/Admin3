/**
 * Unit Tests: TutorialSummaryBarContainer.handleRemove
 *
 * Tests T006-T009: handleRemove method with draft, carted, mixed selections, and error handling
 *
 * CRITICAL BUG TESTS: These tests EXPOSE the bug where handleRemove only removes
 * draft selections but ignores carted ones, leaving orphaned data in the cart.
 */

// Mock httpService BEFORE importing anything else
jest.mock('../../../../../services/httpService', () => ({
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TutorialChoiceProvider } from '../../../../../contexts/TutorialChoiceContext';
import { CartProvider, useCart } from '../../../../../contexts/CartContext';
import TutorialSummaryBarContainer from '../TutorialSummaryBarContainer';

// Mock CartContext with controllable state
let mockCartContext = {
  cartItems: [],
  removeFromCart: jest.fn(),
  addToCart: jest.fn(),
  updateCartItem: jest.fn(),
  cartData: { fees: [], items: [] },
  loading: false,
};

jest.mock('../../../../../contexts/CartContext', () => {
  const React = require('react');
  const actual = jest.requireActual('../../../../../contexts/CartContext');
  return {
    ...actual,
    useCart: () => mockCartContext,
  };
});

describe('TutorialSummaryBarContainer - handleRemove Tests (T006-T009)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCartContext.cartItems = [];
    mockCartContext.removeFromCart = jest.fn().mockResolvedValue({ data: { items: [] } });
  });

  /**
   * T006: Remove draft tutorial selections
   *
   * Given: User has ONLY draft selections (isDraft: true)
   * When: User clicks Remove button
   * Then: Draft selections removed via removeSubjectChoices
   * And: NO cart API call made (draft only, not in cart)
   * And: localStorage updated
   *
   * ✅ This test SHOULD PASS (existing implementation handles drafts)
   */
  describe('T006: Remove draft selections only', () => {
    it('should remove draft tutorial selection without calling cart API', async () => {
      // Arrange: Mock tutorial choice context with DRAFT selections
      const mockTutorialChoices = {
        'CS1': {
          '1st': {
            isDraft: true,  // ✅ Draft selection
            eventId: 'evt-cs1-001',
            eventCode: 'CS1-30-25S',
            location: 'Edinburgh',
            choiceLevel: '1st',
            subjectCode: 'CS1',
            productId: 123,
            productName: 'CS1 Tutorial',
          }
        }
      };

      // Render with draft selections
      const { container } = render(
        <CartProvider>
          <TutorialChoiceProvider initialChoices={mockTutorialChoices}>
            <TutorialSummaryBarContainer />
          </TutorialChoiceProvider>
        </CartProvider>
      );

      // Act: Click Remove button
      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      // Assert: NO cart API call for draft-only selections
      await waitFor(() => {
        expect(mockCartContext.removeFromCart).not.toHaveBeenCalled();
      });

      // Assert: Summary bar disappears (selections removed)
      await waitFor(() => {
        expect(screen.queryByText(/CS1/i)).not.toBeInTheDocument();
      });
    });

    it('should remove all draft choices for a subject', async () => {
      // Arrange: Multiple draft choices for same subject
      const mockTutorialChoices = {
        'CS1': {
          '1st': {
            isDraft: true,
            eventId: 'evt-cs1-001',
            choiceLevel: '1st',
            subjectCode: 'CS1',
            productId: 123,
          },
          '2nd': {
            isDraft: true,
            eventId: 'evt-cs1-002',
            choiceLevel: '2nd',
            subjectCode: 'CS1',
            productId: 123,
          }
        }
      };

      const { container } = render(
        <CartProvider>
          <TutorialChoiceProvider initialChoices={mockTutorialChoices}>
            <TutorialSummaryBarContainer />
          </TutorialChoiceProvider>
        </CartProvider>
      );

      // Act: Remove all choices for subject
      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      // Assert: All draft choices removed
      await waitFor(() => {
        expect(screen.queryByText(/1st/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/2nd/i)).not.toBeInTheDocument();
      });

      // Assert: No cart API calls for drafts
      expect(mockCartContext.removeFromCart).not.toHaveBeenCalled();
    });
  });

  /**
   * T007: Remove carted tutorial selections
   *
   * Given: User has selections ALREADY IN CART (isDraft: false)
   * When: User clicks Remove button
   * Then: Cart API removeFromCart called with cart item ID
   * And: removeSubjectChoices called AFTER API success
   * And: Cart state updated with response
   *
   * ❌ This test WILL FAIL (bug: current implementation ignores carted items)
   */
  describe('T007: Remove carted selections', () => {
    it('should call cart API to remove carted tutorial selections', async () => {
      // Arrange: Mock cart with tutorial item
      const cartTutorialItem = {
        id: 456,  // Cart item ID
        product: 123,
        product_type: 'tutorial',
        metadata: {
          subjectCode: 'CS1',
          tutorialChoices: [
            {
              choiceLevel: '1st',
              eventCode: 'CS1-30-25S',
              eventId: 'evt-cs1-001',
            }
          ]
        }
      };

      mockCartContext.cartItems = [cartTutorialItem];

      // Mock tutorial choices (carted, not draft)
      const mockTutorialChoices = {
        'CS1': {
          '1st': {
            isDraft: false,  // ❌ IN CART (not draft)
            eventId: 'evt-cs1-001',
            eventCode: 'CS1-30-25S',
            choiceLevel: '1st',
            subjectCode: 'CS1',
            productId: 123,
          }
        }
      };

      const { container } = render(
        <CartProvider>
          <TutorialChoiceProvider initialChoices={mockTutorialChoices}>
            <TutorialSummaryBarContainer />
          </TutorialChoiceProvider>
        </CartProvider>
      );

      // Act: Click Remove button
      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      // Assert: Cart API called with cart item ID
      await waitFor(() => {
        expect(mockCartContext.removeFromCart).toHaveBeenCalledWith(456);
      });

      // Assert: Summary bar disappears after successful removal
      await waitFor(() => {
        expect(screen.queryByText(/CS1/i)).not.toBeInTheDocument();
      });
    });

    it('should update cart state with API response', async () => {
      // Arrange: Mock API response
      mockCartContext.removeFromCart.mockResolvedValue({
        data: {
          id: 1,
          items: [],  // Empty after removal
          total: '0.00',
          item_count: 0
        }
      });

      const cartItem = {
        id: 456,
        product: 123,
        product_type: 'tutorial',
        metadata: { subjectCode: 'CS1' }
      };

      mockCartContext.cartItems = [cartItem];

      const mockTutorialChoices = {
        'CS1': {
          '1st': {
            isDraft: false,
            subjectCode: 'CS1',
            productId: 123,
          }
        }
      };

      render(
        <CartProvider>
          <TutorialChoiceProvider initialChoices={mockTutorialChoices}>
            <TutorialSummaryBarContainer />
          </TutorialChoiceProvider>
        </CartProvider>
      );

      // Act: Remove carted item
      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      // Assert: API response updates cart state
      await waitFor(() => {
        expect(mockCartContext.removeFromCart).toHaveBeenCalledWith(456);
      });
    });
  });

  /**
   * T008: Remove mixed selections (draft + carted)
   *
   * Given: User has BOTH draft and carted selections for same subject
   * When: User clicks Remove button
   * Then: Cart API called for carted items ONLY
   * And: removeSubjectChoices called for entire subject
   * And: Proper sequencing (cart first, then context)
   *
   * ❌ This test WILL FAIL (bug: current implementation incomplete)
   */
  describe('T008: Remove mixed selections (draft + carted)', () => {
    it('should remove both draft and carted selections for a subject', async () => {
      // Arrange: Mixed selections
      const cartItem = {
        id: 456,
        product: 123,
        product_type: 'tutorial',
        metadata: { subjectCode: 'CS1' }
      };

      mockCartContext.cartItems = [cartItem];

      const mockTutorialChoices = {
        'CS1': {
          '1st': {
            isDraft: false,  // Carted
            subjectCode: 'CS1',
            productId: 123,
          },
          '2nd': {
            isDraft: true,   // Draft
            subjectCode: 'CS1',
            productId: 123,
          }
        }
      };

      render(
        <CartProvider>
          <TutorialChoiceProvider initialChoices={mockTutorialChoices}>
            <TutorialSummaryBarContainer />
          </TutorialChoiceProvider>
        </CartProvider>
      );

      // Act: Remove all choices for subject
      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      // Assert: Cart API called for carted item
      await waitFor(() => {
        expect(mockCartContext.removeFromCart).toHaveBeenCalledWith(456);
      });

      // Assert: All choices removed (draft + carted)
      await waitFor(() => {
        expect(screen.queryByText(/CS1/i)).not.toBeInTheDocument();
      });
    });

    it('should call cart API only for carted items, not drafts', async () => {
      // Arrange: Multiple selections, mixed state
      const cartItem = {
        id: 789,
        product: 123,
        product_type: 'tutorial',
        metadata: { subjectCode: 'CM2' }
      };

      mockCartContext.cartItems = [cartItem];

      const mockTutorialChoices = {
        'CM2': {
          '1st': {
            isDraft: true,   // Draft - no API call
            subjectCode: 'CM2',
          },
          '2nd': {
            isDraft: false,  // Carted - API call needed
            subjectCode: 'CM2',
          },
          '3rd': {
            isDraft: true,   // Draft - no API call
            subjectCode: 'CM2',
          }
        }
      };

      render(
        <CartProvider>
          <TutorialChoiceProvider initialChoices={mockTutorialChoices}>
            <TutorialSummaryBarContainer />
          </TutorialChoiceProvider>
        </CartProvider>
      );

      // Act: Remove all choices
      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      // Assert: Cart API called exactly ONCE for the carted item
      await waitFor(() => {
        expect(mockCartContext.removeFromCart).toHaveBeenCalledTimes(1);
        expect(mockCartContext.removeFromCart).toHaveBeenCalledWith(789);
      });
    });
  });

  /**
   * T009: Error handling and state rollback
   *
   * Given: Cart API removal fails
   * When: User attempts to remove carted selections
   * Then: Error message displayed to user (Snackbar)
   * And: State rolls back (selections remain)
   * And: User can retry operation
   *
   * ❌ This test WILL FAIL (no error handling implemented yet)
   */
  describe('T009: Error handling and state rollback', () => {
    it('should display error message when cart API fails', async () => {
      // Arrange: Mock API failure
      mockCartContext.removeFromCart.mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'Server error' }
        }
      });

      const cartItem = {
        id: 456,
        product: 123,
        product_type: 'tutorial',
        metadata: { subjectCode: 'CS1' }
      };

      mockCartContext.cartItems = [cartItem];

      const mockTutorialChoices = {
        'CS1': {
          '1st': {
            isDraft: false,
            subjectCode: 'CS1',
            productId: 123,
          }
        }
      };

      render(
        <CartProvider>
          <TutorialChoiceProvider initialChoices={mockTutorialChoices}>
            <TutorialSummaryBarContainer />
          </TutorialChoiceProvider>
        </CartProvider>
      );

      // Act: Attempt removal
      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      // Assert: Error message displayed (Snackbar)
      await waitFor(() => {
        expect(screen.getByText(/failed to remove tutorial selections/i)).toBeInTheDocument();
      });

      // Assert: Selections still visible (rollback)
      expect(screen.getByText(/CS1/i)).toBeInTheDocument();
    });

    it('should rollback state on API failure', async () => {
      // Arrange: Mock network failure
      mockCartContext.removeFromCart.mockRejectedValue(
        new Error('Network error')
      );

      const cartItem = {
        id: 456,
        product: 123,
        product_type: 'tutorial',
        metadata: { subjectCode: 'CS1' }
      };

      mockCartContext.cartItems = [cartItem];

      const mockTutorialChoices = {
        'CS1': {
          '1st': {
            isDraft: false,
            subjectCode: 'CS1',
          }
        }
      };

      render(
        <CartProvider>
          <TutorialChoiceProvider initialChoices={mockTutorialChoices}>
            <TutorialSummaryBarContainer />
          </TutorialChoiceProvider>
        </CartProvider>
      );

      const removeButton = screen.getByRole('button', { name: /remove/i });

      // Act: Attempt removal
      fireEvent.click(removeButton);

      // Assert: Summary bar still visible (state rolled back)
      await waitFor(() => {
        expect(screen.getByText(/CS1/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after failure', async () => {
      // Arrange: First call fails, second succeeds
      mockCartContext.removeFromCart
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { items: [] } });

      const cartItem = {
        id: 456,
        product: 123,
        product_type: 'tutorial',
        metadata: { subjectCode: 'CS1' }
      };

      mockCartContext.cartItems = [cartItem];

      const mockTutorialChoices = {
        'CS1': {
          '1st': {
            isDraft: false,
            subjectCode: 'CS1',
          }
        }
      };

      render(
        <CartProvider>
          <TutorialChoiceProvider initialChoices={mockTutorialChoices}>
            <TutorialSummaryBarContainer />
          </TutorialChoiceProvider>
        </CartProvider>
      );

      const removeButton = screen.getByRole('button', { name: /remove/i });

      // Act: First attempt (fails)
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockCartContext.removeFromCart).toHaveBeenCalledTimes(1);
      });

      // Act: Retry (succeeds)
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockCartContext.removeFromCart).toHaveBeenCalledTimes(2);
      });

      // Assert: Summary bar removed on success
      await waitFor(() => {
        expect(screen.queryByText(/CS1/i)).not.toBeInTheDocument();
      });
    });
  });
});
