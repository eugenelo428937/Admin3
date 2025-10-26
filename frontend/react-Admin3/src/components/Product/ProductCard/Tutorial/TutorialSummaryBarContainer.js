import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useTutorialChoice } from '../../../../contexts/TutorialChoiceContext';
import { useCart } from '../../../../contexts/CartContext';
import TutorialSelectionSummaryBar from './TutorialSelectionSummaryBar';
import TutorialSelectionDialog from './TutorialSelectionDialog';
import {
  buildTutorialProductData,
  buildTutorialPriceData,
  buildTutorialMetadata,
} from '../../../../utils/tutorialMetadataBuilder';

/**
 * TutorialSummaryBarContainer
 * T012: Global container that renders summary bars for all subjects with draft choices
 *
 * Architecture:
 * - Rendered at App/Layout level for cross-route visibility
 * - Monitors TutorialChoiceContext for changes
 * - Renders one TutorialSelectionSummaryBar per subject with draft choices
 * - Handles Add to Cart, Edit, and Remove actions
 *
 * Layout:
 * - Fixed positioning at bottom center
 * - Vertical stacking with gap between bars
 * - Does not block SpeedDial or other UI elements
 */
const TutorialSummaryBarContainer = () => {
  const {
    tutorialChoices,
    getSubjectChoices,
    getDraftChoices,
    removeTutorialChoice,
    markChoicesAsAdded,
    openEditDialog,
  } = useTutorialChoice();

  const { addToCart, updateCartItem, cartItems } = useCart();

  // State for unified edit dialog
  const [unifiedDialogOpen, setUnifiedDialogOpen] = useState(false);
  const [unifiedDialogData, setUnifiedDialogData] = useState(null);

  // Get all subject codes that have ANY choices (draft or in cart)
  const subjectCodesWithChoices = Object.keys(tutorialChoices).filter(subjectCode => {
    const choices = getSubjectChoices(subjectCode);
    return Object.keys(choices).length > 0;
  });

  // T003: Return null if no subjects with choices
  if (subjectCodesWithChoices.length === 0) {
    return null;
  }

  /**
   * T006: Handle Edit button click
   * Opens a unified dialog showing ALL tutorials for this subject across all locations
   */
  const handleEdit = (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);

    // DEBUG: Log choices from context

    // Convert choices to events format
    const events = Object.values(choices).map(choice => ({
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
      if (a.location !== b.location) {
        return a.location.localeCompare(b.location);
      }
      return new Date(a.startDate) - new Date(b.startDate);
    });

    

    // Get first choice for product metadata
    const firstChoice = Object.values(choices)[0];
    if (!firstChoice) {

      return;
    }

    const dialogData = {
      subjectCode,
      location: 'Current choices',  // Indicate these are current selections
      productId: firstChoice.productId,
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
  const handleAddToCart = async (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);

    // Get any available choice to extract product metadata
    const anyChoice = choices['1st'] || choices['2nd'] || choices['3rd'];

    if (!anyChoice) {
      console.error('Cannot add to cart: No choices found for', subjectCode);
      return;
    }

    // Extract data from any available choice (stores product metadata from T011)
    const { productId, productName, subjectName, location, variation } = anyChoice;

    // Get actual price from variation
    const priceObj = variation?.prices?.find(p => p.price_type === 'standard');
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
    const existingCartItem = cartItems.find(item => {
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
   * T007: Handle Remove button click
   * Removes all draft choices for the subject
   */
  const handleRemove = (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);

    // Remove all draft choices
    Object.keys(choices).forEach(choiceLevel => {
      if (choices[choiceLevel].isDraft) {
        removeTutorialChoice(subjectCode, choiceLevel);
      }
    });
  };

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          // T017: Responsive positioning
          // Mobile: Full width at bottom-0
          // Desktop: Bottom-left with margins
          bottom: { xs: 0, md: 16 },
          left: { xs: 0, md: 16 },
          right: { xs: 0, md: 'auto' },
          zIndex: 1200,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          pointerEvents: 'none', // Allow clicks to pass through gaps
          '& > *': {
            pointerEvents: 'auto', // Re-enable pointer events on children
          },
        }}
      >
        {subjectCodesWithChoices.map(subjectCode => (
          <TutorialSelectionSummaryBar
            key={subjectCode}
            subjectCode={subjectCode}
            onEdit={() => handleEdit(subjectCode)}
            onAddToCart={() => handleAddToCart(subjectCode)}
            onRemove={() => handleRemove(subjectCode)}
          />
        ))}
      </Box>

      {/* Unified Edit Dialog showing all locations */}
      {unifiedDialogData && (() => {
        // DEBUG: Log props being passed to unified dialog
        

        return (
          <TutorialSelectionDialog
            open={unifiedDialogOpen}
            onClose={() => setUnifiedDialogOpen(false)}
            product={{
              subjectCode: unifiedDialogData.subjectCode,
              location: unifiedDialogData.location,
              productId: unifiedDialogData.productId,
            }}
            events={unifiedDialogData.events}
          />
        );
      })()}
    </>
  );
};

export default TutorialSummaryBarContainer;
