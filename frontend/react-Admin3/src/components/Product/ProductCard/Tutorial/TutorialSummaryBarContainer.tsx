import React from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import TutorialSelectionSummaryBar from './TutorialSelectionSummaryBar';
import TutorialSelectionDialog from './TutorialSelectionDialog';
import useTutorialSummaryBarContainerVM from './useTutorialSummaryBarContainerVM';

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
const TutorialSummaryBarContainer: React.FC = () => {
  const vm = useTutorialSummaryBarContainerVM();

  // T003: Return null if no subjects with choices
  if (vm.subjectCodesWithChoices.length === 0) {
    return null;
  }

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
        {vm.subjectCodesWithChoices.map(subjectCode => (
          <TutorialSelectionSummaryBar
            key={subjectCode}
            subjectCode={subjectCode}
            onEdit={() => vm.handleEdit(subjectCode)}
            onAddToCart={() => vm.handleAddToCart(subjectCode)}
            onRemove={() => vm.handleRemove(subjectCode)}
          />
        ))}
      </Box>

      {/* Unified Edit Dialog showing all locations */}
      {vm.unifiedDialogData && (
        <TutorialSelectionDialog
          open={vm.unifiedDialogOpen}
          onClose={vm.closeUnifiedDialog}
          product={{
            subjectCode: vm.unifiedDialogData.subjectCode,
            location: vm.unifiedDialogData.location,
            productId: vm.unifiedDialogData.productId,
          }}
          events={vm.unifiedDialogData.events}
        />
      )}

      {/* T016: Error Snackbar for removal failures */}
      <Snackbar
        open={vm.snackbarOpen}
        autoHideDuration={6000}
        onClose={vm.handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={vm.handleSnackbarClose} severity="error" sx={{ width: '100%' }}>
          {vm.snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default TutorialSummaryBarContainer;
