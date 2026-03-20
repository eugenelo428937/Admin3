/**
 * CartVATError Component (Phase 4, Task T043)
 *
 * Displays VAT calculation error with retry functionality:
 * - Error message from API
 * - "Recalculate VAT" button
 * - Loading state during retry
 * - Optional dismiss button
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

interface CartVATErrorProps {
  error?: boolean;
  errorMessage?: string | null;
  onRetry: () => Promise<void>;
  onDismiss?: (() => void) | null;
  className?: string;
}

const CartVATError: React.FC<CartVATErrorProps> = ({
  error = false,
  errorMessage = null,
  onRetry,
  onDismiss = null,
  className = ''
}) => {
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryError, setRetryError] = useState<string | null>(null);

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

export default CartVATError;
