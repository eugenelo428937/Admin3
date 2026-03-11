import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Paper, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import sessionSetupService from '../../../services/sessionSetupService.js';
import SessionProductsSummary from './SessionProductsSummary.js';
import SessionBundlesSummary from './SessionBundlesSummary.js';

const StepMaterials = ({ sessionId, sessionCode, onComplete }) => {
  const [previousSession, setPreviousSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(true);

  useEffect(() => {
    const fetchPrevious = async () => {
      try {
        const prev = await sessionSetupService.getPreviousSession(sessionId);
        setPreviousSession(prev);
      } catch (err) {
        setError('Failed to load previous session');
      } finally {
        setLoading(false);
      }
    };
    fetchPrevious();
  }, [sessionId]);

  const handleProceed = async () => {
    if (!previousSession) return;

    setCopying(true);
    setError(null);

    try {
      const copyResult = await sessionSetupService.copyProducts(
        sessionId,
        previousSession.id
      );
      setResult(copyResult);
      setDialogOpen(false);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        'Copy operation failed. You may retry.';
      setError(message);
    } finally {
      setCopying(false);
    }
  };

  const handleSetupLater = () => {
    setDialogOpen(false);
    onComplete();
  };

  const handleContinue = () => {
    onComplete();
  };

  if (loading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Step 3: Materials & Marking
      </Typography>

      {/* Copy Dialog */}
      <Dialog open={dialogOpen} maxWidth="sm" fullWidth>
        <DialogTitle>
          {previousSession
            ? `Copy from ${previousSession.session_code}`
            : 'No Previous Session'}
        </DialogTitle>
        <DialogContent>
          {previousSession ? (
            <Typography>
              Copy products, prices, and create bundles from session{' '}
              <strong>{previousSession.session_code}</strong> to the new
              session?
            </Typography>
          ) : (
            <Typography>
              No previous session found. You can set up materials manually
              later.
            </Typography>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSetupLater} disabled={copying}>
            Set up later
          </Button>
          {previousSession && (
            <Button
              variant="contained"
              onClick={handleProceed}
              disabled={copying}
            >
              {copying ? 'Copying...' : 'Proceed'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Success Summary */}
      {result && (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            {result.message}
          </Alert>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Products created: <strong>{result.products_created}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Prices created: <strong>{result.prices_created}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Bundles created: <strong>{result.bundles_created}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Bundle products created:{' '}
            <strong>{result.bundle_products_created}</strong>
          </Typography>
          {result.skipped_subjects?.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Skipped subjects: {result.skipped_subjects.join(', ')}
            </Typography>
          )}

          {/* Products and Bundles created for this session */}
          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Products Created
          </Typography>
          <SessionProductsSummary sessionId={sessionId} />

          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Bundles Created
          </Typography>
          <SessionBundlesSummary sessionId={sessionId} />

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={handleContinue}>
              Continue
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default StepMaterials;
