import React from 'react';
import { formatPrice } from '../../../utils/priceFormatter';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Box,
  Stack,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import {
  InfoOutline,
  AddShoppingCart,
  Computer,
} from '@mui/icons-material';
import useOnlineClassroomProductCardVM from './useOnlineClassroomProductCardVM';
import type { BrowseProduct } from '../../../types/browse';

// ─── Props ───────────────────────────────────────────────────

interface OnlineClassroomProductCardProps {
  product: BrowseProduct;
  onAddToCart?: (product: BrowseProduct, priceInfo: any) => void;
  variant?: string;
  producttype?: string;
  [key: string]: any;
}

// ─── Component ───────────────────────────────────────────────

const OnlineClassroomProductCard = React.memo<OnlineClassroomProductCardProps>(
  ({ product, onAddToCart, variant = 'product', producttype = 'online-classroom', ...props }) => {
    const vm = useOnlineClassroomProductCardVM(product, onAddToCart);

    const renderPriceModal = () => (
      <Dialog
        open={vm.showPriceModal}
        onClose={() => vm.setShowPriceModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Price Information</Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Subject: {product.subject_code}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Product Name: {product.product_name}
            </Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Format</TableCell>
                <TableCell>Price Type</TableCell>
                <TableCell align="right">Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {product.variations?.map((variation) => (
                <React.Fragment key={variation.id}>
                  {variation.prices?.map((price) => {
                    return (
                      <TableRow key={`${variation.id}-${price.price_type}`}>
                        <TableCell>{variation.name}</TableCell>
                        <TableCell>{price.price_type}</TableCell>
                        <TableCell align="right">
                          {formatPrice(price.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {product.vat_status_display || 'VAT calculated at checkout based on your location'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => vm.setShowPriceModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    );

    return (
      <Card
        elevation={2}
        variant={variant}
        producttype={producttype}
        onMouseEnter={vm.handleMouseEnter}
        onMouseLeave={vm.handleMouseLeave}
        sx={{
          transform: vm.isHovered ? 'scale(1.02)' : 'scale(1)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
        className="d-flex flex-column"
        {...props}
      >
        {/* Floating Badges */}
        <Box className="floating-badges-container">
          <Chip
            label={<Typography variant="chip">{product.subject_code}</Typography>}
            size="small"
            className="subject-badge"
            role="img"
            aria-label={`Subject: ${product.subject_code || 'CP1'}`}
          />
          <Chip
            label={
              <Typography variant="chip">
                {product.exam_session_code ||
                  product.session_code ||
                  product.exam_session ||
                  product.session}
              </Typography>
            }
            size="small"
            className="session-badge"
            role="img"
            aria-label="Exam session: 25S"
          />
        </Box>

        <CardHeader
          className="product-header"
          title={
            <Typography
              variant="h4"
              textAlign="left"
              className="product-title"
            >
              {product.subject_code} Online Classroom
            </Typography>
          }
          avatar={
            <Avatar className="product-avatar">
              <Computer className="product-avatar-icon" />
            </Avatar>
          }
        />

        <CardContent
          sx={{
            alignSelf: 'flex-start',
            width: '100%',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          }}
        >
          <Box className="product-variations">
            <Typography variant="subtitle2" className="variations-title">
              Access Options
            </Typography>

            <RadioGroup
              value={vm.selectedVariation}
              onChange={vm.handleVariationChange}
              className="variations-group"
              sx={{ margin: 0 }}
            >
              <Stack spacing={1} sx={{ margin: 0 }}>
                {product.variations?.map((variation) => {
                  const standardPrice = variation.prices?.find(
                    (p) => p.price_type === 'standard',
                  );
                  return (
                    <Box key={variation.id} className="variation-option" sx={{ margin: 0 }}>
                      <FormControlLabel
                        value={variation.id.toString()}
                        control={<Radio size="small" />}
                        sx={{ margin: 0 }}
                        label={
                          <Box className="variation-label">
                            <Box
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Typography
                                variant="body2"
                                fontWeight={
                                  vm.selectedVariation === variation.id.toString() ? 600 : 400
                                }
                              >
                                {variation.name}
                              </Typography>
                              {standardPrice && (
                                <Typography
                                  variant="body2"
                                  color="primary.main"
                                  fontWeight={600}
                                >
                                  {'\u00A3'}{standardPrice.amount}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        }
                        className="variation-control"
                      />
                    </Box>
                  );
                })}
              </Stack>
            </RadioGroup>
          </Box>
        </CardContent>

        <CardActions sx={{ width: '100%', margin: 0, padding: 2 }}>
          {/* Discount Options Section - matches theme structure */}
          <Box className="price-container">
            <Box className="discount-options">
              <Typography variant="subtitle2" className="discount-title">
                Discount Options
              </Typography>
              <Box className="discount-radio-group">
                <FormControlLabel
                  className="discount-radio-option"
                  control={
                    <Radio
                      checked={vm.selectedPriceType === 'retaker'}
                      onClick={() =>
                        vm.setSelectedPriceType(
                          vm.selectedPriceType === 'retaker' ? '' : 'retaker',
                        )
                      }
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="subtitle2" className="discount-label">
                      Retaker
                    </Typography>
                  }
                />
                <FormControlLabel
                  className="discount-radio-option"
                  control={
                    <Radio
                      checked={vm.selectedPriceType === 'additional'}
                      onClick={() =>
                        vm.setSelectedPriceType(
                          vm.selectedPriceType === 'additional' ? '' : 'additional',
                        )
                      }
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="subtitle2" className="discount-label">
                      Additional Copy
                    </Typography>
                  }
                />
              </Box>
            </Box>
            {/* Price & Action Section - matches theme structure */}
            <Box className="price-action-section">
              <Box className="price-info-row">
                <Typography variant="price" className="price-display">
                  {vm.displayPrice}
                </Typography>
                <Tooltip title="Show price details">
                  <Button size="small" className="info-button">
                    <InfoOutline />
                  </Button>
                </Tooltip>
              </Box>
              <Box className="price-details-row">
                <Typography
                  variant="fineprint"
                  className="price-level-text"
                  color="text.secondary"
                >
                  {vm.priceLevelText}
                </Typography>
                <Typography
                  variant="fineprint"
                  className="vat-status-text"
                  color="text.secondary"
                >
                  {product.vat_status_display || 'Price includes VAT'}
                </Typography>
              </Box>
              <Button
                variant="contained"
                className="add-to-cart-button"
                onClick={vm.handleAddToCart}
                disabled={!vm.currentVariation}
              >
                <AddShoppingCart />
              </Button>
            </Box>
          </Box>
        </CardActions>
        {renderPriceModal()}
      </Card>
    );
  },
);

OnlineClassroomProductCard.displayName = 'OnlineClassroomProductCard';

export default OnlineClassroomProductCard;
