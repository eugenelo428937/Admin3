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
import { formatVatLabel, getBaseVatRate, getRegionDisplayName } from '../../../utils/vatUtils';

const CartSummaryPanel = ({
  cartItems = [],
  vatCalculations,
  paymentMethod = 'card'
}) => {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));

  // Default: collapsed on md or smaller, expanded on lg+
  const [isExpanded, setIsExpanded] = useState(isLargeScreen);
  // VAT breakdown collapsed by default
  const [isVatBreakdownExpanded, setIsVatBreakdownExpanded] = useState(false);

  // Update expansion state when screen size changes
  useEffect(() => {
    setIsExpanded(isLargeScreen);
  }, [isLargeScreen]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleVatBreakdownToggle = () => {
    setIsVatBreakdownExpanded(!isVatBreakdownExpanded);
  };

  // Get region from vatCalculations
  const region = vatCalculations?.region_info?.region || 'UNKNOWN';
  const baseVatRate = getBaseVatRate(region);

  // Get per-item VAT calculations
  const itemVatCalculations = vatCalculations?.vat_calculations || [];

  // Check if any items have different VAT rates (mixed VAT scenario)
  const hasMixedVatRates = itemVatCalculations.length > 0 &&
    itemVatCalculations.some(item => {
      const itemRate = parseFloat(item.vat_rate || 0);
      return Math.abs(itemRate - baseVatRate) > 0.001; // Allow for floating point tolerance
    });

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
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center">
                  <Typography variant="body2">
                    {formatVatLabel(baseVatRate)}
                    {region !== 'UNKNOWN' && (
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                        ({getRegionDisplayName(region)})
                      </Typography>
                    )}
                  </Typography>
                </Box>
                <Typography variant="body2">£{vatCalculations.totals.total_vat.toFixed(2)}</Typography>
              </Box>

              {/* VAT Breakdown Toggle - only show if there are per-item calculations */}
              {itemVatCalculations.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Box
                    display="flex"
                    alignItems="center"
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      borderRadius: 1,
                      py: 0.5,
                      px: 1,
                      mx: -1
                    }}
                    onClick={handleVatBreakdownToggle}
                  >
                    <Typography variant="caption" color="primary" sx={{ flexGrow: 1 }}>
                      {hasMixedVatRates ? 'View VAT breakdown (mixed rates)' : 'View VAT breakdown'}
                    </Typography>
                    <IconButton size="small" sx={{ p: 0 }}>
                      {isVatBreakdownExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </IconButton>
                  </Box>

                  {/* VAT Breakdown Details */}
                  <Collapse in={isVatBreakdownExpanded} timeout="auto">
                    <Box sx={{
                      mt: 1,
                      p: 1.5,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <Typography variant="caption" fontWeight="bold" sx={{ mb: 1, display: 'block' }}>
                        VAT per Product:
                      </Typography>
                      <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, fontSize: '0.75rem' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell align="right">Net</TableCell>
                            <TableCell align="center">Rate</TableCell>
                            <TableCell align="right">VAT</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {itemVatCalculations.map((vatItem, index) => {
                            // Find the matching cart item for product name
                            const cartItem = cartItems.find(ci => String(ci.id) === String(vatItem.id));
                            const productName = cartItem?.product_name || vatItem.product_type || `Item ${index + 1}`;
                            const vatRate = parseFloat(vatItem.vat_rate || 0);
                            const netAmount = parseFloat(vatItem.net_amount || 0);
                            const vatAmount = parseFloat(vatItem.vat_amount || 0);
                            const appliedRule = vatItem.applied_rule;

                            // Format rule name for display (e.g., calculate_vat_uk_digital_product -> UK Digital Product)
                            const formatRuleName = (rule) => {
                              if (!rule) return null;
                              return rule
                                .replace('calculate_vat_', '')
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, c => c.toUpperCase());
                            };

                            return (
                              <TableRow key={vatItem.id || index}>
                                <TableCell>
                                  <Typography variant="caption" noWrap sx={{ maxWidth: 100, display: 'block' }}>
                                    {productName}
                                  </Typography>
                                  {vatItem.product_type && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>
                                      {vatItem.product_type}
                                    </Typography>
                                  )}
                                  {appliedRule && (
                                    <Typography variant="caption" color="info.main" sx={{ fontSize: '0.6rem', display: 'block', fontStyle: 'italic' }}>
                                      Rule: {formatRuleName(appliedRule)}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right">
                                  £{netAmount.toFixed(2)}
                                </TableCell>
                                <TableCell align="center">
                                  <Typography
                                    variant="caption"
                                    color={Math.abs(vatRate - baseVatRate) > 0.001 ? 'warning.main' : 'text.secondary'}
                                    fontWeight={Math.abs(vatRate - baseVatRate) > 0.001 ? 'bold' : 'normal'}
                                  >
                                    {(vatRate * 100).toFixed(0)}%
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  £{vatAmount.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      {hasMixedVatRates && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                          * Some products have different VAT rates (e.g., zero-rated printed materials)
                        </Typography>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              )}

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
