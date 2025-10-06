import React from 'react';
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

  // Determine which choice level (1st, 2nd, 3rd) is selected for each event
  const getSelectedChoiceLevel = (eventId) => {
    for (const [choiceLevel, choiceData] of Object.entries(subjectChoices)) {
      if (choiceData.isDraft && choiceData.eventId === eventId) {
        return choiceLevel;
      }
    }
    return null;
  };

  // Handle choice selection from TutorialDetailCard
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
            sx={{ marginLeft: 2 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
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

export default TutorialSelectionDialog;
