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
  Collapse,
  Tooltip
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
  Assessment,
  InfoOutline
} from '@mui/icons-material';

const EnhancedBundleProductCard = ({ variant = "bundle-product", ...props }) => {
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
    <Card elevation={2} variant={variant} className="d-flex flex-column" {...props}>
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
          className="product-header"
          title={
            <Typography
              variant="h4"
              textAlign="left"
              className="product-title">
              CP1 Complete Bundle
            </Typography>
          }
          subheader={
            <Typography
              variant="subtitle1"
              textAlign="left"
              className="product-subtitle">
              Core Principles • All Formats
            </Typography>
          }
          avatar={
            <Avatar className="product-avatar">
              <Inventory2 className="product-avatar-icon" />
            </Avatar>
          }
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

        <Box className="product-variations">
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

        <Box className="product-chips">
          <Chip label="Complete Package" variant="filled" color="primary" />
          <Chip label="Best Value" variant="filled" color="secondary" />
        </Box>
      </CardContent>
      
      <CardActions>
        <Box className="price-container">
          <Box className="price-action-section">
            <Box className="price-info">
              <Typography variant="h3" className="price-display">
                £{bundlePrice}
              </Typography>
              <Tooltip title="Show price details">
                <Button size="small" className="info-button">
                  <InfoOutline />
                </Button>
              </Tooltip>
            </Box>
            <Button variant="contained" className="add-to-cart-button">
              <AddShoppingCart />
            </Button>
          </Box>
        </Box>
        <Typography variant="caption" className="status-text">
          Save £{savings} with this bundle • Price includes VAT
        </Typography>
      </CardActions>
    </Card>
  );
};

export default EnhancedBundleProductCard;