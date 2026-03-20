import React from 'react';
import { formatPrice } from '../../../utils/priceFormatter';
import {
  Button,
  Chip,
  CardHeader,
  CardContent,
  CardActions,
  FormControlLabel,
  Typography,
  Box,
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
  Avatar,
  Stack,
  Radio,
  RadioGroup,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Backdrop,
} from '@mui/material';
import {
  InfoOutline,
  AddShoppingCart,
  LibraryBooksSharp,
  FolderCopyOutlined,
  TipsAndUpdatesOutlined,
  Close,
} from '@mui/icons-material';
import { ThemeProvider } from '@mui/material/styles';
import BaseProductCard from '../../Common/BaseProductCard.js';
import MarkingProductCard from './MarkingProductCard';
import MarkingVoucherProductCard from './MarkingVoucherProductCard';
import TutorialProductCard from './Tutorial/TutorialProductCard';
import OnlineClassroomProductCard from './OnlineClassroomProductCard';
import BundleCard from './BundleCard';
import useMaterialProductCardVM from './useMaterialProductCardVM';
import type { BrowseProduct, MarkingDeadline } from '../../../types/browse';

// ─── Props ───────────────────────────────────────────────────

interface MaterialProductCardProps {
  product: BrowseProduct;
  onAddToCart?: (product: BrowseProduct | any, priceInfo: any) => void;
  allEsspIds?: number[];
  bulkDeadlines?: Record<number | string, MarkingDeadline[]>;
}

// ─── Component ───────────────────────────────────────────────

