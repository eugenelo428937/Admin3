import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  IconButton,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TutorialDetailCard from './TutorialDetailCard';
import { useTutorialChoice } from '../../../../contexts/TutorialChoiceContext';
import { touchIconButtonStyle, responsiveGridSpacing } from './tutorialStyles';

/**
 * TutorialSelectionDialog - Container component for tutorial event selection
 * with responsive grid layout and context integration.
 *
 * Contract: Manages tutorial choice selection through TutorialChoiceContext
 * Optimized: Memoized to prevent unnecessary re-renders when parent re-renders
 */
const TutorialSelectionDialog = React.memo(({ open, onClose, product, events }) => {
  const { subjectCode, subjectName, location } = product;
  const { addTutorialChoice, getSubjectChoices } = useTutorialChoice();

  // Get current draft choices for this subject
  const subjectChoices = getSubjectChoices(subjectCode);

  /**
   * Determine which choice level (1st, 2nd, 3rd) is selected for a given event
   * @param {number|string} eventId - The event ID to check
   * @returns {string|null} The choice level ('1st', '2nd', '3rd') or null if not selected
   */
  const getSelectedChoiceLevel = (eventId) => {
    for (const [choiceLevel, choiceData] of Object.entries(subjectChoices)) {
      if (choiceData.isDraft && choiceData.eventId === eventId) {
        return choiceLevel;
      }
    }
    return null;
  };

  /**
   * Handle choice selection from TutorialDetailCard and save to context
   * Adds subject metadata and marks as draft (isDraft: true)
   * @param {string} choiceLevel - The choice level ('1st', '2nd', or '3rd')
   * @param {Object} eventData - The event data from TutorialDetailCard
   */
  const handleSelectChoice = (choiceLevel, eventData) => {
    addTutorialChoice(subjectCode, choiceLevel, {
      ...eventData,
      subjectCode,
      subjectName,
      location,
      isDraft: true,
    });
  };

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
          <span>{subjectName} Tutorials - {location}</span>
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
              <Grid
                item
                key={event.eventId}
                xs={12}
                md={6}
                lg={4}
              >
                <TutorialDetailCard
                  event={event}
                  variation={event.variation || {
                    variationId: event.variationId,
                    variationName: event.variationName || 'Standard Tutorial',
                    prices: event.prices || [],
                  }}
                  selectedChoiceLevel={selectedChoiceLevel}
                  onSelectChoice={handleSelectChoice}
                  subjectCode={subjectCode}
                />
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>
    </Dialog>
  );
});

TutorialSelectionDialog.displayName = 'TutorialSelectionDialog';

TutorialSelectionDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  product: PropTypes.shape({
    subjectCode: PropTypes.string.isRequired,
    subjectName: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
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
