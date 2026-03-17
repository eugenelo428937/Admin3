import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import useStepMaterialsVM from './useStepMaterialsVM';
import SessionProductsSummary from './SessionProductsSummary';
import SessionBundlesSummary from './SessionBundlesSummary';

interface StepMaterialsProps {
  sessionId: number | null;
  sessionCode: string;
  onComplete: () => void;
}

const StepMaterials: React.FC<StepMaterialsProps> = ({
  sessionId,
  sessionCode: _sessionCode,
  onComplete,
}) => {
  const vm = useStepMaterialsVM({ sessionId, sessionCode: _sessionCode, onComplete });

  if (vm.loading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Step 3: Materials &amp; Marking
      </Typography>

      {/* Copy Dialog */}
      <Dialog open={vm.dialogOpen} maxWidth="sm" fullWidth>
        <DialogTitle>
          {vm.previousSession
            ? `Copy from ${vm.previousSession.session_code}`
            : 'No Previous Session'}
        </DialogTitle>
        <DialogContent>
          {vm.previousSession ? (
            <Typography>
              Copy products, prices, and create bundles from session{' '}
              <strong>{vm.previousSession.session_code}</strong> to the new session?
            </Typography>
          ) : (
            <Typography>
              No previous session found. You can set up materials manually later.
            </Typography>
          )}
          {vm.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {vm.error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={vm.handleSetupLater} disabled={vm.copying}>
            Set up later
          </Button>
          {vm.previousSession && (
            <Button
              variant="contained"
              onClick={vm.handleProceed}
              disabled={vm.copying}
            >
              {vm.copying ? 'Copying...' : 'Proceed'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Success Summary */}
      {vm.result && (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            {vm.result.message}
          </Alert>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Products created: <strong>{vm.result.products_created}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Prices created: <strong>{vm.result.prices_created}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Bundles created: <strong>{vm.result.bundles_created}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Bundle products created:{' '}
            <strong>{vm.result.bundle_products_created}</strong>
          </Typography>
          {vm.result.skipped_subjects && vm.result.skipped_subjects.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Skipped subjects: {vm.result.skipped_subjects.join(', ')}
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
            <Button variant="contained" onClick={vm.handleContinue}>
              Continue
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default StepMaterials;