const MaterialProductCard = React.memo<MaterialProductCardProps>(
  ({ product, onAddToCart, allEsspIds, bulkDeadlines }) => {
    const vm = useMaterialProductCardVM(product, onAddToCart, allEsspIds, bulkDeadlines);

    const {
      producttypeCheck,
      selectedVariation,
      showPriceModal,
      setShowPriceModal,
      selectedPriceType,
      isHovered,
      speedDialOpen,
      setSpeedDialOpen,
      variationInfo,
      theme,
      cardRef,
      getPriceAmount,
      hasPriceType,
      getDisplayPrice,
      getPriceLevelText,
      handleMouseEnter,
      handleMouseLeave,
      handlePriceTypeChange,
      handleVariationChange,
      handleAddToCart,
      handleBuyBothEbook,
      handleBuyWithRecommended,
    } = vm;

    const {
      isTutorial,
      isMarking,
      isMarkingVoucher,
      isOnlineClassroom,
      isBundle,
    } = producttypeCheck;

    const { hasVariations, currentVariation } = variationInfo;

    // ─── Delegation to specialized cards ─────────────────────

    // For Tutorial products, use the specialized component
    if (isTutorial && !isOnlineClassroom) {
      return (
        <TutorialProductCard
          subjectCode={product.subject_code}
          subjectName={(product as any).subject_name || product.product_name}
          location={product.shortname || product.product_name}
          productId={product.essp_id || product.id || (product as any).product_id}
          product={product}
          variations={product.variations}
          onAddToCart={onAddToCart}
        />
      );
    }

    // For Marking Voucher products, use the specialized component
    if (isMarkingVoucher) {
      return <MarkingVoucherProductCard voucher={product} />;
    }

    // For Markings products, use the specialized component
    if (isMarking) {
      return (
        <MarkingProductCard
          product={product}
          onAddToCart={onAddToCart}
          allEsspIds={allEsspIds}
          bulkDeadlines={bulkDeadlines}
        />
      );
    }

    // For Online Classroom products, use the specialized component
    if (isOnlineClassroom) {
      return (
        <OnlineClassroomProductCard
          product={product}
          onAddToCart={onAddToCart}
        />
      );
    }

    // For Bundle products, use the specialized component
    if (isBundle) {
      return <BundleCard bundle={product} onAddToCart={onAddToCart} />;
    }

    // ─── Price Modal ─────────────────────────────────────────

    const renderPriceModal = () => (
      <Dialog
        open={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Price Information</DialogTitle>
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
                <TableCell>Variation</TableCell>
                <TableCell>Price Type</TableCell>
                <TableCell align="right">Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {product.variations &&
                product.variations.map(
                  (variation) =>
                    variation.prices &&
                    variation.prices.map((price) => {
                      return (
                        <TableRow
                          key={`${variation.id}-${price.price_type}`}
                        >
                          <TableCell>{variation.name}</TableCell>
                          <TableCell>{price.price_type}</TableCell>
                          <TableCell align="right">
                            {formatPrice(price.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    }),
                )}
            </TableBody>
          </Table>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {product.vat_status_display ||
                'VAT calculated at checkout based on your location'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPriceModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    );

    // ─── Regular Content ─────────────────────────────────────

    const renderRegularContent = () => (
      <>
        <CardContent>
          {/* Enhanced Variations Section - Better hierarchy */}
          <Box className="product-variations">
            <Typography variant="subtitle1" className="variations-title">
              Product Variations
            </Typography>

            {hasVariations && (
              <RadioGroup
                value={selectedVariation}
                onChange={handleVariationChange}
                className="variations-group"
              >
                <Stack spacing={1}>
                  {product.variations!.map((variation) => {
                    const standardPrice = variation.prices?.find(
                      (p) => p.price_type === 'standard',
                    );
                    return (
                      <Box
                        key={variation.id}
                        className="variation-option"
                        sx={{
                          borderColor:
                            selectedVariation === variation.id.toString()
                              ? 'primary.main'
                              : 'divider',
                          backgroundColor:
                            selectedVariation === variation.id.toString()
                              ? 'primary.50'
                              : 'transparent',
                          transform:
                            selectedVariation === variation.id.toString()
                              ? 'scale(1.01)'
                              : 'scale(1)',
                        }}
                      >
                        <FormControlLabel
                          value={variation.id.toString()}
                          control={<Radio size="small" />}
                          label={
                            <Typography
                              variant="body2"
                              className="variation-label"
                              fontWeight={
                                selectedVariation === variation.id.toString()
                                  ? 600
                                  : 400
                              }
                            >
                              {variation.name}
                            </Typography>
                          }
                          className="variation-control"
                        />
                        {standardPrice && (
                          <Typography
                            variant="body2"
                            color="primary.main"
                            className="variation-price"
                            fontWeight={600}
                          >
                            {formatPrice(standardPrice.amount)}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </RadioGroup>
            )}
          </Box>
        </CardContent>
        <CardActions>
          <Box className="price-container">
            {/* Left Column - Discount Options */}
            <Box className="discount-options">
              <Typography variant="subtitle2" className="discount-title">
                Discount Options
              </Typography>
              <Box className="discount-radio-group">
                <FormControlLabel
                  className="discount-radio-option"
                  control={
                    <Radio
                      checked={selectedPriceType === 'retaker'}
                      onClick={() => handlePriceTypeChange('retaker')}
                      size="small"
                      disabled={!hasPriceType(currentVariation, 'retaker')}
                    />
                  }
                  label={
                    <Typography
                      variant="subtitle2"
                      className="discount-label"
                    >
                      Retaker
                    </Typography>
                  }
                />
                <FormControlLabel
                  className="discount-radio-option"
                  control={
                    <Radio
                      checked={selectedPriceType === 'additional'}
                      onClick={() => handlePriceTypeChange('additional')}
                      size="small"
                      disabled={
                        !hasPriceType(currentVariation, 'additional')
                      }
                    />
                  }
                  label={
                    <Typography
                      variant="subtitle2"
                      className="discount-label"
                    >
                      Additional Copy
                    </Typography>
                  }
                />
              </Box>
            </Box>

            {/* Right Column - Price & Action Section */}
            <Box className="price-action-section">
              {/* Price and Info Button Row */}
              <Box className="price-info-row">
                <Typography variant="price" className="price-display">
                  {getDisplayPrice()}
                </Typography>
                <Tooltip title="Show price details">
                  <Button
                    size="small"
                    className="info-button"
                    onClick={() => setShowPriceModal(true)}
                  >
                    <InfoOutline />
                  </Button>
                </Tooltip>
              </Box>

              {/* Status Text */}
              <Box className="price-details-row">
                <Typography
                  variant="caption"
                  className="price-level-text"
                >
                  {getPriceLevelText()}
                </Typography>
                <Typography
                  variant="subtitle2"
                  className="vat-status-text"
                  color="text.secondary"
                >
                  {product.vat_status_display || 'Price includes VAT'}
                </Typography>
              </Box>

              {/* Three-tier conditional: buy_both -> recommended_product -> standard button */}
              {product.buy_both &&
              product.variations &&
              product.variations.length > 1 ? (
                // Tier 1: Buy Both SpeedDial (takes precedence)
                <>
                  <Backdrop
                    open={speedDialOpen}
                    onClick={() => setSpeedDialOpen(false)}
                    sx={{
                      position: 'fixed',
                      zIndex: (t: any) => t.zIndex.speedDial - 1,
                    }}
                  />
                  <SpeedDial
                    variant={'product-card-speeddial' as any}
                    ariaLabel="Speed Dial for add to cart"
                    className="add-to-cart-speed-dial"
                    icon={
                      <SpeedDialIcon
                        icon={<AddShoppingCart />}
                        openIcon={<Close />}
                      />
                    }
                    onClose={() => setSpeedDialOpen(false)}
                    onOpen={() => setSpeedDialOpen(true)}
                    open={speedDialOpen}
                    direction="up"
                    sx={{
                      position: 'absolute',
                      bottom: 10,
                      right: 5,
                      '& .MuiFab-root': {
                        backgroundColor:
                          (theme.palette as any).productCards?.material?.button,
                        '&:hover': {
                          backgroundColor:
                            (theme.palette as any).productCards?.material?.buttonHover,
                        },
                        '& .MuiSpeedDialIcon-root': {
                          '& .MuiSvgIcon-root': {
                            fontSize: '1.6rem',
                          },
                        },
                      },
                    }}
                  >
                    {/* Add to Cart - Current Selected Variation */}
                    <SpeedDialAction
                      icon={<AddShoppingCart />}
                      slotProps={{
                        tooltip: {
                          open: true,
                          title: {
                            ...(
                              <Typography variant="subtitle1">
                                {'Add to Cart'}
                              </Typography>
                            ),
                          },
                        },
                      } as any}
                      sx={{
                        '& .MuiSpeedDialAction-staticTooltipLabel': {
                          whiteSpace: 'nowrap',
                          maxWidth: 'none',
                          minHeight: (theme as any).spacingTokens?.xl?.[1],
                          alignContent: 'center',
                        },
                        '& .MuiSpeedDialAction-fab': {
                          backgroundColor:
                            (theme.palette as any).productCards?.material?.button,
                          boxShadow: 'var(--Paper-shadow)',
                          '&:hover': {
                            backgroundColor:
                              (theme.palette as any).productCards?.material?.buttonHover,
                          },
                        },
                      }}
                      aria-label="Add to cart"
                      onClick={handleAddToCart}
                    />

                    {/* Buy Both action */}
                    <SpeedDialAction
                      icon={<FolderCopyOutlined />}
                      slotProps={{
                        tooltip: {
                          open: true,
                          title: {
                            ...(
                              <>
                                <Typography variant="subtitle1">
                                  {'Buy Both'}
                                </Typography>
                                <Typography variant="subtitle1">
                                  {'Printed + eBook'}
                                </Typography>
                              </>
                            ),
                          },
                        },
                      } as any}
                      sx={{
                        '& .MuiSpeedDialAction-staticTooltipLabel': {
                          whiteSpace: 'nowrap',
                          maxWidth: 'none',
                          minHeight: (theme as any).spacingTokens?.xl?.[1],
                          alignContent: 'center',
                        },
                        '& .MuiSpeedDialAction-fab': {
                          backgroundColor:
                            (theme.palette as any).productCards?.material?.button,
                          '&:hover': {
                            backgroundColor:
                              (theme.palette as any).productCards?.material?.buttonHover,
                          },
                        },
                      }}
                      aria-label="Buy Both (Printed + eBook)"
                      onClick={handleBuyBothEbook}
                    />
                  </SpeedDial>
                </>
              ) : currentVariation?.recommended_product ? (
                // Tier 2: Recommended Product SpeedDial
                <>
                  <Backdrop
                    open={speedDialOpen}
                    onClick={() => setSpeedDialOpen(false)}
                    sx={{
                      position: 'fixed',
                      zIndex: (t: any) => t.zIndex.speedDial - 1,
                    }}
                  />
                  <SpeedDial
                    ariaLabel="Speed Dial for add to cart"
                    className="add-to-cart-speed-dial"
                    variant={'product-card-speeddial' as any}
                    icon={
                      <SpeedDialIcon
                        icon={<AddShoppingCart />}
                        openIcon={<Close />}
                      />
                    }
                    onClose={() => setSpeedDialOpen(false)}
                    onOpen={() => setSpeedDialOpen(true)}
                    open={speedDialOpen}
                    direction="up"
                    sx={{
                      position: 'absolute',
                      bottom: 10,
                      right: 5,
                      '& .MuiFab-root': {
                        backgroundColor:
                          (theme.palette as any).productCards?.material?.button,
                        boxShadow: 'var(--Paper-shadow)',
                        '&:hover': {
                          backgroundColor:
                            (theme.palette as any).productCards?.material?.buttonHover,
                        },
                        '& .MuiSpeedDialIcon-root': {
                          '& .MuiSvgIcon-root': {
                            fontSize: '1.6rem',
                          },
                        },
                      },
                    }}
                  >
                    {/* Add to Cart - Current Variation Only */}
                    <SpeedDialAction
                      icon={<AddShoppingCart />}
                      slotProps={{
                        tooltip: {
                          open: true,
                          title: {
                            ...(
                              <Typography variant="subtitle1">
                                {'Add to Cart'}
                              </Typography>
                            ),
                          },
                        },
                      } as any}
                      sx={{
                        '& .MuiSpeedDialAction-staticTooltipLabel': {
                          whiteSpace: 'nowrap',
                          maxWidth: 'none',
                          minHeight: (theme as any).spacingTokens?.xl?.[1],
                          alignContent: 'center',
                        },
                        '& .MuiSpeedDialAction-fab': {
                          backgroundColor:
                            (theme.palette as any).productCards?.material?.button,
                          '&:hover': {
                            backgroundColor:
                              (theme.palette as any).productCards?.material?.buttonHover,
                          },
                        },
                      }}
                      aria-label="Add to cart"
                      onClick={handleAddToCart}
                    />

                    {/* Buy with Recommended action */}
                    <SpeedDialAction
                      icon={<TipsAndUpdatesOutlined />}
                      slotProps={{
                        tooltip: {
                          open: true,
                          title: (() => {
                            const recommendedProduct =
                              currentVariation!.recommended_product!;
                            const standardPrice =
                              recommendedProduct.prices?.find(
                                (p) => p.price_type === 'standard',
                              );
                            return `Buy with ${recommendedProduct.product_short_name} (${
                              standardPrice
                                ? formatPrice(standardPrice.amount)
                                : '-'
                            })`;
                          })(),
                        },
                      } as any}
                      sx={{
                        '& .MuiSpeedDialAction-staticTooltipLabel': {
                          whiteSpace: 'normal',
                          textWrap: 'balance',
                          minWidth: '200px',
                          minHeight: (theme as any).spacingTokens?.xl?.[1],
                          alignContent: 'center',
                        },
                        '& .MuiSpeedDialAction-fab': {
                          backgroundColor:
                            (theme.palette as any).productCards?.material?.button,
                          '&:hover': {
                            backgroundColor:
                              (theme.palette as any).productCards?.material?.buttonHover,
                          },
                        },
                      }}
                      aria-label="Buy with Recommended"
                      onClick={handleBuyWithRecommended}
                    />
                  </SpeedDial>
                </>
              ) : (
                // Tier 3: Standard Add to Cart button (fallback)
                <Button
                  variant="contained"
                  className="add-to-cart-button"
                  aria-label="Add to cart"
                  onClick={handleAddToCart}
                  disabled={!currentVariation}
                >
                  <AddShoppingCart />
                </Button>
              )}
            </Box>
          </Box>
        </CardActions>
      </>
    );

    // ─── Main Render ─────────────────────────────────────────

    return (
      <ThemeProvider theme={theme}>
        <BaseProductCard
          ref={cardRef}
          elevation={2}
          variant="product"
          producttype="material"
          className="d-flex flex-column"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          sx={{
            transform: isHovered ? 'scale(1.02)' : 'scale(1)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Floating Badges */}
          <Box className="floating-badges-container">
            <Chip
              label={
                <Typography variant="chip">
                  {product.subject_code}
                </Typography>
              }
              size="small"
              className="subject-badge"
              role="img"
              aria-label={`Subject: ${product.subject_code}`}
            />
            {(product.exam_session_code ||
              product.session_code ||
              product.exam_session ||
              product.session) && (
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
                aria-label={`Exam session: ${
                  product.exam_session_code ||
                  product.session_code ||
                  product.exam_session ||
                  product.session
                }`}
              />
            )}
          </Box>
          {/* Enhanced Header */}
          <CardHeader
            className="product-header"
            title={
              <Typography
                variant="productTitle"
                textAlign="left"
                className="product-title"
              >
                {product.product_name}
              </Typography>
            }
            subheader={
              <Typography
                variant="subtitle1"
                textAlign="left"
                className="product-subtitle"
              >
                {/* Removed exam session code from subheader */}
              </Typography>
            }
            avatar={
              <Avatar className="product-avatar">
                <LibraryBooksSharp className="product-avatar-icon" />
              </Avatar>
            }
          />

          {renderRegularContent()}
          {renderPriceModal()}
        </BaseProductCard>{' '}
      </ThemeProvider>
    );
  },
  // Custom comparison function for better memoization
  (prevProps, nextProps) => {
    // Only re-render if product data actually changes
    // Note: bulkDeadlines and allEsspIds must be compared to allow
    // MarkingProductCard to receive updated deadline data after async fetch
    return (
      prevProps.product?.id === nextProps.product?.id &&
      prevProps.product?.essp_id === nextProps.product?.essp_id &&
      prevProps.product?.variations === nextProps.product?.variations &&
      (prevProps.product as any)?.prices === (nextProps.product as any)?.prices &&
      prevProps.onAddToCart === nextProps.onAddToCart &&
      prevProps.bulkDeadlines === nextProps.bulkDeadlines &&
      prevProps.allEsspIds === nextProps.allEsspIds
    );
  },
);

MaterialProductCard.displayName = 'MaterialProductCard';

export default MaterialProductCard;
