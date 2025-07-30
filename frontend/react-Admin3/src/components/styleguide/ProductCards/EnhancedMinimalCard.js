import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack
} from '@mui/material';

// Enhanced Minimal Card Component
const EnhancedMinimalCard = () => {
  const [selected, setSelected] = useState(false);

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: selected ? '2px solid' : '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        '&:hover': {
          boxShadow: 2,
          borderColor: 'primary.main'
        }
      }}
      onClick={() => setSelected(!selected)}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'var(--mui-palette-product-online)'
              }}
            />
            <Typography variant="caption" color="text.secondary">
              ONLINE
            </Typography>
          </Stack>
          {selected && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'success.main'
              }}
            />
          )}
        </Stack>
        <Typography variant="subtitle2">
          Mock Exams
        </Typography>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" color="primary.main">
            £75
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Digital only
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default EnhancedMinimalCard;