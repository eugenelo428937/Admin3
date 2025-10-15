/**
 * CartItemWithVAT Component (Phase 4, Task T042)
 *
 * Displays a cart item with VAT calculations:
 * - Product name and image
 * - Quantity controls (increase/decrease)
 * - Remove button
 * - Unit price
 * - VAT display using CartVATDisplay component
 * - Loading state for VAT calculation
 *
 * Props:
 * - item (object): Cart item with product, quantity, price, and VAT data
 * - onQuantityChange (function): Callback for quantity changes
 * - onRemove (function): Callback for item removal
 * - className (string): Optional custom CSS class
 */
import React from 'react';
import {
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  ButtonGroup,
  Button
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import CartVATDisplay from './CartVATDisplay';

const CartItemWithVAT = ({
  item,
  onQuantityChange,
  onRemove,
  className = ''
}) => {
  const { id, product, quantity, actualPrice, vat, vatCalculating } = item;

  /**
   * Handle quantity increase
   */
  const handleIncrease = () => {
    onQuantityChange(id, quantity + 1);
  };

  /**
   * Handle quantity decrease
   */
  const handleDecrease = () => {
    if (quantity > 1) {
      onQuantityChange(id, quantity - 1);
    }
  };

  /**
   * Handle item removal
   */
  const handleRemove = () => {
    onRemove(id);
  };

  /**
   * Format currency (simplified for unit price display)
   */
  const formatCurrency = (amount, currency = 'GBP') => {
    if (amount == null) return '-';
    const rounded = Math.round(amount * 100) / 100;
    const formatted = rounded.toFixed(2);

    switch (currency) {
      case 'USD':
        return `$${formatted}`;
      case 'ZAR':
        return `R${formatted}`;
      case 'EUR':
        return `€${formatted}`;
      case 'GBP':
      default:
        return `£${formatted}`;
    }
  };

  return (
    <ListItem
      className={className}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 2,
        gap: 2
      }}
    >
      {/* Product Info Row */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Product Image */}
        <ListItemAvatar>
          <Avatar
            src={product?.image}
            alt={product?.name}
            variant="rounded"
            sx={{ width: 60, height: 60 }}
          />
        </ListItemAvatar>

        {/* Product Name and Unit Price */}
        <Box sx={{ flex: 1 }}>
          <ListItemText
            primary={product?.name}
            secondary={`Unit Price: ${formatCurrency(actualPrice)}`}
            primaryTypographyProps={{ variant: 'h6', gutterBottom: true }}
            secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
          />

          {/* Quantity Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Quantity:
            </Typography>
            <ButtonGroup size="small" variant="outlined">
              <Button
                onClick={handleDecrease}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <RemoveIcon fontSize="small" />
              </Button>
              <Button disabled sx={{ minWidth: 50 }}>
                <input
                  type="text"
                  value={quantity}
                  readOnly
                  style={{
                    border: 'none',
                    background: 'transparent',
                    width: '30px',
                    textAlign: 'center',
                    fontSize: '14px'
                  }}
                />
              </Button>
              <Button
                onClick={handleIncrease}
                aria-label="Increase quantity"
              >
                <AddIcon fontSize="small" />
              </Button>
            </ButtonGroup>
          </Box>
        </Box>

        {/* Remove Button */}
        <IconButton
          onClick={handleRemove}
          color="error"
          aria-label="Remove item"
          sx={{ alignSelf: 'flex-start' }}
        >
          <DeleteIcon />
        </IconButton>
      </Box>

      {/* VAT Display or Loading State */}
      <Box sx={{ pl: 9 }}>
        {vatCalculating ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Calculating VAT...
            </Typography>
          </Box>
        ) : vat ? (
          <CartVATDisplay
            netAmount={vat.netAmount}
            vatAmount={vat.vatAmount}
            grossAmount={vat.grossAmount}
            vatRate={vat.vatRate}
            vatRegion={vat.vatRegion}
            currency={vat.currency || 'GBP'}
          />
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            VAT pending calculation
          </Typography>
        )}
      </Box>
    </ListItem>
  );
};

CartItemWithVAT.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.number.isRequired,
    product: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string.isRequired,
      image: PropTypes.string
    }).isRequired,
    quantity: PropTypes.number.isRequired,
    actualPrice: PropTypes.number.isRequired,
    vat: PropTypes.shape({
      netAmount: PropTypes.number.isRequired,
      vatAmount: PropTypes.number.isRequired,
      grossAmount: PropTypes.number.isRequired,
      vatRate: PropTypes.number.isRequired,
      vatRegion: PropTypes.string,
      currency: PropTypes.string
    }),
    vatCalculating: PropTypes.bool
  }).isRequired,
  onQuantityChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  className: PropTypes.string
};

export default CartItemWithVAT;
