import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  Box,
  IconButton,
  Collapse,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { generateProductCode } from '../../../utils/productCodeGenerator';
import { formatVatLabel } from '../../../utils/vatUtils';

const CartSummaryPanel = ({
  cartItems = [],
  vatCalculations,
  paymentMethod = 'card'
}) => {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));

  // Default: collapsed on md or smaller, expanded on lg+
  const [isExpanded, setIsExpanded] = useState(isLargeScreen);

  // Update expansion state when screen size changes
  useEffect(() => {
    setIsExpanded(isLargeScreen);
  }, [isLargeScreen]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card sx={{ height: 'fit-content', width: '100%' }}>
      <CardHeader
        title={
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="h2">
              Order Summary
            </Typography>
            {/* Collapse button - only visible and enabled on md or smaller */}
            {!isLargeScreen && (
              <IconButton
                onClick={handleToggle}
                aria-label={isExpanded ? 'collapse cart summary' : 'expand cart summary'}
                size="small"
              >
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
          </Box>
        }
        sx={{ pb: 0 }}
      />
      <CardContent>
        {/* Always show item count */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
        </Typography>

        {/* Collapsible content */}
        <Collapse in={isExpanded} timeout="auto">
          {/* Cart Items Table */}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell align="center">Qty</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cartItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {item.product_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.subject_code} • {item.variation_name}
                    </Typography>
                    <br />
                    <Typography variant="caption" component="code">
                      {generateProductCode(item)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{item.quantity}</TableCell>
                  <TableCell align="right">
                    £{(parseFloat(item.actual_price) * item.quantity).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Order Summary */}
          {vatCalculations && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Subtotal:</Typography>
                <Typography variant="body2">£{vatCalculations.totals.subtotal.toFixed(2)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">
                  {formatVatLabel(vatCalculations.totals.effective_vat_rate)}:
                </Typography>
                <Typography variant="body2">£{vatCalculations.totals.total_vat.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6" fontWeight="bold">Total:</Typography>
                <Typography variant="h6" fontWeight="bold">£{vatCalculations.totals.total_gross.toFixed(2)}</Typography>
              </Box>
            </Box>
          )}
        </Collapse>

        {/* Collapsed view - show total only */}
        {!isExpanded && vatCalculations && (
          <Box sx={{ mt: 2 }}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="h6" fontWeight="bold">Total:</Typography>
              <Typography variant="h6" fontWeight="bold">
                £{(
                  paymentMethod === 'card'
                    ? vatCalculations.totals.total_gross
                    : vatCalculations.totals.total_gross - vatCalculations.totals.total_fees
                ).toFixed(2)}
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CartSummaryPanel;
