import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Button,
  IconButton,
  Typography,
  Box,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTutorialChoice } from '../../../../contexts/TutorialChoiceContext';
import { touchButtonStyle, touchIconButtonStyle } from './tutorialStyles';

/**
 * TutorialSelectionSummaryBar - Persistent summary bar for tutorial choices
 * with expand/collapse states and action buttons.
 *
 * Contract: Displays at bottom center, expands with draft choices, collapses when carted
 * Optimized: Memoized to prevent unnecessary re-renders
 */
const TutorialSelectionSummaryBar = React.memo(({ subjectCode, onEdit, onAddToCart, onRemove }) => {
  const theme = useTheme();
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

  if (!visible) {
    return null;
  }

  return (
    <Paper
      elevation={6}
      role="alert"
      sx={{
        backgroundColor: theme.palette.colorTheme?.bpp?.cobalt?.['060'] || '#1a365d',
        color: '#fff',
        width: '100%',
        maxWidth: { xs: '100%', sm: '600px' },
        p: 2,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1 }}>
        {/* Subject Title */}
        <Typography variant="h6" gutterBottom color="inherit">
          {subjectName} Tutorials
        </Typography>

        {/* Expanded State: Show Choice Details */}
        {expanded && (
          <Box>
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

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Edit Button (Always Visible) */}
        <Button
          size="medium"
          color="inherit"
          onClick={onEdit}
          aria-label="Edit tutorial choices"
          sx={touchButtonStyle}
        >
          Edit
        </Button>

        {/* Expanded State: Show Add to Cart and Remove Buttons */}
        {expanded && (
          <>
            <Button
              size="medium"
              color="inherit"
              onClick={onAddToCart}
              aria-label="Add tutorial choices to cart"
              sx={touchButtonStyle}
            >
              Add to Cart
            </Button>
            <Button
              size="medium"
              color="inherit"
              onClick={onRemove}
              aria-label="Remove tutorial choices"
              sx={touchButtonStyle}
            >
              Remove
            </Button>
          </>
        )}

        {/* Close Button (Always Visible) */}
        <IconButton
          aria-label="Close"
          color="inherit"
          onClick={handleClose}
          sx={touchIconButtonStyle}
        >
          <CloseIcon />
        </IconButton>
      </Box>
    </Paper>
  );
});

TutorialSelectionSummaryBar.displayName = 'TutorialSelectionSummaryBar';

TutorialSelectionSummaryBar.propTypes = {
  subjectCode: PropTypes.string.isRequired,
  onEdit: PropTypes.func.isRequired,
  onAddToCart: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default TutorialSelectionSummaryBar;
