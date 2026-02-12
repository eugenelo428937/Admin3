import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
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
   useTheme,
} from "@mui/material";
import {
   AddShoppingCart,
   School,
   CalendarMonthOutlined,
   ViewModule,
   LocationOn,
   InfoOutline,
   ErrorOutline,
} from "@mui/icons-material";
import { useTutorialChoice } from "../../../../contexts/TutorialChoiceContext";
import { useCart } from "../../../../contexts/CartContext";
import tutorialService from "../../../../services/tutorialService";
import { formatPrice } from "../../../../utils/vatUtils";
import {
   buildTutorialMetadata,
   buildTutorialProductData,
   buildTutorialPriceData,
} from "../../../../utils/tutorialMetadataBuilder";
import TutorialSelectionDialog from "./TutorialSelectionDialog";

/**
 * TutorialProductCard
 * Shows tutorial products for a specific subject and location
 * Uses TutorialChoiceContext for managing selections
 */
const TutorialProductCard = React.memo(
   ({
      subjectCode,
      subjectName,
      location,
      productId,
      product,
      variations: preloadedVariations = null,
      onAddToCart = null,
      dialogOpen = null,
      onDialogClose = null,
   }) => {
      const theme = useTheme();
      const [variations, setVariations] = useState(preloadedVariations || []);
      const [loading, setLoading] = useState(!preloadedVariations);
      const [error, setError] = useState(null);
      const [localDialogOpen, setLocalDialogOpen] = useState(false);
      const [isHovered, setIsHovered] = useState(false);
      const [selectedPriceType, setSelectedPriceType] = useState(""); // Empty means standard pricing
      const [speedDialOpen, setSpeedDialOpen] = useState(false);
      const [priceInfoOpen, setPriceInfoOpen] = useState(false);

      // T014: Get context hooks BEFORE using their values
      const {
         getSubjectChoices,
         markChoicesAsAdded,
         removeTutorialChoice,
         editDialogOpen,
         closeEditDialog,
         openEditDialog,
         addTutorialChoice,
      } = useTutorialChoice();

      const { addToCart, updateCartItem, cartItems } = useCart();

      // T014: Use controlled state from multiple sources
      // Priority: dialogOpen prop > context editDialogOpen > local state
      // Check both subjectCode and location (or open if location not specified)
      const shouldOpenFromContext =
         editDialogOpen &&
         editDialogOpen.subjectCode === subjectCode &&
         (!editDialogOpen.location || editDialogOpen.location === location);

      const isDialogOpen =
         dialogOpen !== null
            ? dialogOpen
            : shouldOpenFromContext
            ? true
            : localDialogOpen;

      const handleDialogClose = () => {
         // T014: Clear context dialog state when closing
         if (shouldOpenFromContext) {
            closeEditDialog();
         }
         // Clear local state
         setLocalDialogOpen(false);
         // Call parent callback if provided
         if (onDialogClose) {
            onDialogClose();
         }
      };

      const handleDialogOpen = () => {
         // Pre-populate cart items into context when opening dialog
         const existingCartItem = cartItems.find((item) => {
            const itemSubjectCode =
               item.subject_code || item.metadata?.subjectCode;
            return (
               itemSubjectCode === subjectCode &&
               item.product_type === "tutorial"
            );
         });

         if (
            existingCartItem &&
            existingCartItem.metadata?.locations?.[0]?.choices
         ) {
            // Extract choices from cart metadata and add to context with isDraft=false
            const cartChoices = existingCartItem.metadata.locations[0].choices;

            cartChoices.forEach((cartChoice) => {
               const choiceLocation = cartChoice.location || location;

               // Convert cart choice format to tutorialChoice format
               addTutorialChoice(
                  subjectCode,
                  cartChoice.choice, // "1st", "2nd", or "3rd"
                  {
                     eventId: cartChoice.eventId,
                     eventTitle: cartChoice.eventTitle,
                     eventCode: cartChoice.eventCode,
                     venue: cartChoice.venue,
                     startDate: cartChoice.startDate,
                     endDate: cartChoice.endDate,
                     variationId: cartChoice.variationId,
                     variationName: cartChoice.variationName,
                     location: choiceLocation, // FIX: Use cart choice location, not current product location
                     subjectCode: subjectCode,
                     subjectName: subjectName,
                     isDraft: false, // Mark as not draft since it's from cart
                  },
                  {
                     productId: productId,
                     productName: subjectName,
                     subjectName: subjectName,
                  }
               );
            });
         }

         if (dialogOpen !== null && onDialogClose) {
            // In controlled mode, parent handles opening via dialogOpen prop
            // Do nothing here - parent should set dialogOpen=true
         } else {
            setLocalDialogOpen(true);
         }
      };

      // Get current choices for this subject
      const subjectChoices = getSubjectChoices(subjectCode);
      const hasChoices = Object.keys(subjectChoices).length > 0;
      const choiceCount = Object.keys(subjectChoices).length;

      // Calculate total tutorials in cart for this subject
      const tutorialsInCartCount = useMemo(() => {
         if (!cartItems || cartItems.length === 0) return 0;

         // Filter cart items for this subject
         // Subject code can be at top level or in metadata
         const tutorialItems = cartItems.filter((item) => {
            const itemSubjectCode =
               item.subject_code || item.metadata?.subjectCode;
            return (
               itemSubjectCode === subjectCode &&
               item.product_type === "tutorial"
            );
         });

         // Count total choices across all tutorial items
         return tutorialItems.reduce((total, item) => {
            // Check if item has metadata with choice count
            const metadata = item.metadata || item.priceInfo?.metadata;
            if (metadata && metadata.totalChoiceCount) {
               return total + metadata.totalChoiceCount;
            }
            // Fallback: count each item as 1
            return total + 1;
         }, 0);
      }, [cartItems, subjectCode]);

      // Compute unique variations (deduplicate by name, preferring ones with standard price)
      // This fixes the issue where multiple variations with the same name appear in the price table
      const uniqueVariations = useMemo(() => {
         if (!variations || variations.length === 0) return [];

         const variationMap = new Map();

         variations.forEach((variation) => {
            const name = variation.name;
            const existingVariation = variationMap.get(name);

            // Check if this variation has a standard price
            const hasStandardPrice = variation.prices?.some(
               (p) => p.price_type === "standard" && p.amount != null
            );
            const existingHasStandardPrice = existingVariation?.prices?.some(
               (p) => p.price_type === "standard" && p.amount != null
            );

            // Prefer the variation with a standard price
            if (!existingVariation || (hasStandardPrice && !existingHasStandardPrice)) {
               variationMap.set(name, variation);
            }
         });

         return Array.from(variationMap.values());
      }, [variations]);

      // Compute display price from the first variation's standard price
      // This fixes the £299 fallback issue when product.price is undefined
      const displayPrice = useMemo(() => {
         // Find the first variation with a standard price
         for (const variation of uniqueVariations) {
            const standardPrice = variation.prices?.find(
               (p) => p.price_type === "standard"
            );
            if (standardPrice?.amount != null) {
               return {
                  standard: standardPrice.amount,
                  retaker: variation.prices?.find((p) => p.price_type === "retaker")?.amount,
                  additional: variation.prices?.find((p) => p.price_type === "additional")?.amount,
               };
            }
         }
         // Fallback to product.price if no variation prices found
         return {
            standard: product.price || null,
            retaker: product.retaker_price || null,
            additional: product.additional_copy_price || null,
         };
      }, [uniqueVariations, product.price, product.retaker_price, product.additional_copy_price]);

      // Flatten events from variations for TutorialSelectionDialog
      const flattenedEvents = useMemo(() => {
         const events = [];
         variations.forEach((variation) => {
            if (variation.events) {
               variation.events.forEach((event) => {
                  events.push({
                     eventId: event.id,
                     eventTitle: event.title,
                     eventCode: event.code,
                     location: event.location || location,
                     venue: event.venue,
                     startDate: event.start_date,
                     endDate: event.end_date,
                     variation: {
                        variationId: variation.id,
                        variationName: variation.name,
                        prices: variation.prices,
                     },
                  });
               });
            }
         });
         // Sort by start date
         const sorted = events.sort(
            (a, b) => new Date(a.startDate) - new Date(b.startDate)
         );

         // DEBUG: Log flattened events

         return sorted;
      }, [variations, location, subjectCode]);

      // SpeedDial event handlers - memoized to prevent unnecessary re-renders
      const handleSpeedDialOpen = useCallback(() => setSpeedDialOpen(true), []);
      const handleSpeedDialClose = useCallback(
         () => setSpeedDialOpen(false),
         []
      );

      const handleAddToCart = useCallback(async () => {
         setSpeedDialOpen(false);

         if (!hasChoices) {
            return;
         }

         // Get actual price from first choice
         const primaryChoice = Object.values(subjectChoices).find((c) => c);
         const actualPrice =
            primaryChoice?.variation?.prices?.find(
               (p) => p.price_type === "standard"
            )?.amount || product.price;

         // Build metadata using utility function
         const tutorialMetadata = buildTutorialMetadata(
            subjectChoices,
            subjectCode,
            location,
            actualPrice
         );

         if (!tutorialMetadata) {
            return;
         }

         // Build product and price data using utility functions
         const productData = buildTutorialProductData(
            productId,
            subjectCode,
            subjectName,
            location
         );

         const priceData = buildTutorialPriceData(
            actualPrice,
            tutorialMetadata
         );

         try {
            // 🔍 Lookup: Check if cart already has an item for this subject
            // Subject code can be at top level or in metadata
            const existingCartItem = cartItems.find((item) => {
               const itemSubjectCode =
                  item.subject_code || item.metadata?.subjectCode;
               return (
                  itemSubjectCode === subjectCode &&
                  item.product_type === "tutorial"
               );
            });

            if (existingCartItem) {
               // ⬆️ Merge: Update existing cart item with new choices

               await updateCartItem(
                  existingCartItem.id,
                  productData,
                  priceData
               );
            } else {
               // ➕ Create: Add new cart item

               await addToCart(productData, priceData);
            }

            // ✅ Mark choices as added (state transition: isDraft false)
            markChoicesAsAdded(subjectCode);
         } catch (error) {
            console.error(
               "❌ [TutorialProductCard] Error adding to cart:",
               error
            );
            // TODO: Show user error feedback
         }
      }, [
         addToCart,
         updateCartItem,
         cartItems,
         markChoicesAsAdded,
         hasChoices,
         subjectChoices,
         product,
         productId,
         subjectCode,
         subjectName,
         location,
      ]);

      const handleSelectTutorial = useCallback(() => {
         setSpeedDialOpen(false);
         handleDialogOpen();
      }, []);

      const handleViewSelections = useCallback(() => {
         setSpeedDialOpen(false);
         // Open edit dialog to show current choices (same as clicking Edit in summary bar)
         openEditDialog(subjectCode);
      }, [openEditDialog, subjectCode]);

      const handlePriceInfoOpen = useCallback(() => {
         setPriceInfoOpen(true);
      }, []);

      const handlePriceInfoClose = useCallback(() => {
         setPriceInfoOpen(false);
      }, []);

      // SpeedDial actions configuration - memoized to prevent unnecessary re-renders
      const speedDialActions = useMemo(
         () =>
            [
               {
                  key: "addToCart",
                  icon: <AddShoppingCart />,
                  name: "Add to Cart",
                  show: hasChoices,
                  onClick: handleAddToCart,
               },
               {
                  key: "selectTutorial",
                  icon: (
                     <Badge
                        badgeContent={
                           tutorialsInCartCount > 0
                              ? tutorialsInCartCount
                              : null
                        }
                        color="success"
                     >
                        <CalendarMonthOutlined />
                     </Badge>
                  ),
                  name: "Select Tutorial",
                  show: true,
                  onClick: handleSelectTutorial,
               },
               {
                  key: "viewSelections",
                  icon: <ViewModule />,
                  name: "View selections",
                  show: hasChoices,
                  onClick: handleViewSelections,
               },
            ].filter((action) => action.show),
         [
            hasChoices,
            tutorialsInCartCount,
            handleAddToCart,
            handleSelectTutorial,
            handleViewSelections,
         ]
      );

      useEffect(() => {
         // Only fetch if variations weren't preloaded
         if (!preloadedVariations && productId && subjectCode) {
            const fetchTutorialVariations = async () => {
               try {
                  setLoading(true);
                  const data = await tutorialService.getTutorialVariations(
                     productId,
                     subjectCode
                  );
                  setVariations(data || []);
                  setError(null);
               } catch (err) {
                  console.error("Error fetching tutorial variations:", err);
                  setError("Failed to load tutorial variations");
               } finally {
                  setLoading(false);
               }
            };

            fetchTutorialVariations();
         } else if (preloadedVariations) {
            setVariations(preloadedVariations);
            setLoading(false);
         }
      }, [productId, subjectCode, preloadedVariations]);

      const getSummaryInfo = () => {
         const totalEvents = variations.reduce(
            (sum, variation) => sum + (variation.events?.length || 0),
            0
         );
         const distinctDescriptions = [
            ...new Set(
               variations
                  .map((v) => v.description_short || v.description)
                  .filter(Boolean)
            ),
         ];
         const distinctVenues = [
            ...new Set(
               variations
                  .flatMap((v) => v.events || [])
                  .map((e) => e.venue)
                  .filter(Boolean)
            ),
         ];

         return { totalEvents, distinctDescriptions, distinctVenues };
      };

      const summaryInfo = getSummaryInfo();

      const handleMouseEnter = () => {
         setIsHovered(true);
      };

      const handleMouseLeave = () => {
         setIsHovered(false);
      };

      if (loading) {
         return (
            <Card
               elevation={2}
               variant="tutorial-product"
               className="d-flex flex-column"
            >
               <CardContent
                  className="d-flex justify-content-center align-items-center"
                  sx={{ height: "200px" }}
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

      if (error) {
         return (
            <Card
               elevation={2}
               variant="tutorial-product"
               className="d-flex flex-column justify-content-between"
            >
               <CardContent>
                  <Alert severity="error">{error}</Alert>
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
               onMouseEnter={handleMouseEnter}
               onMouseLeave={handleMouseLeave}
               sx={{
                  transform: isHovered ? "scale(1.02)" : "scale(1)",
                  transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  width: "100%",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
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
                  {tutorialsInCartCount > 0 && (
                     <Chip
                        label={
                           <Typography variant="chip" sx={{
                              color: theme.palette.semantic.textPrimary
                           }}>
                              {`${tutorialsInCartCount} in cart`}
                           </Typography>
                        }
                        size="small"
                        className="cart-count-badge"
                        color={theme.palette.success.light}
                        role="img"
                        aria-label={`${tutorialsInCartCount} tutorials in cart`}
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
                        {summaryInfo.distinctDescriptions.map((desc, index) => (
                           <Typography
                              key={index}
                              variant="caption"
                              className="info-sub-text"
                           >
                              • {desc}
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
                        {summaryInfo.distinctVenues.map((venue, index) => (
                           <Typography
                              key={index}
                              variant="caption"
                              className="info-sub-text"
                           >
                              • {venue}
                           </Typography>
                        ))}
                     </Stack>
                  </Box>

                  {variations.length === 0 ? (
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
                                    checked={selectedPriceType === "retaker"}
                                    onClick={() =>
                                       setSelectedPriceType(
                                          selectedPriceType === "retaker"
                                             ? ""
                                             : "retaker"
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
                                    checked={selectedPriceType === "additional"}
                                    onClick={() =>
                                       setSelectedPriceType(
                                          selectedPriceType === "additional"
                                             ? ""
                                             : "additional"
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
                              {selectedPriceType === "retaker" &&
                              displayPrice.retaker
                                 ? formatPrice(displayPrice.retaker)
                                 : selectedPriceType === "additional" &&
                                   displayPrice.additional
                                 ? formatPrice(displayPrice.additional)
                                 : displayPrice.standard
                                 ? formatPrice(displayPrice.standard)
                                 : "Price on selection"}
                           </Typography>
                           <Tooltip title="Show price details">
                              <Button
                                 size="small"
                                 className="info-button"
                                 onClick={handlePriceInfoOpen}
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
                              {selectedPriceType === "retaker" ||
                              selectedPriceType === "additional"
                                 ? "Discount applied"
                                 : "Standard pricing"}
                           </Typography>
                           <Typography
                              variant="subtitle2"
                              className="vat-status-text"
                              color="text.secondary"
                           >
                              {product.vat_status_display ||
                                 "Price includes VAT"}
                           </Typography>
                        </Box>
                     </Box>
                  </Box>
               </CardActions>

               {/* SpeedDial for Tutorial Actions */}
               {variations.length > 0 && (
                  <>
                     <Backdrop
                        open={speedDialOpen}
                        onClick={handleSpeedDialClose}
                        sx={{
                           position: "fixed",
                           zIndex: (theme) => theme.zIndex.speedDial - 1,
                        }}
                     />
                     <SpeedDial
                        ariaLabel="Tutorial Actions"
                        sx={{
                           position: "absolute",
                           bottom: 10,
                           right: 5,

                           "& .MuiFab-root": {
                              backgroundColor: theme.palette.productCards.tutorial.button,
                              "&:hover": {
                                 backgroundColor: theme.palette.productCards.tutorial.buttonHover,
                              },
                              "& .MuiSpeedDialIcon-root": {
                                 "& .MuiSvgIcon-root": {
                                    fontSize: "1.6rem",
                                 },
                              },
                           },
                        }}
                        icon={
                           <Badge
                              badgeContent={
                                 tutorialsInCartCount > 0
                                    ? tutorialsInCartCount
                                    : null
                              }
                              color="success"
                              invisible={speedDialOpen}
                           >
                              <SpeedDialIcon />
                           </Badge>
                        }
                        direction="up"
                        open={speedDialOpen}
                        onOpen={handleSpeedDialOpen}
                        onClose={(event, reason) => {
                           // Prevent auto-close on mouse leave or blur
                           // Only allow manual close via backdrop, escape, or action clicks
                           return;
                        }}
                        FabProps={{
                           onClick: () => setSpeedDialOpen(!speedDialOpen),
                        }}
                     >
                        {speedDialActions.map((action) => (
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
                                 "& .MuiSpeedDialAction-staticTooltipLabel": {
                                    whiteSpace: "nowrap",
                                    maxWidth: "none",
                                    minHeight: theme.spacingTokens.xl[1],
                                    alignContent: "center",
                                 },
                                 "& .MuiSpeedDialAction-fab": {
                                    color: "white",
                                    backgroundColor: theme.palette.productCards.tutorial.button,
                                    boxShadow: "var(--Paper-shadow)",
                                    "&:hover": {
                                       backgroundColor: theme.palette.productCards.tutorial.header,
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
               open={isDialogOpen}
               onClose={handleDialogClose}
               product={{
                  subjectCode,
                  location: product.shortname || location,
                  productId,
               }}
               events={flattenedEvents}
            />

            {/* Price Info Dialog */}
            <Dialog
               open={priceInfoOpen}
               onClose={handlePriceInfoClose}
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
                           {uniqueVariations.map((variation) => {
                              const standardPrice = variation.prices?.find(
                                 (p) => p.price_type === "standard"
                              );
                              const retakerPrice = variation.prices?.find(
                                 (p) => p.price_type === "retaker"
                              );
                              const additionalPrice = variation.prices?.find(
                                 (p) => p.price_type === "additional"
                              );

                              return (
                                 <React.Fragment key={variation.id || variation.name}>
                                    <TableRow>
                                       <TableCell>{variation.name}</TableCell>
                                       <TableCell align="right">
                                          {standardPrice
                                             ? formatPrice(standardPrice.amount)
                                             : "N/A"}
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
                        {product.vat_status_display || "Prices include VAT"}
                     </Typography>
                  </Box>
               </DialogContent>
               <DialogActions>
                  <Button onClick={handlePriceInfoClose} color="primary">
                     Close
                  </Button>
               </DialogActions>
            </Dialog>
         </>
      );
   }
);

TutorialProductCard.propTypes = {
   subjectCode: PropTypes.string.isRequired,
   subjectName: PropTypes.string.isRequired,
   location: PropTypes.string.isRequired,
   productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
      .isRequired,
   product: PropTypes.object.isRequired,
   variations: PropTypes.array,
   onAddToCart: PropTypes.func,
   dialogOpen: PropTypes.bool,
   onDialogClose: PropTypes.func,
};

export default TutorialProductCard;
