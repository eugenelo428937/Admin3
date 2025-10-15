/**
 * CartVATError Component (Phase 4, Task T043)
 *
 * Displays VAT calculation error with retry functionality:
 * - Error message from API
 * - "Recalculate VAT" button
 * - Loading state during retry
 * - Optional dismiss button
 *
 * Props:
 * - error (boolean): Whether error exists
 * - errorMessage (string): Error message to display
 * - onRetry (function): Callback for retry button
 * - onDismiss (function): Optional callback for dismiss button
 * - className (string): Optional custom CSS class
 */
import React, { useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Box
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ErrorOutline as ErrorOutlineIcon
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const CartVATError = ({
  error,
  errorMessage,
  onRetry,
  onDismiss,
  className = ''
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState(null);

  // Don't render if no error
  if (!error) {
    return null;
  }

  /**
   * Handle retry button click
   */
  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryError(null);

    try {
      await onRetry();
      // Success - error will be cleared by parent component
    } catch (err) {
      // Handle retry failure
      setRetryError('Failed to recalculate VAT. Please try again.');
    } finally {
      setIsRetrying(false);
    }
  };

  /**
   * Handle dismiss button click
   */
  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  // Use provided error message or default
  const displayMessage = errorMessage || 'VAT calculation error. Please try recalculating.';

  return (
    <Alert
      severity="error"
      icon={<ErrorOutlineIcon />}
      className={className}
      onClose={onDismiss ? handleDismiss : undefined}
      sx={{ mb: 2 }}
    >
      <Box>
        {/* Error Message */}
        <Box sx={{ mb: 1 }}>
          {displayMessage}
        </Box>

        {/* Retry Error (if any) */}
        {retryError && (
          <Box sx={{ mb: 1, color: 'error.dark', fontSize: '0.875rem' }}>
            {retryError}
          </Box>
        )}

        {/* Retry Button */}
        <Button
          variant="outlined"
          size="small"
          color="error"
          onClick={handleRetry}
          disabled={isRetrying}
          startIcon={
            isRetrying ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <RefreshIcon />
            )
          }
          sx={{ mt: 1 }}
        >
          {isRetrying ? 'Calculating...' : 'Recalculate VAT'}
        </Button>
      </Box>
    </Alert>
  );
};

CartVATError.propTypes = {
  error: PropTypes.bool,
  errorMessage: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  onDismiss: PropTypes.func,
  className: PropTypes.string
};

CartVATError.defaultProps = {
  error: false,
  errorMessage: null,
  onDismiss: null,
  className: ''
};

export default CartVATError;
