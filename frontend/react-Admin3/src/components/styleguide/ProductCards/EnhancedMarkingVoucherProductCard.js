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
  FormControlLabel,
  Radio,
  RadioGroup,
  Tooltip
} from '@mui/material';
import {
  ConfirmationNumberOutlined,
  AddShoppingCart,
  Star,
  AccessTime,
  InfoOutline,
  Savings,
  Timer
} from '@mui/icons-material';

const EnhancedMarkingVoucherProductCard = () => {
  const [selectedPackage, setSelectedPackage] = useState('5-pack');

  const voucherPackages = {
    '3-pack': { 
      quantity: 3, 
      price: 99, 
      pricePerVoucher: 33, 
      savings: 6,
      popular: false 
    },
    '5-pack': { 
      quantity: 5, 
      price: 150, 
      pricePerVoucher: 30, 
      savings: 25,
      popular: true 
    },
    '10-pack': { 
      quantity: 10, 
      price: 280, 
      pricePerVoucher: 28, 
      savings: 70,
      popular: false 
    }
  };

  const handlePackageChange = (event) => {
    setSelectedPackage(event.target.value);
  };

  const selectedOption = voucherPackages[selectedPackage];

  return (
    <Card elevation={2} sx={{ maxWidth: 340, height: 'fit-content' }}>
      {selectedOption.popular && (
        <Badge 
          badgeContent="Popular" 
          color="primary" 
          sx={{
            '& .MuiBadge-badge': {
              top: 12,
              right: 12,
              fontSize: '0.75rem',
              height: 20,
              minWidth: 20
            }
          }}
        />
      )}
      
      <CardHeader
        avatar={
          <Avatar
            sx={{ 
              bgcolor: 'var(--mui-palette-product-voucher)',
              color: 'white',
              width: 48,
              height: 48
            }}
          >
            <ConfirmationNumberOutlined />
          </Avatar>
        }
        title="Marking Voucher Pack"
        subheader="Pre-paid Credits • Any Subject"
        titleTypographyProps={{ variant: 'h6', fontSize: '1.1rem' }}
        subheaderTypographyProps={{ variant: 'caption' }}
        sx={{ pb: 1 }}
      />
      
      <CardContent sx={{ pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pre-purchase marking credits at discounted rates. Use anytime within 12 months across all subjects.
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Timer sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption">Valid for 12 months</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Star sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="caption">4.8 (67 reviews)</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Savings sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="caption" color="success.main">
              Save up to £{Math.max(...Object.values(voucherPackages).map(p => p.savings))}
            </Typography>
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Choose Package Size
        </Typography>

        <RadioGroup value={selectedPackage} onChange={handlePackageChange}>
          <Stack spacing={1}>
            {Object.entries(voucherPackages).map(([key, option]) => (
              <Box key={key} sx={{ 
                border: 1, 
                borderColor: selectedPackage === key ? 'primary.main' : 'divider',
                borderRadius: 1,
                p: 1.5,
                backgroundColor: selectedPackage === key ? 'primary.50' : 'transparent',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}>
                {option.popular && (
                  <Chip 
                    label="Most Popular" 
                    size="small" 
                    color="primary"
                    sx={{ 
                      position: 'absolute',
                      top: -8,
                      right: 8,
                      fontSize: '0.65rem',
                      height: 16
                    }}
                  />
                )}
                <FormControlLabel
                  value={key}
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ width: '100%' }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={selectedPackage === key ? 600 : 400}>
                          {option.quantity} Vouchers
                        </Typography>
                        <Typography variant="body2" color="primary.main" fontWeight={600}>
                          £{option.price}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          £{option.pricePerVoucher} per voucher
                        </Typography>
                        <Typography variant="caption" color="success.main">
                          Save £{option.savings}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  sx={{ mx: 0, width: '100%' }}
                />
              </Box>
            ))}
          </Stack>
        </RadioGroup>

        <Box sx={{ 
          mt: 2, 
          p: 1.5, 
          bgcolor: 'info.50', 
          borderRadius: 1,
          border: 1,
          borderColor: 'info.light'
        }}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <InfoOutline sx={{ fontSize: 16, color: 'info.main', mt: 0.2 }} />
            <Typography variant="caption" color="info.dark">
              Vouchers can be used for any subject and never expire during the 12-month validity period.
            </Typography>
          </Stack>
        </Box>
      </CardContent>
      
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button 
          variant="contained" 
          startIcon={<AddShoppingCart />}
          fullWidth
          sx={{
            backgroundColor: 'var(--mui-palette-product-voucher)',
            '&:hover': {
              backgroundColor: 'var(--mui-palette-product-voucher)',
              filter: 'brightness(0.9)'
            }
          }}
        >
          Buy {selectedOption.quantity} Vouchers - £{selectedOption.price}
        </Button>
      </CardActions>
    </Card>
  );
};

export default EnhancedMarkingVoucherProductCard;