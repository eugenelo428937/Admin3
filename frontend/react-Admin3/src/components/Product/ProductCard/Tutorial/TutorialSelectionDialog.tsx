import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Box,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import TutorialDetailCard from './TutorialDetailCard';
import useTutorialSelectionDialogVM from './useTutorialSelectionDialogVM';
import { touchIconButtonStyle, responsiveGridSpacing } from './tutorialStyles';
import type { TutorialSelectionDialogProps } from '../../../../types/browse';

/**
 * TutorialSelectionDialog - Container component for tutorial event selection
 * with responsive grid layout and context integration.
 *
 * Contract: Manages tutorial choice selection through TutorialChoiceContext
 * Optimized: Memoized to prevent unnecessary re-renders when parent re-renders
 */
const TutorialSelectionDialog = React.memo(({ open, onClose, product, events }: TutorialSelectionDialogProps) => {
  const { subjectCode, location } = product;

  const vm = useTutorialSelectionDialogVM(product, events, onClose);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby={vm.dialogTitleId}
    >
      <DialogTitle id={vm.dialogTitleId}>
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
            const selectedChoiceLevel = vm.getSelectedChoiceLevel(event.eventId);
            return (
              <Grid key={event.eventId} size={{xs:12, md:4}}>
                <TutorialDetailCard
                  event={event}
                  variation={event.variation || {
                    variationId: event.variationId || '',
                    variationName: event.variationName || 'Standard Tutorial',
                    prices: event.prices || [],
                  }}
                  selectedChoiceLevel={selectedChoiceLevel}
                  onSelectChoice={vm.handleSelectChoice}
                  onResetChoice={vm.handleResetChoice}
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
          onClick={vm.handleAddToCart}
          variant="contained"
          color="primary"
          disabled={!vm.hasDraftChoices}
          startIcon={<AddShoppingCartIcon />}
        >
          Add to Cart
        </Button>
      </DialogActions>
    </Dialog>
  );
});

TutorialSelectionDialog.displayName = 'TutorialSelectionDialog';

export default TutorialSelectionDialog;
