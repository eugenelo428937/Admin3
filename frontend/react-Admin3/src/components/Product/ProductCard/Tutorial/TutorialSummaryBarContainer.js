import React, { useState } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
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
    removeSubjectChoices,
    markChoicesAsAdded,
    openEditDialog,
  } = useTutorialChoice();

  const { addToCart, updateCartItem, removeFromCart, cartItems } = useCart();

  // State for unified edit dialog
  const [unifiedDialogOpen, setUnifiedDialogOpen] = useState(false);
  const [unifiedDialogData, setUnifiedDialogData] = useState(null);

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
   * T015-T017: Handle Remove button click
   * Removes ALL tutorial choices for a subject (draft AND carted)
   * Integrates with cart API for carted selections
   * Includes error handling and loading states
   */
  const handleRemove = async (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);

    console.log('🗑️ [handleRemove] Starting removal for subject:', subjectCode);
    console.log('🗑️ [handleRemove] Choices:', choices);
    console.log('🗑️ [handleRemove] All cartItems:', cartItems);

    // T017: Set loading state
    setIsRemoving(true);

    try {
      // T015: Remove from backend cart FIRST
      // ALWAYS check cart directly - don't rely on tutorialChoices isDraft flag
      // User may have selected different events, old one may still be in cart
      const cartItem = cartItems.find(item => {
        const itemSubjectCode = item.subject_code || item.metadata?.subjectCode;
        console.log('🗑️ [handleRemove] Checking cart item:', {
          id: item.id,
          subject_code: item.subject_code,
          metadata_subjectCode: item.metadata?.subjectCode,
          product_type: item.product_type,
          itemSubjectCode,
          matches: itemSubjectCode === subjectCode && item.product_type === 'tutorial'
        });
        return itemSubjectCode === subjectCode && item.product_type === 'tutorial';
      });

      console.log('🗑️ [handleRemove] Found cart item:', cartItem);

      if (cartItem) {
        console.log('🗑️ [handleRemove] Calling removeFromCart with ID:', cartItem.id);
        // T015: Call cart API to remove item
        await removeFromCart(cartItem.id);
        console.log('🗑️ [handleRemove] removeFromCart completed');
      } else {
        console.log('🗑️ [handleRemove] No cart item found for subject:', subjectCode);
      }

      // T015: Remove all choices from context (after cart API success)
      console.log('🗑️ [handleRemove] Calling removeSubjectChoices for:', subjectCode);
      removeSubjectChoices(subjectCode);
      console.log('🗑️ [handleRemove] Removal complete');

    } catch (error) {
      // T016: Error handling - display user-friendly message
      console.error('❌ [handleRemove] Error removing tutorial choices:', error);
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
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          left: 16,
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

      {/* T016: Error Snackbar for removal failures */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="error" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default TutorialSummaryBarContainer;
