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
  Checkbox,
  FormControlLabel,
  Divider,
  Link
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoIcon from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PolicyIcon from '@mui/icons-material/Policy';
import DownloadIcon from '@mui/icons-material/Download';
import type { RulesEngineAcknowledgmentModalProps, RawRulesMessage } from '../../types/rulesEngine';

/**
 * Rules Engine Acknowledgment Modal Component
 *
 * Displays rules engine messages that require user acknowledgment with a checkbox.
 * Supports Terms & Conditions, warnings, and other acknowledgment types.
 */
const RulesEngineAcknowledgmentModal: React.FC<RulesEngineAcknowledgmentModalProps> = ({
  open = false,
  onClose,
  onAcknowledge,
  message = null,
  messages = null,
  entryPointLocation = 'unknown',
  required = true,
  blocking = true
}) => {
  const [acknowledgments, setAcknowledgments] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Support both single message and multiple messages
  const messagesList: RawRulesMessage[] = messages || (message ? [message] : []);

  // Ensure body overflow is properly restored when modal closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        const currentOverflow = document.body.style.overflow;
        if (currentOverflow === 'hidden') {
          document.body.style.overflow = 'visible auto';
        }
        document.body.classList.remove('mui-fixed');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Reset acknowledgment state when modal opens/closes or messages change
  useEffect(() => {
    if (open && messagesList.length > 0) {
      const initialAcknowledgments: Record<number, boolean> = {};
      messagesList.forEach((_msg, index) => {
        initialAcknowledgments[index] = false;
      });
      setAcknowledgments(initialAcknowledgments);
      setSubmitting(false);
    }
  }, [open, messagesList.length]);

  // Get icon based on message type or variant
  const getMessageIcon = (msg: RawRulesMessage): React.ReactNode => {
    const variant = msg?.variant || msg?.content?.variant || msg?.message_type || 'info';
    const iconProps = { sx: { mr: 1, fontSize: 24 } };

    switch (variant) {
      case 'warning':
      case 'alert':
        return <WarningAmberIcon color="warning" {...iconProps} />;
      case 'error':
        return <ErrorIcon color="error" {...iconProps} />;
      case 'success':
        return <CheckCircleIcon color="success" {...iconProps} />;
      case 'terms':
        return <PolicyIcon color="primary" {...iconProps} />;
      case 'digital':
      case 'digital_consent':
        return <DownloadIcon color="primary" {...iconProps} />;
      case 'info':
      default:
        return <InfoIcon color="info" {...iconProps} />;
    }
  };

  const handleClose = (): void => {
    // Only allow closing if not required or if all messages are acknowledged
    const allAcknowledged = messagesList.every((_, index) => acknowledgments[index]);
    if (!required || allAcknowledged || !blocking) {
      if (onClose) {
        onClose();
      }
    }
  };

  const handleCheckboxChange = (messageIndex: number) => (event: React.ChangeEvent<HTMLInputElement>): void => {
    const isChecked = event.target.checked;
    setAcknowledgments(prev => ({
      ...prev,
      [messageIndex]: isChecked
    }));
  };

  const handleAcknowledgeAll = async (): Promise<void> => {
    setSubmitting(true);
    try {
      // Submit acknowledgment for each message
      for (const [index, msg] of messagesList.entries()) {
        // DEBUG: Log message structure to understand what's being passed
        console.log('🔍 [AcknowledgmentModal] Message structure:', {
          index,
          msg,
          template_id: msg.template_id,
          ack_key: msg.ack_key,
          hasAckKey: !!msg.ack_key
        });

        if (acknowledgments[index] && onAcknowledge) {
          console.log('✅ [AcknowledgmentModal] Submitting acknowledgment:', {
            template_id: msg.template_id,
            ack_key: msg.ack_key
          });
          await onAcknowledge(true, msg.template_id, msg.ack_key);
        }
      }
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error submitting acknowledgments:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const allAcknowledged = messagesList.length > 0 && messagesList.every((_, index) => acknowledgments[index]);

  // Don't render if no messages
  if (messagesList.length === 0) {
    return null;
  }

  // Determine if close button should be shown
  const showCloseButton = !blocking || !required;

  return (
    <Dialog
      open={open}
      onClose={showCloseButton ? handleClose : undefined}
      maxWidth="md"
      fullWidth={true}
      disableEscapeKeyDown={blocking}
      aria-labelledby="acknowledgment-modal-title"
      aria-describedby="acknowledgment-modal-description"
    >
      <DialogTitle id="acknowledgment-modal-title">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <Typography variant="h6" component="div">
              {messagesList.length === 1 ? 'Acknowledgment Required' : 'Multiple Acknowledgments Required'}
            </Typography>
          </Box>
          {showCloseButton && (
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
        {/* Display each message with its own checkbox */}
        {messagesList.map((msg, index) => {
          // Extract content from each message
          const content = msg.content || msg;
          const title = content.title || msg.title || `Acknowledgment ${index + 1}`;
          const body = content.content?.message || content.message || content.body || content.text || msg.content || '';
          const checkboxText = content.content?.checkbox_text || content.checkbox_text || 'I acknowledge and agree';
          const link = content.content?.link || content.link;

          return (
            <Box key={index} sx={{ mb: index < messagesList.length - 1 ? 3 : 0 }}>
              {/* Message header with icon */}
              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                {getMessageIcon(msg)}
                <Typography variant="h6" component="div">
                  {title}
                </Typography>
              </Box>

              {/* Message body */}
              <Typography
                variant="body1"
                paragraph
                sx={{ whiteSpace: 'pre-wrap', mb: 2, ml: 4 }}
              >
                {body}
              </Typography>

              {/* Link to external content if provided */}
              {link && (
                <Box sx={{ mb: 2, ml: 4 }}>
                  <Link
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    color="primary"
                  >
                    {link.text || 'Learn more'}
                  </Link>
                </Box>
              )}

              {/* Acknowledgment checkbox */}
              <Box sx={{ ml: 4, mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={acknowledgments[index] || false}
                      onChange={handleCheckboxChange(index)}
                      color="primary"
                      data-testid={`acknowledgment-checkbox-${index}`}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {checkboxText}
                    </Typography>
                  }
                />
              </Box>

              {/* Divider between messages */}
              {index < messagesList.length - 1 && <Divider sx={{ my: 2 }} />}
            </Box>
          );
        })}

      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {/* Cancel/Skip button for non-required acknowledgments */}
        {!required && (
          <Button
            onClick={handleClose}
            color="secondary"
            disabled={submitting}
          >
            Skip
          </Button>
        )}

        {/* Acknowledge button */}
        <Button
          onClick={handleAcknowledgeAll}
          variant="contained"
          color="primary"
          disabled={submitting || (required && !allAcknowledged)}
          data-testid="acknowledge-button"
        >
          {submitting ? 'Processing...' : (required ? 'I Agree & Continue' : 'Acknowledge')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RulesEngineAcknowledgmentModal;
