import { useState } from 'react';
import { useTutorialChoice } from '../../../../contexts/TutorialChoiceContext';
import { useCart } from '../../../../contexts/CartContext.tsx';
import {
  buildTutorialProductData,
  buildTutorialPriceData,
  buildTutorialMetadata,
} from '../../../../utils/tutorialMetadataBuilder.js';
import type {
  FlattenedTutorialEvent,
  TutorialChoiceData,
} from '../../../../types/browse';

// ─── Unified Dialog Data ────────────────────────────────────────

export interface UnifiedDialogData {
  subjectCode: string;
  location: string;
  productId: number | string;
  events: FlattenedTutorialEvent[];
}

// ─── ViewModel Interface ────────────────────────────────────────

export interface TutorialSummaryBarContainerVM {
  // Derived state
  subjectCodesWithChoices: string[];

  // Dialog state
  unifiedDialogOpen: boolean;
  unifiedDialogData: UnifiedDialogData | null;

  // Snackbar state
  snackbarOpen: boolean;
  snackbarMessage: string;

  // Loading state
  isRemoving: boolean;

  // Actions
  handleEdit: (subjectCode: string) => void;
  handleAddToCart: (subjectCode: string) => Promise<void>;
  handleRemove: (subjectCode: string) => Promise<void>;
  handleSnackbarClose: () => void;
  closeUnifiedDialog: () => void;
}

// ─── ViewModel Hook ─────────────────────────────────────────────

