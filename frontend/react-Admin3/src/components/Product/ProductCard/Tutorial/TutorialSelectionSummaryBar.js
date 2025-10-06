import React, { useState } from 'react';
import {
  Snackbar,
  SnackbarContent,
  Button,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTutorialChoice } from '../../../../contexts/TutorialChoiceContext';

/**
 * TutorialSelectionSummaryBar - Persistent summary bar for tutorial choices
 * with expand/collapse states and action buttons.
 *
 * Contract: Displays at bottom center, expands with draft choices, collapses when carted
 * Optimized: Memoized to prevent unnecessary re-renders
 */
const TutorialSelectionSummaryBar = React.memo(({ subjectCode, onEdit, onAddToCart, onRemove }) => {
  const { getSubjectChoices, getDraftChoices, hasCartedChoices } = useTutorialChoice();
  const [isOpen, setIsOpen] = useState(true);

  // Get all choices for this subject
  const subjectChoices = getSubjectChoices(subjectCode);
  const draftChoices = getDraftChoices(subjectCode);
  const hasCarted = hasCartedChoices(subjectCode);

  // Determine visibility - show if any choices exist and not manually closed
  const hasAnyChoices = Object.keys(subjectChoices).length > 0;
  const visible = hasAnyChoices && isOpen;

  // Determine expansion state - expand when draft choices exist
  const hasDraft = Array.isArray(draftChoices) && draftChoices.length > 0;
  const expanded = hasDraft;

  // Handle close button click
  const handleClose = () => {
    setIsOpen(false);
  };

  // Reset isOpen when subject choices change (new choices added)
  React.useEffect(() => {
    if (hasAnyChoices) {
      setIsOpen(true);
    }
  }, [hasAnyChoices]);

  if (!visible) {
    return null;
  }

  // Get subject name from first choice (all choices have same subject)
  const firstChoice = Object.values(subjectChoices)[0];
  const subjectName = firstChoice?.subjectName || `${subjectCode} - Actuarial Modelling`;

  // Sort and format choice details
  const choiceOrder = ['1st', '2nd', '3rd'];
  const choiceDetails = choiceOrder
    .filter(level => subjectChoices[level])
    .map(level => {
      const choice = subjectChoices[level];
      return {
        level,
        location: choice.location,
        eventCode: choice.eventCode,
        isDraft: choice.isDraft,
      };
    });

  return (
    <Snackbar
      open={visible}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ maxWidth: '600px', width: '100%' }}
    >
      <SnackbarContent
        role="alert"
        message={
          <Box>
            {/* Subject Title */}
            <Typography variant="h6" gutterBottom color="inherit">
              {subjectName} Tutorials
            </Typography>

            {/* Expanded State: Show Choice Details */}
            {expanded && (
              <Box sx={{ mb: 2 }}>
                {choiceDetails
                  .filter(choice => choice.isDraft)
                  .map((choice, index) => (
                    <Typography key={choice.level} variant="body2" color="inherit">
                      {index + 1}. {choice.level} Choice - {choice.location} ({choice.eventCode})
                    </Typography>
                  ))}
              </Box>
            )}
          </Box>
        }
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Edit Button (Always Visible) */}
            <Button
              size="small"
              color="inherit"
              onClick={onEdit}
              aria-label="Edit tutorial choices"
            >
              Edit
            </Button>

            {/* Expanded State: Show Add to Cart and Remove Buttons */}
            {expanded && (
              <>
                <Button
                  size="small"
                  color="inherit"
                  onClick={onAddToCart}
                  aria-label="Add tutorial choices to cart"
                >
                  Add to Cart
                </Button>
                <Button
                  size="small"
                  color="inherit"
                  onClick={onRemove}
                  aria-label="Remove tutorial choices"
                >
                  Remove
                </Button>
              </>
            )}

            {/* Close Button (Always Visible) */}
            <IconButton
              size="small"
              aria-label="Close"
              color="inherit"
              onClick={handleClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        sx={{
          backgroundColor: '#323232',
          color: '#fff',
          width: '100%',
          flexWrap: 'wrap',
        }}
      />
    </Snackbar>
  );
});

TutorialSelectionSummaryBar.displayName = 'TutorialSelectionSummaryBar';

export default TutorialSelectionSummaryBar;
