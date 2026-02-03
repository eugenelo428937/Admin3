import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button, Popover, Box, Typography, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

/**
 * Reusable mega-menu popover component with full accessibility support.
 * Handles open/close state, ARIA attributes, and keyboard navigation.
 * Positions the popover below the entire navigation bar.
 */
const MegaMenuPopover = ({
  id,
  label,
  children,
  width = 1440,
  onOpen,
  onClose,
  buttonProps = {},
  popoverProps = {},
  navbarSelector = '.navbar-main',
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [anchorPosition, setAnchorPosition] = useState(null);
  const buttonRef = useRef(null);
  const theme = useTheme();
  const open = Boolean(anchorEl);
  const popoverId = `${id}-popover`;

  const calculatePosition = useCallback(() => {
    const navbar = document.querySelector(navbarSelector);
    if (navbar) {
      const navbarRect = navbar.getBoundingClientRect();
      // Position below the navbar, full width from left edge
      return {
        top: navbarRect.bottom,
        left: 0,
      };
    }
    return null;
  }, [navbarSelector]);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    const position = calculatePosition();
    if (position) {
      setAnchorPosition(position);
    }
    onOpen?.();
  };

  const handleClose = () => {
    setAnchorEl(null);
    setAnchorPosition(null);
    onClose?.();
    // Return focus to button when closing
    setTimeout(() => buttonRef.current?.focus(), 0);
  };

  return (
    <>
      <Button
        ref={buttonRef}
        id={`${id}-button`}
        variant="navPrimary"
        aria-controls={open ? popoverId : undefined}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleOpen}
        endIcon={<ExpandMoreIcon sx={{
          ml: 0,          
        }}/>}
        sx={{
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
        anchorEl={anchorPosition ? undefined : anchorEl}
        anchorReference={anchorPosition ? 'anchorPosition' : 'anchorEl'}
        anchorPosition={anchorPosition}
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
        keepMounted
        marginThreshold={0}
        slotProps={{
          paper: {
            sx: {
              width: '100vw',
              maxWidth: '100vw',
              left: '0 !important',
              marginLeft: 0,
              marginRight: 0,
              borderRadius: 0,
              boxShadow: theme.shadows[8],
              backgroundColor: theme.palette.navigation.background.active,
            },
          },
        }}
        {...popoverProps}
      >
        <Box
          onClick={(e) => {
            // Close mega menu when clicking on menu items or buttons (navigation links)
            if (e.target.closest('.MuiMenuItem-root, .MuiButton-root')) {
              handleClose();
            }
          }}
          sx={{
            p: 2,
            maxWidth: width,
            pl: {
              xs: theme.spacing.lg,
              md: theme.spacing.xl,
              lg: theme.spacing.xl2,
              xl: theme.spacing.xl3,
           },
            justifyContent: 'flex-start',
          }}
        >
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
  /** CSS selector for the navbar element to position below (default: '.navbar-main') */
  navbarSelector: PropTypes.string,
};

export default MegaMenuPopover;
