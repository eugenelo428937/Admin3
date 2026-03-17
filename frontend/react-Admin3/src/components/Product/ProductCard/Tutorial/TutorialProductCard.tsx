import React, { useMemo } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Avatar,
  Radio,
  FormControlLabel,
  Tooltip,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Backdrop,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  AddShoppingCart,
  School,
  CalendarMonthOutlined,
  ViewModule,
  LocationOn,
  InfoOutline,
} from '@mui/icons-material';
import { formatPrice, getVatStatusDisplay } from '../../../../utils/vatUtils';
import TutorialSelectionDialog from './TutorialSelectionDialog';
import useTutorialProductCardVM from './useTutorialProductCardVM';
import type { SpeedDialIconFactory } from './useTutorialProductCardVM';
import type { TutorialProductCardProps } from '../../../../types/browse';

/**
 * TutorialProductCard
 * Shows tutorial products for a specific subject and location
 * Uses TutorialChoiceContext for managing selections
 */
const TutorialProductCard = React.memo(
  (props: TutorialProductCardProps) => {
    const {
      subjectCode,
      subjectName,
      location,
      productId,
      product,
    } = props;

    // Create icon factory for speed dial actions (icons live in view layer)
    const iconFactory = useMemo((): SpeedDialIconFactory => ({
      addShoppingCart: <AddShoppingCart />,
      calendarWithBadge: (badgeContent: number | null) => (
        <Badge
          badgeContent={badgeContent}
          color="success"
        >
          <CalendarMonthOutlined />
        </Badge>
      ),
      viewModule: <ViewModule />,
    }), []);

    const vm = useTutorialProductCardVM(props, iconFactory);

    if (vm.loading) {
      return (
        <Card
          elevation={2}
          variant="tutorial-product"
          className="d-flex flex-column"
        >
          <CardContent
            className="d-flex justify-content-center align-items-center"
            sx={{ height: '200px' }}
          >
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
            >
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Loading tutorial options...
              </Typography>
            </Box>
          </CardContent>
        </Card>
      );
    }

    if (vm.error) {
      return (
        <Card
          elevation={2}
          variant="tutorial-product"
          className="d-flex flex-column justify-content-between"
        >
          <CardContent>
            <Alert severity="error">{vm.error}</Alert>
          </CardContent>
        </Card>
      );
    }

    // For regular tutorial products with choices/events, use the full interface
    return (
      <>
        <Card
          elevation={2}
          variant="product"
          producttype="tutorial"
          onMouseEnter={vm.handleMouseEnter}
          onMouseLeave={vm.handleMouseLeave}
          sx={{
            transform: vm.isHovered ? 'scale(1.02)' : 'scale(1)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            width: '100%',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
          className="d-flex flex-column"
        >
          {/* Floating Badges */}
          <Box className="floating-badges-container">
            <Chip
              label={
                <Typography variant="chip">
                  {product.subject_code || subjectCode}
                </Typography>
              }
              size="small"
              className="subject-badge"
              role="img"
              aria-label={`Subject: ${
                product.subject_code || subjectCode
              }`}
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
              aria-label={`Exam session: ${
                product.exam_session_code ||
                product.session_code ||
                product.exam_session ||
                product.session
              }`}
            />
            {vm.tutorialsInCartCount > 0 && (
              <Chip
                label={
                  <Typography variant="chip" sx={{
                    color: vm.theme.palette.semantic.textPrimary
                  }}>
                    {`${vm.tutorialsInCartCount} in cart`}
                  </Typography>
                }
                size="small"
                className="cart-count-badge"
                color={vm.theme.palette.success.light as any}
                role="img"
                aria-label={`${vm.tutorialsInCartCount} tutorials in cart`}
              />
            )}
          </Box>
          <CardHeader
            className="product-header"
            title={
              <Typography
                variant="productTitle"
                textAlign="left"
                className="product-title"
              >
                {location}
              </Typography>
            }
            subheader={
              <Typography
                variant="subtitle1"
                textAlign="left"
                className="product-subtitle"
              >
                {subjectCode} Tutorial
              </Typography>
            }
            avatar={
              <Avatar className="product-avatar">
                <School className="product-avatar-icon" />
              </Avatar>
            }
          />

          <CardContent>
            {/* Tutorial Information Section */}
            <Box className="tutorial-info-section">
              <Stack direction="column" className="info-row">
                <Stack
                  direction="row"
                  alignItems="center"
                  className="info-title"
                >
                  <ViewModule className="info-icon" />
                  <Typography variant="caption" className="info-text">
                    Format:
                  </Typography>
                </Stack>
                {vm.summaryInfo.distinctDescriptions.map((desc, index) => (
                  <Typography
                    key={index}
                    variant="caption"
                    className="info-sub-text"
                  >
                    {'\u2022'} {desc}
                  </Typography>
                ))}
              </Stack>

              <Stack direction="column" className="info-row">
                <Stack
                  direction="row"
                  alignItems="center"
                  className="info-title"
                >
                  <LocationOn className="info-icon" />
                  <Typography variant="caption" className="info-text">
                    Venue:
                  </Typography>
                </Stack>
                {vm.summaryInfo.distinctVenues.map((venue, index) => (
                  <Typography
                    key={index}
                    variant="caption"
                    className="info-sub-text"
                  >
                    {'\u2022'} {venue}
                  </Typography>
                ))}
              </Stack>
            </Box>

            {vm.variations.length === 0 ? (
              <Box className="text-center text-muted">
                <Typography variant="body2" color="text.secondary">
                  No tutorial variations available for this subject and
                  location.
                </Typography>
              </Box>
            ) : null}
          </CardContent>

          <CardActions>
            {/* Discount Options Section - matches theme structure */}
            <Box className="price-container">
              <Box className="discount-options">
                <Typography
                  variant="subtitle2"
                  className="discount-title"
                >
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
                            vm.selectedPriceType === 'retaker'
                              ? ''
                              : 'retaker'
                          )
                        }
                        size="small"
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
                        checked={vm.selectedPriceType === 'additional'}
                        onClick={() =>
                          vm.setSelectedPriceType(
                            vm.selectedPriceType === 'additional'
                              ? ''
                              : 'additional'
                          )
                        }
                        size="small"
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
              {/* Price & Action Section - matches theme structure */}
              <Box className="price-action-section">
                <Box className="price-info-row">
                  <Typography
                    variant="price"
                    className="price-display"
                  >
                    {vm.selectedPriceType === 'retaker' &&
                    vm.displayPrice.retaker
                      ? formatPrice(vm.displayPrice.retaker)
                      : vm.selectedPriceType === 'additional' &&
                        vm.displayPrice.additional
                      ? formatPrice(vm.displayPrice.additional)
                      : vm.displayPrice.standard
                      ? formatPrice(vm.displayPrice.standard)
                      : 'Price on selection'}
                  </Typography>
                  <Tooltip title="Show price details">
                    <Button
                      size="small"
                      className="info-button"
                      onClick={vm.handlePriceInfoOpen}
                    >
                      <InfoOutline />
                    </Button>
                  </Tooltip>
                </Box>
                <Box className="price-details-row">
                  <Typography
                    variant="caption"
                    className="price-level-text"
                    color="text.secondary"
                  >
                    {vm.selectedPriceType === 'retaker' ||
                    vm.selectedPriceType === 'additional'
                      ? 'Discount applied'
                      : 'Standard pricing'}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    className="vat-status-text"
                    color="text.secondary"
                  >
                    {product.vat_status_display ||
                      getVatStatusDisplay(product.vat_status)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardActions>

          {/* SpeedDial for Tutorial Actions */}
          {vm.variations.length > 0 && (
            <>
              <Backdrop
                open={vm.speedDialOpen}
                onClick={vm.handleSpeedDialClose}
                sx={{
                  position: 'fixed',
                  zIndex: (theme) => theme.zIndex.speedDial - 1,
                }}
              />
              <SpeedDial
                ariaLabel="Tutorial Actions"
                sx={{
                  position: 'absolute',
                  bottom: 10,
                  right: 5,

                  '& .MuiFab-root': {
                    backgroundColor: vm.theme.palette.productCards.tutorial.button,
                    '&:hover': {
                      backgroundColor: vm.theme.palette.productCards.tutorial.buttonHover,
                    },
                    '& .MuiSpeedDialIcon-root': {
                      '& .MuiSvgIcon-root': {
                        fontSize: '1.6rem',
                      },
                    },
                  },
                }}
                icon={
                  <Badge
                    badgeContent={
                      vm.tutorialsInCartCount > 0
                        ? vm.tutorialsInCartCount
                        : null
                    }
                    color="success"
                    invisible={vm.speedDialOpen}
                  >
                    <SpeedDialIcon />
                  </Badge>
                }
                direction="up"
                open={vm.speedDialOpen}
                onOpen={vm.handleSpeedDialOpen}
                onClose={(_event, _reason) => {
                  // Prevent auto-close on mouse leave or blur
                  // Only allow manual close via backdrop, escape, or action clicks
                  return;
                }}
                FabProps={{
                  onClick: () => vm.setSpeedDialOpen(!vm.speedDialOpen),
                }}
              >
                {vm.speedDialActions.map((action) => (
                  <SpeedDialAction
                    key={action.key}
                    icon={action.icon}
                    slotProps={{
                      tooltip: {
                        open: true,
                        title: action.name,
                      },
                    }}
                    sx={{
                      '& .MuiSpeedDialAction-staticTooltipLabel': {
                        whiteSpace: 'nowrap',
                        maxWidth: 'none',
                        minHeight: vm.theme.spacingTokens.xl[1],
                        alignContent: 'center',
                      },
                      '& .MuiSpeedDialAction-fab': {
                        color: 'white',
                        backgroundColor: vm.theme.palette.productCards.tutorial.button,
                        boxShadow: 'var(--Paper-shadow)',
                        '&:hover': {
                          backgroundColor: vm.theme.palette.productCards.tutorial.header,
                        },
                      },
                    }}
                    aria-label={action.name}
                    onClick={action.onClick}
                  />
                ))}
              </SpeedDial>
            </>
          )}
        </Card>

        {/* Tutorial Choice Dialog */}
        <TutorialSelectionDialog
          open={vm.isDialogOpen}
          onClose={vm.handleDialogClose}
          product={{
            subjectCode,
            location: product.shortname || location,
            productId,
          }}
          events={vm.flattenedEvents}
        />

        {/* Price Info Dialog */}
        <Dialog
          open={vm.priceInfoOpen}
          onClose={vm.handlePriceInfoClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {subjectCode} Tutorial - Price Information
          </DialogTitle>
          <DialogContent>
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Variation</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Price</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vm.uniqueVariations.map((variation) => {
                    const standardPrice = variation.prices?.find(
                      (p) => p.price_type === 'standard'
                    );
                    const retakerPrice = variation.prices?.find(
                      (p) => p.price_type === 'retaker'
                    );
                    const additionalPrice = variation.prices?.find(
                      (p) => p.price_type === 'additional'
                    );

                    return (
                      <React.Fragment key={variation.id || variation.name}>
                        <TableRow>
                          <TableCell>{variation.name}</TableCell>
                          <TableCell align="right">
                            {standardPrice
                              ? formatPrice(standardPrice.amount)
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                        {retakerPrice && (
                          <TableRow>
                            <TableCell sx={{ pl: 4 }}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Retaker Price
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {formatPrice(
                                  retakerPrice.amount
                                )}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        {additionalPrice && (
                          <TableRow>
                            <TableCell sx={{ pl: 4 }}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Additional Copy
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {formatPrice(
                                  additionalPrice.amount
                                )}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {product.vat_status_display || 'Prices include VAT'}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={vm.handlePriceInfoClose} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
);

TutorialProductCard.displayName = 'TutorialProductCard';

export default TutorialProductCard;
