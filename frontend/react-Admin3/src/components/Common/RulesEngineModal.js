import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Pagination,
  Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoIcon from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/**
 * Generic modal component for displaying rules engine messages
 * Supports single or multiple messages with Material-UI pagination
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Array|Object} props.messages - Single message object or array of message objects
 * @param {string} props.closeButtonText - Text for the close button (default: "I Understand")
 * @param {boolean} props.backdrop - Whether clicking backdrop closes modal (default: "static")
 * @param {boolean} props.disableEscapeKeyDown - Whether ESC key closes modal (default: true)
 * @param {Function} props.onPageChange - Optional callback when page changes
 */
const RulesEngineModal = ({
  open = false,
  onClose,
  messages = [],
  closeButtonText = "I Understand",
  backdrop = "static",
  disableEscapeKeyDown = true,
  onPageChange = null,
  maxWidth = "sm",
  fullWidth = true
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [messageArray, setMessageArray] = useState([]);

  // Normalize messages to always be an array
  useEffect(() => {
    if (!messages) {
      setMessageArray([]);
    } else if (Array.isArray(messages)) {
      setMessageArray(messages);
    } else {
      setMessageArray([messages]);
    }
    setCurrentPage(1); // Reset to first page when messages change
  }, [messages]);

  // Ensure body overflow is properly restored when modal closes
  // Material-UI's ModalManager tracks overflow state, but rapid open/close can cause sync issues
  // This ensures overflow is restored after MUI's cleanup completes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        // Check if overflow is still 'hidden' after modal close
        const currentOverflow = document.body.style.overflow;
        if (currentOverflow === 'hidden') {
          // Restore to default (visible auto) using combined overflow property
          // This works with MUI's restoration mechanism better than separate overflow-x/y
          document.body.style.overflow = 'visible auto';
        }
        // Remove any lingering MUI modal classes
        document.body.classList.remove('mui-fixed');
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [open]);

  // Get icon based on message type or variant
  const getMessageIcon = (message) => {
    const variant = message?.variant || message?.content?.variant || 'info';
    const iconProps = { sx: { mr: 1, fontSize: 24 } };

    switch (variant) {
      case 'warning':
      case 'alert':
        return <WarningAmberIcon color="warning" {...iconProps} />;
      case 'error':
        return <ErrorIcon color="error" {...iconProps} />;
      case 'success':
        return <CheckCircleIcon color="success" {...iconProps} />;
      case 'info':
      default:
        return <InfoIcon color="info" {...iconProps} />;
    }
  };

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    if (onPageChange) {
      onPageChange(value);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // Don't render if no messages
  if (messageArray.length === 0) {
    return null;
  }

  const isSingleMessage = messageArray.length === 1;
  const currentMessage = messageArray[currentPage - 1];

  // Extract content from the message
  const getMessageContent = (message) => {
    if (!message) return { title: '', body: '', details: [] };

    const content = message.content || message;
    return {
      title: content.title || content.heading || '',
      body: content.message || content.body || content.text || '',
      details: content.details || content.items || []
    };
  };

  const currentContent = getMessageContent(currentMessage);

  // Determine the main modal title
  const getModalTitle = () => {
    if (isSingleMessage) {
      // For single message, use the message's title
      return currentContent.title || 'Important Notice';
    } else {
      // For multiple messages, use "Important Notice" as main title
      return 'Important Notice';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={backdrop !== "static" ? handleClose : undefined}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      disableEscapeKeyDown={disableEscapeKeyDown}
      aria-labelledby="rules-engine-modal-title"
      aria-describedby="rules-engine-modal-description"
    >
      <DialogTitle id="rules-engine-modal-title">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            {currentMessage && getMessageIcon(currentMessage)}
            <Typography variant="h6" component="div">
              {getModalTitle()}
            </Typography>
          </Box>
          {backdrop !== "static" && (
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={{ ml: 2 }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* For multiple messages, show the current message's title as a subtitle */}
        {!isSingleMessage && currentContent.title && (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
              {currentContent.title}
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </>
        )}

        {/* Main message body */}
        {currentContent.body && (
          <Typography
            variant="body1"
            paragraph
            id="rules-engine-modal-description"
            sx={{ whiteSpace: 'pre-wrap' }}
          >
            {currentContent.body}
          </Typography>
        )}

        {/* Additional details if present */}
        {currentContent.details && currentContent.details.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              {currentContent.details.map((detail, index) => (
                <li key={index}>
                  <Typography variant="body2">
                    {detail}
                  </Typography>
                </li>
              ))}
            </ul>
          </Box>
        )}

        {/* Pagination controls for multiple messages */}
        {!isSingleMessage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={messageArray.length}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
              size="medium"
              siblingCount={1}
              boundaryCount={1}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          variant="contained"
          color="primary"
          data-testid="rules-engine-modal-close"
        >
          {closeButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RulesEngineModal;