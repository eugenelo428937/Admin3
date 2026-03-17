import { useEffect } from 'react';
import { useTutorialChoice } from '../../../../contexts/TutorialChoiceContext';
import { useCart } from '../../../../contexts/CartContext.tsx';
import {
  buildTutorialMetadata,
  buildTutorialProductData,
  buildTutorialPriceData,
} from '../../../../utils/tutorialMetadataBuilder.js';
import type {
  FlattenedTutorialEvent,
  ChoiceLevel,
  TutorialChoiceData,
  SubjectChoices,
} from '../../../../types/browse';

// ─── ViewModel Interface ────────────────────────────────────────

export interface TutorialSelectionDialogVM {
  // Derived state
  subjectChoices: SubjectChoices;
  subjectName: string;
  hasDraftChoices: boolean;
  dialogTitleId: string;

  // Actions
  getSelectedChoiceLevel: (eventId: number | string) => ChoiceLevel | null;
  handleSelectChoice: (choiceLevel: ChoiceLevel, eventData: any) => void;
  handleResetChoice: (choiceLevel: ChoiceLevel, eventId: number | string) => void;
  handleAddToCart: () => Promise<void>;
}

// ─── ViewModel Hook ─────────────────────────────────────────────

const useTutorialSelectionDialogVM = (
  product: {
    subjectCode: string;
    location: string;
    productId: number | string;
  },
  events: FlattenedTutorialEvent[],
  onClose: () => void,
): TutorialSelectionDialogVM => {
  const { subjectCode, location, productId } = product;
  const { addTutorialChoice, getSubjectChoices, markChoicesAsAdded, removeTutorialChoice } = useTutorialChoice();
  const { addToCart, updateCartItem, cartItems } = useCart();

  // Get current draft choices for this subject
  const subjectChoices = getSubjectChoices(subjectCode) as SubjectChoices;

  // Derive subjectName from events or choices
  const subjectName = events[0]?.eventTitle?.split(' - ')[0] ||
    (Object.values(subjectChoices)[0] as TutorialChoiceData | undefined)?.subjectName ||
    `${subjectCode} Tutorial`;

  // For Add to Cart, use subjectName as productName
  const productName = subjectName;

  // Generate dialog title ID for aria-labelledby
  const dialogTitleId = `tutorial-selection-dialog-${subjectCode}`;

  /**
   * Determine which choice level (1st, 2nd, 3rd) is selected for a given event
   * Shows ALL choices (both draft and added to cart)
   */
  const getSelectedChoiceLevel = (eventId: number | string): ChoiceLevel | null => {
    for (const [choiceLevel, choiceData] of Object.entries(subjectChoices)) {
      if ((choiceData as TutorialChoiceData).eventId === eventId) {
        return choiceLevel as ChoiceLevel;
      }
    }
    return null;
  };

  /**
   * Handle choice selection from TutorialDetailCard and save to context
   * Adds subject metadata and marks as draft (isDraft: true)
   * T013: Now includes product metadata for Add to Cart functionality
   */
  const handleSelectChoice = (choiceLevel: ChoiceLevel, eventData: any): void => {
    addTutorialChoice(
      subjectCode,
      choiceLevel,
      {
        ...eventData,
        subjectCode,
        subjectName,
        location,
        isDraft: true,
      },
      // T013: Pass product metadata for cart integration
      {
        productId,
        productName,
        subjectName,
      }
    );
  };

  /**
   * Handle reset choice - remove selection for an event
   */
  const handleResetChoice = (choiceLevel: ChoiceLevel, _eventId: number | string): void => {
    removeTutorialChoice(subjectCode, choiceLevel);
  };

  /**
   * Handle Add to Cart button click
   * Adds or updates tutorial in cart with selected choices
   */
  const handleAddToCart = async (): Promise<void> => {
    const choices = Object.entries(subjectChoices)
      .filter(([_, choice]) => (choice as TutorialChoiceData).isDraft)
      .reduce((acc, [level, choice]) => ({ ...acc, [level]: choice }), {} as Record<string, TutorialChoiceData>);

    if (Object.keys(choices).length === 0) {
      return;
    }

    // Get any available choice to extract product metadata
    const anyChoice = choices['1st'] || choices['2nd'] || choices['3rd'];

    // Get actual price from variation
    const priceObj = anyChoice.variation?.prices?.find((p: any) => p.price_type === 'standard');
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

    // Check if tutorial already in cart by subject code
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
      onClose(); // Close dialog after adding to cart
    } catch (error) {
      console.error('Error adding/updating tutorial in cart:', error);
    }
  };

  // Check if there are any draft choices to enable Add to Cart button
  const hasDraftChoices = Object.values(subjectChoices).some(
    (choice) => (choice as TutorialChoiceData).isDraft
  );

  return {
    subjectChoices,
    subjectName,
    hasDraftChoices,
    dialogTitleId,
    getSelectedChoiceLevel,
    handleSelectChoice,
    handleResetChoice,
    handleAddToCart,
  };
};

export default useTutorialSelectionDialogVM;
