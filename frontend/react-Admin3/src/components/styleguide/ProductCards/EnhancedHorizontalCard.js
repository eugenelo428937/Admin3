import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip
} from '@mui/material';
import {
  RuleOutlined
} from '@mui/icons-material';

// Enhanced Horizontal Card Component
const EnhancedHorizontalCard = () => {
  return (
    <Card elevation={2} sx={{ display: 'flex', height: 120 }}>
      <Box
        sx={{
          width: 100,
          bgcolor: 'var(--mui-palette-product-marking)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <RuleOutlined sx={{ fontSize: 24 }} />
        <Typography variant="caption" sx={{ color: 'white', opacity: 0.9 }}>
          MARKING
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <CardContent sx={{ flex: 1, p: 2, pb: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Actuarial Marking
          </Typography>
          <Box display="flex" gap={0.5} mb={1}>
            <Chip label="CS1" size="small" color="primary" />
            <Chip label="Available" size="small" color="success" />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Professional feedback service
          </Typography>
        </CardContent>
        <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
          <Typography variant="h6" color="primary.main">
            £150
          </Typography>
          <Button variant="outlined" size="small">
            Select
          </Button>
        </CardActions>
      </Box>
    </Card>
  );
};

export default EnhancedHorizontalCard;