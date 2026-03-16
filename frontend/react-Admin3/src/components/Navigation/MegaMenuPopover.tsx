import React, { useState, useRef, useCallback } from 'react';
import { Button, Popover, Box, Typography, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { MegaMenuPopoverProps } from '../../types/navigation';

const MegaMenuPopover: React.FC<MegaMenuPopoverProps> = ({
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
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [anchorPosition, setAnchorPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const theme = useTheme() as any;
  const open = Boolean(anchorEl);
  const popoverId = `${id}-popover`;

  const calculatePosition = useCallback(() => {
    const navbar = document.querySelector(navbarSelector);
    if (navbar) {
      const navbarRect = navbar.getBoundingClientRect();
      return {
        top: navbarRect.bottom,
        left: 0,
      };
    }
    return null;
  }, [navbarSelector]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
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
    setTimeout(() => buttonRef.current?.focus(), 0);
  };

  return (
    <>
      <Button
        ref={buttonRef}
        id={`${id}-button`}
        variant={'main_nav_link' as any}
        aria-controls={open ? popoverId : undefined}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleOpen}
        endIcon={<ExpandMoreIcon sx={{ ml: 0 }} />}
        sx={{
          ...buttonProps.sx,
        }}
        {...buttonProps}
      >
        <Typography variant={'main_nav_text' as any}>
          {label}
        </Typography>
      </Button>
      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchorPosition ? undefined : anchorEl}
        anchorReference={anchorPosition ? 'anchorPosition' : 'anchorEl'}
        anchorPosition={anchorPosition || undefined}
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
              boxShadow: theme.shadows[3],
              backgroundColor: theme.palette.navigation.background.active,
            },
          },
        }}
        {...popoverProps}
      >
        <Box
          onClick={(e: React.MouseEvent<HTMLElement>) => {
            if ((e.target as HTMLElement).closest('.MuiMenuItem-root, .MuiButton-root')) {
              handleClose();
            }
          }}
          sx={{
            p: 3,
            maxWidth: width,
            pl: {
              xs: theme.spacingTokens.lg,
              md: theme.spacingTokens.xl[1],
              lg: theme.spacingTokens.xl[2],
              xl: theme.spacingTokens.xl[3],
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

export default MegaMenuPopover;
