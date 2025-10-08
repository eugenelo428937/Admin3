import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Box,
  Button,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import TutorialDetailCard from './TutorialDetailCard';
import { useTutorialChoice } from '../../../../contexts/TutorialChoiceContext';
import { useCart } from '../../../../contexts/CartContext';
import { touchIconButtonStyle, responsiveGridSpacing } from './tutorialStyles';
import {
  buildTutorialMetadata,
  buildTutorialProductData,
  buildTutorialPriceData,
} from '../../../../utils/tutorialMetadataBuilder';

/**
 * TutorialSelectionDialog - Container component for tutorial event selection
 * with responsive grid layout and context integration.
 *
 * Contract: Manages tutorial choice selection through TutorialChoiceContext
 * Optimized: Memoized to prevent unnecessary re-renders when parent re-renders
 */
const TutorialSelectionDialog = React.memo(({ open, onClose, product, events }) => {
  const { subjectCode, location, productId } = product;
  const { addTutorialChoice, getSubjectChoices, markChoicesAsAdded, removeTutorialChoice } = useTutorialChoice();
  const { addToCart, updateCartItem, cartItems } = useCart();

  // DEBUG: Log props when dialog receives them
  React.useEffect(() => {
    if (open) {
      console.log('🔍 [TutorialSelectionDialog] Received props:', {
        open,
        product: {
          subjectCode,
          location,
          productId,
        },
        events: {
          count: events.length,
          eventsList: events,
        },
      });
    }
  }, [open, subjectCode, location, productId, events]);

  // Get current draft choices for this subject
  const subjectChoices = getSubjectChoices(subjectCode);

  // Derive subjectName from events or choices
  const subjectName = events[0]?.eventTitle?.split(' - ')[0] ||
    Object.values(subjectChoices)[0]?.subjectName ||
    `${subjectCode} Tutorial`;

  // For Add to Cart, use subjectName as productName
  const productName = subjectName;

  /**
   * Determine which choice level (1st, 2nd, 3rd) is selected for a given event
   * Shows ALL choices (both draft and added to cart)
   * @param {number|string} eventId - The event ID to check
   * @returns {string|null} The choice level ('1st', '2nd', '3rd') or null if not selected
   */
  const getSelectedChoiceLevel = (eventId) => {
    for (const [choiceLevel, choiceData] of Object.entries(subjectChoices)) {
      if (choiceData.eventId === eventId) {
        return choiceLevel;
      }
    }
    return null;
  };

  /**
   * Handle choice selection from TutorialDetailCard and save to context
   * Adds subject metadata and marks as draft (isDraft: true)
   * T013: Now includes product metadata for Add to Cart functionality
   * @param {string} choiceLevel - The choice level ('1st', '2nd', or '3rd')
   * @param {Object} eventData - The event data from TutorialDetailCard
   */
  const handleSelectChoice = (choiceLevel, eventData) => {
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
   * @param {string} choiceLevel - The choice level to remove ('1st', '2nd', or '3rd')
   * @param {number|string} eventId - The event ID (not used, but kept for consistency)
   */
  const handleResetChoice = (choiceLevel, eventId) => {
    removeTutorialChoice(subjectCode, choiceLevel);
  };

  /**
   * Handle Add to Cart button click
   * Adds or updates tutorial in cart with selected choices
   */
  const handleAddToCart = async () => {
    const choices = Object.entries(subjectChoices)
      .filter(([_, choice]) => choice.isDraft)
      .reduce((acc, [level, choice]) => ({ ...acc, [level]: choice }), {});

    if (Object.keys(choices).length === 0) {
      console.warn('Cannot add to cart: No draft choices selected');
      return;
    }

    // Get any available choice to extract product metadata
    const anyChoice = choices['1st'] || choices['2nd'] || choices['3rd'];

    // Get actual price from variation
    const priceObj = anyChoice.variation?.prices?.find(p => p.price_type === 'standard');
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
    const existingCartItem = cartItems.find(item => {
      const itemSubjectCode = item.subject_code || item.metadata?.subjectCode;
      return itemSubjectCode === subjectCode && item.product_type === "tutorial";
    });

    try {
      if (existingCartItem) {
        // Update existing cart item with new choices
        await updateCartItem(existingCartItem.id, productData, priceData);
        console.log(`Tutorial updated in cart for ${subjectCode}`);
      } else {
        // Add new item to cart
        await addToCart(productData, priceData);
        console.log(`Tutorial added to cart for ${subjectCode}`);
      }
      markChoicesAsAdded(subjectCode);
      onClose(); // Close dialog after adding to cart
    } catch (error) {
      console.error('Error adding/updating tutorial in cart:', error);
    }
  };

  // Check if there are any draft choices to enable Add to Cart button
  const hasDraftChoices = Object.values(subjectChoices).some(choice => choice.isDraft);

  // Generate dialog title ID for aria-labelledby
  const dialogTitleId = `tutorial-selection-dialog-${subjectCode}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby={dialogTitleId}
    >
      <DialogTitle id={dialogTitleId}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <span>{subjectCode} {location}</span>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            aria-label="close"
            sx={{
              marginLeft: 2,
              ...touchIconButtonStyle,
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={responsiveGridSpacing}>
          {events.map((event) => {
            const selectedChoiceLevel = getSelectedChoiceLevel(event.eventId);
            return (
              <Grid item key={event.eventId} xs={12} md={4}>
                <TutorialDetailCard
                  event={event}
                  variation={event.variation || {
                    variationId: event.variationId,
                    variationName: event.variationName || 'Standard Tutorial',
                    prices: event.prices || [],
                  }}
                  selectedChoiceLevel={selectedChoiceLevel}
                  onSelectChoice={handleSelectChoice}
                  onResetChoice={handleResetChoice}
                  subjectCode={subjectCode}
                />
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button
          onClick={handleAddToCart}
          variant="contained"
          color="primary"
          disabled={!hasDraftChoices}
          startIcon={<AddShoppingCartIcon />}
        >
          Add to Cart
        </Button>
      </DialogActions>
    </Dialog>
  );
});

TutorialSelectionDialog.displayName = 'TutorialSelectionDialog';

TutorialSelectionDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  product: PropTypes.shape({
    subjectCode: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
    productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
  events: PropTypes.arrayOf(
    PropTypes.shape({
      eventId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      eventTitle: PropTypes.string.isRequired,
      eventCode: PropTypes.string.isRequired,
      location: PropTypes.string,
      venue: PropTypes.string,
      startDate: PropTypes.string.isRequired,
      endDate: PropTypes.string.isRequired,
      variation: PropTypes.shape({
        variationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        variationName: PropTypes.string,
        prices: PropTypes.array,
      }),
      variationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      variationName: PropTypes.string,
      prices: PropTypes.array,
    })
  ).isRequired,
};

export default TutorialSelectionDialog;
