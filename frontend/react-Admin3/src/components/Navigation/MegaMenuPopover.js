import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, Popover, Box, Typography, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

/**
 * Reusable mega-menu popover component with full accessibility support.
 * Handles open/close state, ARIA attributes, and keyboard navigation.
 */
const MegaMenuPopover = ({
  id,
  label,
  children,
  width = 800,
  onOpen,
  onClose,
  buttonProps = {},
  popoverProps = {},
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const buttonRef = useRef(null);
  const theme = useTheme();
  const open = Boolean(anchorEl);
  const popoverId = `${id}-popover`;

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    onOpen?.();
  };

  const handleClose = () => {
    setAnchorEl(null);
    onClose?.();
    // Return focus to button when closing
    setTimeout(() => buttonRef.current?.focus(), 0);
  };

  return (
    <>
      <Button
        ref={buttonRef}
        id={`${id}-button`}
        aria-controls={open ? popoverId : undefined}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleOpen}
        endIcon={<ExpandMoreIcon />}
        sx={{
          color: theme.palette.offwhite?.['000'] || 'inherit',
          textTransform: 'none',
          ...buttonProps.sx,
        }}
        {...buttonProps}
      >
        <Typography variant="navlink">
          {label}
        </Typography>
      </Button>
      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        disableRestoreFocus={false}
        slotProps={{
          paper: {
            sx: {
              maxWidth: width,
              mt: 1,
            },
          },
        }}
        {...popoverProps}
      >
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      </Popover>
    </>
  );
};

MegaMenuPopover.propTypes = {
  /** Unique identifier for the menu (used for ARIA) */
  id: PropTypes.string.isRequired,
  /** Button label text */
  label: PropTypes.string.isRequired,
  /** Menu content */
  children: PropTypes.node.isRequired,
  /** Maximum width of the popover */
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  /** Callback when menu opens */
  onOpen: PropTypes.func,
  /** Callback when menu closes */
  onClose: PropTypes.func,
  /** Additional props for the Button component */
  buttonProps: PropTypes.object,
  /** Additional props for the Popover component */
  popoverProps: PropTypes.object,
};

export default MegaMenuPopover;