const useTutorialSummaryBarContainerVM = (): TutorialSummaryBarContainerVM => {
  const {
    tutorialChoices,
    getSubjectChoices,
    getDraftChoices,
    removeTutorialChoice,
    removeSubjectChoices,
    markChoicesAsAdded,
    openEditDialog,
  } = useTutorialChoice();

  const { addToCart, updateCartItem, removeFromCart, cartItems } = useCart();

  // State for unified edit dialog
  const [unifiedDialogOpen, setUnifiedDialogOpen] = useState(false);
  const [unifiedDialogData, setUnifiedDialogData] = useState<UnifiedDialogData | null>(null);

  // State for error handling (T016)
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // State for loading indicator (T017)
  const [isRemoving, setIsRemoving] = useState(false);

  // Get all subject codes that have ANY choices (draft or in cart)
  const subjectCodesWithChoices = Object.keys(tutorialChoices).filter(subjectCode => {
    const choices = getSubjectChoices(subjectCode);
    return Object.keys(choices).length > 0;
  });

  /**
   * T006: Handle Edit button click
   * Opens a unified dialog showing ALL tutorials for this subject across all locations
   */
  const handleEdit = (subjectCode: string): void => {
    const choices = getSubjectChoices(subjectCode);

    // Convert choices to events format
    const events: FlattenedTutorialEvent[] = Object.values(choices).map((choice: any) => ({
      eventId: choice.eventId,
      eventTitle: choice.eventTitle,
      eventCode: choice.eventCode,
      location: choice.location,
      venue: choice.venue,
      startDate: choice.startDate,
      endDate: choice.endDate,
      variation: choice.variation || {
        variationId: choice.variationId,
        variationName: choice.variationName,
        prices: choice.prices || [],
      },
    }));

    // Sort events by location and start date
    events.sort((a, b) => {
      const locA = a.location || '';
      const locB = b.location || '';
      if (locA !== locB) {
        return locA.localeCompare(locB);
      }
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    // Get first choice for product metadata
    const firstChoice = Object.values(choices)[0] as TutorialChoiceData | undefined;
    if (!firstChoice) {
      return;
    }

    const dialogData: UnifiedDialogData = {
      subjectCode,
      location: 'Current choices',  // Indicate these are current selections
      productId: firstChoice.productId || '',
      events: events,
    };

    setUnifiedDialogData(dialogData);
    setUnifiedDialogOpen(true);
  };

  /**
   * T005: Handle Add to Cart button click
   * Uses utility functions to build proper cart payload format
   * Checks if tutorial already in cart and updates instead of adding duplicate
   * Allows adding tutorials with any choice level (1st, 2nd, or 3rd)
   */
  const handleAddToCart = async (subjectCode: string): Promise<void> => {
    const choices = getSubjectChoices(subjectCode) as Record<string, TutorialChoiceData>;

    // Get any available choice to extract product metadata
    const anyChoice = choices['1st'] || choices['2nd'] || choices['3rd'];

    if (!anyChoice) {
      console.error('Cannot add to cart: No choices found for', subjectCode);
      return;
    }

    // Extract data from any available choice (stores product metadata from T011)
    const { productId, productName, subjectName, location, variation } = anyChoice;

    // Get actual price from variation
    const priceObj = variation?.prices?.find((p: any) => p.price_type === 'standard');
    const actualPrice = priceObj?.amount || 0;

    // Build metadata using utility function
    const tutorialMetadata = buildTutorialMetadata(
      choices,
      subjectCode,
      location,
      actualPrice
    );

    // Build product data using utility function
    const productData = buildTutorialProductData(
      productId,
      subjectCode,
      subjectName || productName,
      location
    );

    // Build price data using utility function
    const priceData = buildTutorialPriceData(actualPrice, tutorialMetadata);

    // Check if tutorial already in cart by subject code (same logic as TutorialProductCard)
    const existingCartItem = cartItems.find((item: any) => {
      const itemSubjectCode = item.subject_code || item.metadata?.subjectCode;
      return itemSubjectCode === subjectCode && item.product_type === "tutorial";
    });

    try {
      if (existingCartItem) {
        // Update existing cart item with new choices
        await updateCartItem(existingCartItem.id, productData, priceData);
      } else {
        // Add new item to cart
        await addToCart(productData, priceData);
      }
      markChoicesAsAdded(subjectCode);
    } catch (error) {
      console.error('Error adding/updating tutorial in cart:', error);
    }
  };

  /**
   * T015-T017: Handle Remove button click
   * Removes ALL tutorial choices for a subject (draft AND carted)
   * Integrates with cart API for carted selections
   * Includes error handling and loading states
   */
  const handleRemove = async (subjectCode: string): Promise<void> => {
    const choices = getSubjectChoices(subjectCode);

    // T017: Set loading state
    setIsRemoving(true);

    try {
      // T015: Remove from backend cart FIRST
      // ALWAYS check cart directly - don't rely on tutorialChoices isDraft flag
      // User may have selected different events, old one may still be in cart
      const cartItem = cartItems.find((item: any) => {
        const itemSubjectCode = item.subject_code || item.metadata?.subjectCode;
        return itemSubjectCode === subjectCode && item.product_type === 'tutorial';
      });

      if (cartItem) {
        // T015: Call cart API to remove item
        await removeFromCart(cartItem.id);
      }

      // T015: Remove all choices from context (after cart API success)
      removeSubjectChoices(subjectCode);

    } catch (error) {
      // T016: Error handling - display user-friendly message
      console.error('Error removing tutorial choices:', error);
      setSnackbarMessage('Failed to remove tutorial selections. Please try again.');
      setSnackbarOpen(true);

      // T016: State rollback - selections remain on error
      // (No state change made, so implicit rollback)
    } finally {
      // T017: Clear loading state
      setIsRemoving(false);
    }
  };

  // T016: Handle Snackbar close
  const handleSnackbarClose = (): void => {
    setSnackbarOpen(false);
  };

  // Close unified dialog
  const closeUnifiedDialog = (): void => {
    setUnifiedDialogOpen(false);
  };

  return {
    subjectCodesWithChoices,
    unifiedDialogOpen,
    unifiedDialogData,
    snackbarOpen,
    snackbarMessage,
    isRemoving,
    handleEdit,
    handleAddToCart,
    handleRemove,
    handleSnackbarClose,
    closeUnifiedDialog,
  };
};

export default useTutorialSummaryBarContainerVM;
