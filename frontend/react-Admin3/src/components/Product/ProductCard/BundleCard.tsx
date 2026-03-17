import React from "react";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Radio,
  FormControlLabel,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from "@mui/material";
import {
  InfoOutline,
  AddShoppingCart,
  CheckRounded,
  Inventory2,
} from "@mui/icons-material";
import { Inventory2Outlined as BoxSeam } from "@mui/icons-material";
import { ThemeProvider } from "@mui/material/styles";
import useBundleCardVM from "./useBundleCardVM";
import type { BundleCardProps } from "../../../types/browse";

const BundleCard = React.memo(({ bundle, onAddToCart }: BundleCardProps) => {
  const vm = useBundleCardVM(bundle, onAddToCart);

  const renderContentsModal = () => (
    <Dialog
      open={vm.showContentsModal}
      onClose={vm.handleCloseContentsModal}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box display="flex" alignItems="center">
            <BoxSeam style={{ marginRight: 8 }} />
            Bundle Contents: {bundle.bundle_name}
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        {vm.loadingContents ? (
          <Typography>Loading bundle contents...</Typography>
        ) : vm.bundleContents ? (
          <Box>
            <Box mb={2}>
              <Typography variant="body2" color="textSecondary">
                This bundle includes {vm.bundleContents.total_components}{" "}
                items:
              </Typography>
            </Box>

            {/* Price Breakdown Table */}
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ mb: 2 }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Product</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Qty</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Unit Price</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Total</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vm.bundleContents.components?.map(
                    (component, index) => {
                      const quantity = component.quantity || 1;
                      const priceType =
                        vm.selectedPriceType || "standard";
                      const unitPrice = vm.getComponentPrice(
                        component,
                        priceType
                      );
                      const totalPrice = unitPrice
                        ? unitPrice * quantity
                        : null;

                      return (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {component.product?.fullname ||
                                component.shortname ||
                                component.product_name}
                            </Typography>
                            {component.product_variation
                              ?.name && (
                              <Typography
                                variant="caption"
                                color="textSecondary"
                                display="block"
                              >
                                {
                                  component.product_variation
                                    .name
                                }
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {quantity}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {vm.formatPrice(unitPrice)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              fontWeight="medium"
                            >
                              {vm.formatPrice(totalPrice)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    }
                  )}
                  {/* Total Row */}
                  <TableRow>
                    <TableCell colSpan={3} align="right">
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                      >
                        Bundle Total:
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color="primary"
                      >
                        {(() => {
                          const priceType =
                            vm.selectedPriceType || "standard";
                          let total = 0;
                          vm.bundleContents!.components?.forEach(
                            (component) => {
                              const quantity =
                                component.quantity || 1;
                              const price = vm.getComponentPrice(
                                component,
                                priceType
                              );
                              if (price)
                                total += price * quantity;
                            }
                          );
                          return vm.formatPrice(total);
                        })()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Price Type Info */}
            {vm.selectedPriceType && (
              <Box
                sx={{ p: 1, bgcolor: "info.lighter", borderRadius: 1 }}
              >
                <Typography variant="caption" color="info.main">
                  {vm.selectedPriceType === "retaker"
                    ? "Retaker discount applied"
                    : vm.selectedPriceType === "additional"
                    ? "Additional copy discount applied"
                    : "Standard pricing"}
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Typography>No bundle contents available</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={vm.handleCloseContentsModal}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <ThemeProvider theme={vm.theme}>
      <Card
        elevation={2}
        variant={"product" as any}
        className="d-flex flex-column"
        onMouseEnter={vm.handleMouseEnter}
        onMouseLeave={vm.handleMouseLeave}
        sx={{
          transform: vm.isHovered ? "scale(1.02)" : "scale(1)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        {...{ producttype: "bundle" } as any}
      >
        {/* Floating Badges */}
        <Box className="floating-badges-container">
          <Chip
            label={
              <Typography variant={"chip" as any}>
                {bundle.subject_code}
              </Typography>
            }
            size="small"
            className="subject-badge"
            role="img"
            aria-label={`Subject: ${bundle.subject_code}`}
            {...{ elevation: 4 } as any}
          />
          {bundle.exam_session_code && (
            <Chip
              label={
                <Typography variant={"chip" as any}>
                  {bundle.exam_session_code}
                </Typography>
              }
              size="small"
              className="session-badge"
              role="img"
              aria-label={`Exam session: ${bundle.exam_session_code}`}
              {...{ elevation: 4 } as any}
            />
          )}
        </Box>
        <CardHeader
          className="product-header"
          title={
            <Typography
              variant={"productTitle" as any}
              textAlign="left"
              className="product-title"
            >
              {bundle.bundle_name}
              <Tooltip
                className="title-info-tooltip-button"
                title={
                  <Typography
                    variant="body2"
                    color="white"
                    padding="0.618rem"
                    className="title-info-tooltip-title"
                  >
                    The products for this bundle are shown separately
                    in your shopping cart. If there's anything you
                    don't want then you can remove it in the shopping
                    cart page as normal.
                  </Typography>
                }
                slotProps={{
                  popper: {
                    sx: {
                      width: "20rem",
                      boxShadow: "var(--Paper-shadow)",
                    },
                  },
                }}
                placement="bottom-start"
                arrow
              >
                <Button
                  size="small"
                  className="title-info-button"
                  onClick={vm.handleShowContents}
                >
                  <InfoOutline />
                </Button>
              </Tooltip>
            </Typography>
          }
          avatar={
            <Avatar className="product-avatar">
              <Inventory2 className="product-avatar-icon" />
            </Avatar>
          }
        />

        <CardContent sx={{}}>
          <Typography variant="subtitle2" className="bundle-details-title">
            What's included (
            {bundle.components_count || bundle.components?.length || 0}{" "}
            items)
          </Typography>

          <List dense>
            {bundle.components?.map((component, index) => (
              <ListItem
                key={component.id || index}
                className="bundle-list-item"
              >
                <ListItemIcon>
                  <CheckRounded />
                </ListItemIcon>
                <ListItemText
                  primary={
                    component.product?.fullname || component.name
                  }
                  secondary={
                    component.product_variation?.description_short ||
                    component.product_variation?.name ||
                    ""
                  }
                  slotProps={{
                    primary: {
                      variant: "caption",
                    },
                    secondary: {
                      variant: "caption2" as any,
                    },
                  }}
                />
              </ListItem>
            ))}
          </List>
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
                      checked={vm.selectedPriceType === "retaker"}
                      onClick={() =>
                        vm.handlePriceTypeChange("retaker")
                      }
                      size="small"
                      disabled={!vm.hasBundlePriceType("retaker")}
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
                      checked={vm.selectedPriceType === "additional"}
                      onClick={() =>
                        vm.handlePriceTypeChange("additional")
                      }
                      size="small"
                      disabled={!vm.hasBundlePriceType("additional")}
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
              <Box className="price-info-row">
                {vm.loadingPrices ? (
                  <CircularProgress size={24} />
                ) : (
                  <Typography
                    variant={"price" as any}
                    className="price-display"
                  >
                    {(() => {
                      const priceType =
                        vm.selectedPriceType || "standard";
                      const totalPrice = vm.getBundlePrice(priceType);

                      if (totalPrice === null) {
                        return "Contact for pricing";
                      }

                      return vm.formatPrice(totalPrice);
                    })()}
                  </Typography>
                )}
                <Tooltip title="Show price details">
                  <Button
                    size="small"
                    className="info-button"
                    onClick={vm.handleShowContents}
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
                  {vm.selectedPriceType === "retaker" ||
                  vm.selectedPriceType === "additional"
                    ? "Discount applied"
                    : "Standard pricing"}
                </Typography>
                <Typography
                  variant="subtitle2"
                  className="vat-status-text"
                  color="text.secondary"
                >
                  {bundle.vat_status_display || "Price includes VAT"}
                </Typography>
              </Box>

              <Button
                variant="contained"
                className="add-to-cart-button"
                onClick={vm.handleAddToCart}
                aria-label="Add bundle to cart"
              >
                <AddShoppingCart />
              </Button>
            </Box>
          </Box>
        </CardActions>
      </Card>

      {renderContentsModal()}
    </ThemeProvider>
  );
});

BundleCard.displayName = "BundleCard";

export default BundleCard;
