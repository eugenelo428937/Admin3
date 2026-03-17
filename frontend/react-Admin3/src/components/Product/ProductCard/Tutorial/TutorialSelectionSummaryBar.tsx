import React from 'react';
import {
  Grid,
  Paper,
  IconButton,
  Typography,
  Box,
  Drawer,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { ShoppingCartCheckout as CartCheck } from '@mui/icons-material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import DeleteIcon from '@mui/icons-material/Delete';
import useTutorialSelectionSummaryBarVM from './useTutorialSelectionSummaryBarVM';
import { touchButtonStyle, touchIconButtonStyle } from './tutorialStyles';
import type { TutorialSummaryBarProps } from '../../../../types/browse';

/**
 * TutorialSelectionSummaryBar - Persistent summary bar for tutorial choices
 * with expand/collapse states and action buttons.
 *
 * Contract: Displays at bottom center, expands with draft choices, collapses when carted
 * Optimized: Memoized to prevent unnecessary re-renders
 */
const TutorialSelectionSummaryBar = React.memo(
  ({ subjectCode, onEdit, onAddToCart, onRemove }: TutorialSummaryBarProps) => {
    const vm = useTutorialSelectionSummaryBarVM(subjectCode);

    if (!vm.hasAnyChoices) {
      return null;
    }

    // T015: Render expanded content (shared between Drawer and Paper)
    const renderExpandedContent = () => (
      <Grid container>
        {/* Title Row - Full Width */}
        <Grid
          size={12}
          container
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}>
          {/* Subject Title */}
          <Typography variant="h6" color="inherit" align="left">
            {subjectCode} Tutorial Choices
          </Typography>
          {/* Collapse Button */}
          <IconButton
            aria-label="Collapse"
            color="inherit"
            onClick={vm.handleCollapse}
            sx={touchIconButtonStyle}>
            <CloseIcon />
          </IconButton>
        </Grid>

        {/* Choice Details Row */}
        <Grid size={12}>
          <Box sx={{ textAlign: 'start' }}>
            {vm.choiceDetails.map((choice) => (
              <Box key={choice.level} sx={{ textAlign: 'start' }}>
                <Box>
                  <Typography
                    variant="body2"
                    color="inherit">
                    {choice.level} - {choice.eventCode} ({choice.location})
                  </Typography>
                </Box>

                {!choice.isDraft && (
                  <Box className="d-flex flex-row flex-wrap align-items-center">
                    <CartCheck className="m-right__xs" />
                    <Typography
                      variant="caption"
                      color="inherit"
                      className="p-top__xs">
                      Added in Cart
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Grid>

        {/* Action Buttons Row */}
        <Grid
          size={12}
          container
          direction="row"
          sx={{
            mt: 2,
            justifyContent: 'space-between',
            width: '100%',
          }}>
          {/* Edit Button */}
          <IconButton
            color="inherit"
            onClick={onEdit}
            aria-label="Edit tutorial choices"
            sx={touchIconButtonStyle}>
            <EditIcon />
          </IconButton>

          {/* Add to Cart Button */}
          <IconButton
            color="inherit"
            onClick={onAddToCart}
            aria-label="Add tutorial choices to cart"
            sx={touchIconButtonStyle}>
            <AddShoppingCartIcon />
          </IconButton>

          {/* Remove Button */}
          <IconButton
            color="inherit"
            onClick={onRemove}
            aria-label="Remove tutorial choices"
            sx={touchIconButtonStyle}>
            <DeleteIcon />
          </IconButton>
        </Grid>
      </Grid>
    );

    // Collapsed view: single line with title and expand icon
    if (vm.isCollapsed) {
      return (
        <Paper
          elevation={6}
          role="alert"
          onClick={vm.handleExpand}
          sx={{
            backgroundColor: 'rgba(99, 50, 185, 0.965)',
            color: 'common.white',
            width: '100%',
            maxWidth: { xs: '100%', md: '24rem' },
            px: 3,
            py: 1.5,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'rgba(99, 50, 185, 0.85)',
            },
          }}>
          <Typography variant="h6" color="inherit">
            {subjectCode} Tutorial Choices
          </Typography>
          <IconButton
            aria-label="Expand"
            color="inherit"
            size="small"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              vm.handleExpand();
            }}
            sx={touchIconButtonStyle}>
            <ExpandMoreIcon />
          </IconButton>
        </Paper>
      );
    }

    // T015: Mobile expanded view - Bottom Sheet Drawer
    if (vm.isMobile) {
      return (
        <Drawer
          anchor="bottom"
          open={!vm.isCollapsed}
          onClose={vm.handleCollapse}
          sx={{
            '& .MuiDrawer-paper': {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '50vh',
              backgroundColor: 'rgba(99, 50, 185, 0.965)',
              color: '#fff',
              px: 3,
              py: 2,
            }
          }}>
          {renderExpandedContent()}
        </Drawer>
      );
    }

    // Desktop expanded view: Paper (existing behavior)
    return (
      <Paper
        elevation={6}
        role="alert"
        sx={{
          backgroundColor: 'rgba(99, 50, 185, 0.965)',
          color: 'common.white',
          width: '100%',
          maxWidth: { xs: '100%', md: '24rem' },
          px: 3,
          py: 2,
          display: 'flex',
          flexDirection: { xs: 'column' },
          alignItems: { xs: 'flex-start' },
          justifyContent: 'space-between',
          gap: 2,
        }}>
        {renderExpandedContent()}
      </Paper>
    );
  }
);

TutorialSelectionSummaryBar.displayName = 'TutorialSelectionSummaryBar';

export default TutorialSelectionSummaryBar;
