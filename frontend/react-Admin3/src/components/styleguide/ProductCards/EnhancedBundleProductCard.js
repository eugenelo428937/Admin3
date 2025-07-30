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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse
} from '@mui/material';
import {
  Inventory2,
  AddShoppingCart,
  Star,
  AccessTime,
  Check,
  ExpandMore,
  ExpandLess,
  School,
  LibraryBooks,
  Computer,
  Assessment
} from '@mui/icons-material';

const EnhancedBundleProductCard = () => {
  const [showDetails, setShowDetails] = useState(false);

  const bundleItems = [
    { icon: <School sx={{ fontSize: 16 }} />, name: 'Weekend Tutorial', value: '£299' },
    { icon: <LibraryBooks sx={{ fontSize: 16 }} />, name: 'Study Materials (Print)', value: '£99' },
    { icon: <Computer sx={{ fontSize: 16 }} />, name: 'Online Classroom Access', value: '£199' },
    { icon: <Assessment sx={{ fontSize: 16 }} />, name: 'Mock Exams (3x)', value: '£75' }
  ];

  const totalValue = 672;
  const bundlePrice = 499;
  const savings = totalValue - bundlePrice;

  return (
    <Card elevation={2} sx={{ maxWidth: 340, height: 'fit-content' }}>
      <Badge 
        badgeContent="Best Value" 
        color="success" 
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
                bgcolor: 'var(--mui-palette-product-bundle)',
                color: 'white',
                width: 48,
                height: 48
              }}
            >
              <Inventory2 />
            </Avatar>
          }
          title="CP1 Complete Bundle"
          subheader="Core Principles • All Formats"
          titleTypographyProps={{ variant: 'h6', fontSize: '1.1rem' }}
          subheaderTypographyProps={{ variant: 'caption' }}
          sx={{ pb: 1 }}
        />
      </Badge>
      
      <CardContent sx={{ pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Everything you need to master CP1. Complete study package with tutorial, materials, and digital access.
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Star sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="caption">4.9 (234 reviews)</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption">Available immediately</Typography>
          </Stack>
        </Box>

        <Box sx={{ 
          bgcolor: 'success.50', 
          border: 1, 
          borderColor: 'success.light',
          borderRadius: 1, 
          p: 1.5, 
          mb: 2 
        }}>
          <Typography variant="subtitle2" color="success.dark" sx={{ mb: 1 }}>
            Save £{savings} with this bundle
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h5" color="success.dark" fontWeight={700}>
              £{bundlePrice}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                textDecoration: 'line-through',
                color: 'text.disabled'
              }}
            >
              £{totalValue}
            </Typography>
          </Box>
        </Box>

        <Button
          fullWidth
          variant="text"
          onClick={() => setShowDetails(!showDetails)}
          endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
          sx={{ mb: 1, justifyContent: 'space-between' }}
        >
          <Typography variant="subtitle2">
            What's included ({bundleItems.length} items)
          </Typography>
        </Button>

        <Collapse in={showDetails}>
          <List dense sx={{ py: 0 }}>
            {bundleItems.map((item, index) => (
              <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Check sx={{ fontSize: 16, color: 'success.main' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={item.name}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
                <Typography variant="caption" color="text.secondary">
                  {item.value}
                </Typography>
              </ListItem>
            ))}
          </List>
        </Collapse>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Chip label="Complete Package" size="small" color="primary" />
          <Chip label="Best Value" size="small" color="success" />
        </Stack>
      </CardContent>
      
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button 
          variant="contained" 
          startIcon={<AddShoppingCart />}
          fullWidth
          size="large"
          sx={{
            backgroundColor: 'var(--mui-palette-product-bundle)',
            '&:hover': {
              backgroundColor: 'var(--mui-palette-product-bundle)',
              filter: 'brightness(0.9)'
            }
          }}
        >
          Get Complete Bundle
        </Button>
      </CardActions>
    </Card>
  );
};

export default EnhancedBundleProductCard;