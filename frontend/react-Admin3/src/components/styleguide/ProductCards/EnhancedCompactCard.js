import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Button,
  Chip,
  Stack,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  LibraryBooksSharp,
  AddShoppingCart
} from '@mui/icons-material';

// Enhanced Compact Card Component
const EnhancedCompactCard = () => {
  const [selectedVariations, setSelectedVariations] = useState([]);
  const [selectedPriceType, setSelectedPriceType] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <Card 
      elevation={2} 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{ 
        maxWidth: 340, 
        height: 'fit-content',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <CardHeader
        title={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" sx={{ flex: 1 }}>
              Study Material
            </Typography>
            <Box
              sx={{
                backgroundColor: 'white',
                borderRadius: '50%',
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <LibraryBooksSharp sx={{ fontSize: 14, color: 'primary.main' }} />
            </Box>
          </Box>
        }
        sx={{ py: 1.5 }}
      />
      <CardContent sx={{ pt: 0, pb: 1 }}>
        <Box display="flex" gap={1} mb={2}>
          <Chip label="CS1" variant="filled" color="primary" size="small" />
          <Chip label="2024A" variant="filled" color="secondary" size="small" />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Product Variations
          </Typography>
          <Stack spacing={0.5}>
            <FormControlLabel
              control={<Checkbox size="small" />}
              label={<Typography variant="caption">Printed</Typography>}
              sx={{ m: 0 }}
            />
            <FormControlLabel
              control={<Checkbox size="small" />}
              label={<Typography variant="caption">eBook</Typography>}
              sx={{ m: 0 }}
            />
          </Stack>
        </Box>
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
          <Typography variant="h6" color="primary.main">
            £45.00
          </Typography>
          <Button
            variant="contained"
            size="small"
            sx={{
              borderRadius: '50%',
              minWidth: 32,
              width: 32,
              height: 32,
              p: 0,
            }}
          >
            <AddShoppingCart sx={{ fontSize: 14 }} />
          </Button>
        </Box>
      </CardActions>
    </Card>
  );
};

export default EnhancedCompactCard;