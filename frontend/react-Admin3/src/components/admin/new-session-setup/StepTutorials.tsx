import React from 'react';
import { Box, Button, Typography, Paper, Tooltip } from '@mui/material';

// ─── Interfaces ───────────────────────────────────────────────

interface StepTutorialsProps {
  onComplete: () => void;
}

// ─── Component ────────────────────────────────────────────────

const StepTutorials: React.FC<StepTutorialsProps> = ({ onComplete }) => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Step 4: Tutorials</Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Tutorial setup will be available in a future release. You can set up tutorials later from the admin panel.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Tooltip title="Coming Soon" arrow>
          <span>
            <Button variant="contained" disabled>Upload</Button>
          </span>
        </Tooltip>
        <Button variant="outlined" onClick={onComplete}>Set up later</Button>
      </Box>
    </Paper>
  );
};

export default StepTutorials;
