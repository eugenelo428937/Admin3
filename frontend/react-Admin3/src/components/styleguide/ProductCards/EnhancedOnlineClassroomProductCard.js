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
  Badge,
  Divider,
  Stack,
  Avatar,
  Radio,
  RadioGroup,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import {
  Computer,
  AddShoppingCart,
  Star,
  AccessTime,
  CalendarMonthOutlined,
  PlayCircleOutline,
  VideoLibrary
} from '@mui/icons-material';

const EnhancedOnlineClassroomProductCard = () => {
  const [selectedFormat, setSelectedFormat] = useState('live');

  const formatOptions = {
    live: { price: 249, label: 'Live Sessions', description: 'Interactive online classes' },
    recorded: { price: 199, label: 'Recorded Only', description: 'Access to recordings' },
    both: { price: 299, label: 'Live + Recorded', description: 'Complete package' }
  };

  const handleFormatChange = (event) => {
    setSelectedFormat(event.target.value);
  };

  return (
    <Card elevation={2} sx={{ maxWidth: 340, height: 'fit-content' }}>
      <Badge 
        badgeContent="Digital" 
        color="info" 
        sx={{
          '& .MuiBadge-badge': {
            top: 12,
            right: 12,
            fontSize: '0.75rem',
            height: 20,
            minWidth: 20
          }
        }}
      >
        <CardHeader
          avatar={
            <Avatar
              sx={{ 
                bgcolor: 'var(--mui-palette-product-online)',
                color: 'white',
                width: 48,
                height: 48
              }}
            >
              <Computer />
            </Avatar>
          }
          title="CP1 Online Classroom"
          subheader="Core Principles • Digital"
          titleTypographyProps={{ variant: 'h6', fontSize: '1.1rem' }}
          subheaderTypographyProps={{ variant: 'caption' }}
          sx={{ pb: 1 }}
        />
      </Badge>
      
      <CardContent sx={{ pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Flexible online learning with live interactive sessions and comprehensive recorded content library.
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <CalendarMonthOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption">Starts March 1, 2025</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Star sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="caption">4.7 (89 reviews)</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption">12 weeks • 2hrs/week</Typography>
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Access Options
        </Typography>

        <RadioGroup value={selectedFormat} onChange={handleFormatChange}>
          <Stack spacing={1}>
            {Object.entries(formatOptions).map(([key, option]) => (
              <Box key={key} sx={{ 
                border: 1, 
                borderColor: selectedFormat === key ? 'primary.main' : 'divider',
                borderRadius: 1,
                p: 1.5,
                backgroundColor: selectedFormat === key ? 'primary.50' : 'transparent',
                transition: 'all 0.2s ease'
              }}>
                <FormControlLabel
                  value={key}
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ width: '100%' }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={selectedFormat === key ? 600 : 400}>
                          {option.label}
                        </Typography>
                        <Typography variant="body2" color="primary.main" fontWeight={600}>
                          £{option.price}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {option.description}
                      </Typography>
                    </Box>
                  }
                  sx={{ mx: 0, width: '100%' }}
                />
              </Box>
            ))}
          </Stack>
        </RadioGroup>

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Chip 
            icon={<PlayCircleOutline sx={{ fontSize: 16 }} />}
            label="Live Sessions" 
            size="small" 
            variant="outlined"
            color={selectedFormat !== 'recorded' ? 'primary' : 'default'}
          />
          <Chip 
            icon={<VideoLibrary sx={{ fontSize: 16 }} />}
            label="Recordings" 
            size="small" 
            variant="outlined"
            color={selectedFormat !== 'live' ? 'primary' : 'default'}
          />
        </Box>
      </CardContent>
      
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button 
          variant="contained" 
          startIcon={<AddShoppingCart />}
          fullWidth
          sx={{
            backgroundColor: 'var(--mui-palette-product-online)',
            '&:hover': {
              backgroundColor: 'var(--mui-palette-product-online)',
              filter: 'brightness(0.9)'
            }
          }}
        >
          Enroll Now - £{formatOptions[selectedFormat].price}
        </Button>
      </CardActions>
    </Card>
  );
};

export default EnhancedOnlineClassroomProductCard;