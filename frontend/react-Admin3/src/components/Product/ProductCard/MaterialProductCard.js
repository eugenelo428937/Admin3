import React, {
   useState,
   useEffect,
   useMemo,
   useRef,
   useCallback,
} from "react";
import { formatPrice } from "../../../utils/priceFormatter";
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
} from "@mui/material";
import {
   InfoOutline,
   AddShoppingCart,
   LibraryBooksSharp,
   FolderCopyOutlined,
   TipsAndUpdatesOutlined,
   Close,
} from "@mui/icons-material";
import { ThemeProvider } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import { useCart } from "../../../contexts/CartContext";
import BaseProductCard from "../../Common/BaseProductCard";
import MarkingProductCard from "./MarkingProductCard";
import MarkingVoucherProductCard from "./MarkingVoucherProductCard";
import TutorialProductCard from "./Tutorial/TutorialProductCard";
import OnlineClassroomProductCard from "./OnlineClassroomProductCard";
import BundleCard from "./BundleCard";
import "../../../styles/product_card.css";

const MaterialProductCard = React.memo(
   ({ product, onAddToCart, allEsspIds, bulkDeadlines }) => {
      const [selectedVariation, setSelectedVariation] = useState("");
      const [showPriceModal, setShowPriceModal] = useState(false);
      const [selectedPriceType, setSelectedPriceType] = useState("");
      const [isHovered, setIsHovered] = useState(false);
      const [speedDialOpen, setSpeedDialOpen] = useState(false);
      const theme = useTheme();
      const cardRef = useRef(null);

      const { cartData } = useCart();

      // Get user's VAT region from cart data
      const userRegion =
         cartData?.vat_calculations?.region_info?.region || "UK";

      const handleMouseEnter = useCallback(() => {
         setIsHovered(true);
      }, []);

      const handleMouseLeave = useCallback(() => {
         setIsHovered(false);
      }, []);

      // Memoize expensive calculations
      const producttypeCheck = useMemo(
         () => ({
            isTutorial: product.type === "Tutorial",
            isMarking: product.type === "Markings",
            isMarkingVoucher:
               product.type === "MarkingVoucher" ||
               product.is_voucher === true ||
               product.product_name?.toLowerCase().includes("voucher") ||
               (product.code && product.code.startsWith("VOUCHER")),
            isOnlineClassroom:
               product.product_name
                  ?.toLowerCase()
                  .includes("online classroom") ||
               product.product_name?.toLowerCase().includes("recording") ||
               product.learning_mode === "LMS",
            isBundle:
               product.type === "Bundle" ||
               product.product_name?.toLowerCase().includes("bundle") ||
               product.product_name?.toLowerCase().includes("package") ||
               product.is_bundle === true,
         }),
         [
            product.type,
            product.product_name,
            product.learning_mode,
            product.is_bundle,
            product.is_voucher,
            product.code,
         ]
      );

      // Memoize variation calculations
      const variationInfo = useMemo(() => {
         const hasVariations =
            product.variations && product.variations.length > 0;
         const singleVariation =
            product.variations && product.variations.length === 1
               ? product.variations[0]
               : null;

         const currentVariation = hasVariations
            ? selectedVariation
               ? product.variations.find(
                    (v) => v.id.toString() === selectedVariation
                 )
               : singleVariation || product.variations[0]
            : singleVariation;

         return { hasVariations, singleVariation, currentVariation };
      }, [product.variations, selectedVariation]);

      // Initialize selectedVariation when product loads
      useEffect(() => {
         if (
            product.variations &&
            product.variations.length > 0 &&
            !selectedVariation
         ) {
            setSelectedVariation(product.variations[0].id.toString());
         }
      }, [product.id, product.essp_id]); // Only when product changes

      // Memoize price calculation to avoid recalculating on every render
      const getPrice = useMemo(() => {
         return (variation, priceType) => {
            if (!variation || !variation.prices) return null;
            const priceObj = variation.prices.find(
               (p) => p.price_type === priceType
            );
            if (!priceObj) return null;

            return (
               <div className="d-flex flex-row align-items-end">
                  <Typography variant="h6" className="fw-lighter w-100">
                     {formatPrice(priceObj.amount)}
                  </Typography>

                  <Tooltip
                     title="Show all price types"
                     placement="top"
                     className="d-flex flex-row align-self-start"
                  >
                     <InfoOutline
                        role="button"
                        className="text-secondary mx-1 fw-light"
                        onClick={() => setShowPriceModal(true)}
                        style={{
                           cursor: "pointer",
                           fontSize: "1rem",
                        }}
                        aria-label="Show price information"
                     />
                  </Tooltip>
               </div>
            );
         };
      }, [product.type]);

      const {
         isTutorial,
         isMarking,
         isMarkingVoucher,
         isOnlineClassroom,
         isBundle,
      } = producttypeCheck;
      const { hasVariations, currentVariation } = variationInfo;

      const hasPriceType = (variation, priceType) => {
         if (!variation || !variation.prices) return false;
         return variation.prices.some((p) => p.price_type === priceType);
      };

      // Reset price type if current selection is not available for the current variation
      useEffect(() => {
         if (currentVariation && selectedPriceType) {
            if (!hasPriceType(currentVariation, selectedPriceType)) {
               setSelectedPriceType("");
            }
         }
      }, [currentVariation, selectedPriceType]);

      // For Tutorial products, use the specialized component
      if (isTutorial && !isOnlineClassroom) {
         return (
            <TutorialProductCard
               subjectCode={product.subject_code}
               subjectName={product.subject_name || product.product_name}
               location={product.shortname || product.product_name}
               productId={product.essp_id || product.id || product.product_id}
               product={product}
               variations={product.variations}
               onAddToCart={onAddToCart}
            />
         );
      }

      // For Marking Voucher products, use the specialized component
      if (isMarkingVoucher) {
         return (
            <MarkingVoucherProductCard
               voucher={product}
            />
         );
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

      const handlePriceTypeChange = (priceType) => {
         if (selectedPriceType === priceType) {
            setSelectedPriceType("");
         } else {
            setSelectedPriceType(priceType);
         }
      };

      const handleVariationChange = (event) => {
         setSelectedVariation(event.target.value);
      };

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
                              })
                        )}
                  </TableBody>
               </Table>
               <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                     {product.vat_status_display ||
                        "VAT calculated at checkout based on your location"}
                  </Typography>
               </Box>
            </DialogContent>
            <DialogActions>
               <Button onClick={() => setShowPriceModal(false)}>Close</Button>
            </DialogActions>
         </Dialog>
      );

      // Render Regular Product Content
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
                           {product.variations.map((variation) => {
                              const standardPrice = variation.prices?.find(
                                 (p) => p.price_type === "standard"
                              );
                              return (
                                 <Box
                                    key={variation.id}
                                    className="variation-option"
                                    sx={{
                                       borderColor:
                                          selectedVariation ===
                                          variation.id.toString()
                                             ? "primary.main"
                                             : "divider",
                                       backgroundColor:
                                          selectedVariation ===
                                          variation.id.toString()
                                             ? "primary.50"
                                             : "transparent",
                                       transform: selectedVariation === variation.id.toString() ? "scale(1.01)" : "scale(1)",
                                    }}
                                 >
                                    <FormControlLabel
                                       value={variation.id.toString()}
                                       control={<Radio size="small" />}
                                       label={
                                          <Typography
                                             variant="body1"
                                             className="variation-label"
                                             fontWeight={
                                                selectedVariation ===
                                                variation.id.toString()
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
                                          variant="body1"
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
                                 checked={selectedPriceType === "retaker"}
                                 onClick={() =>
                                    handlePriceTypeChange("retaker")
                                 }
                                 size="small"
                                 disabled={
                                    !hasPriceType(currentVariation, "retaker")
                                 }
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
                                    handlePriceTypeChange("additional")
                                 }
                                 size="small"
                                 disabled={
                                    !hasPriceType(
                                       currentVariation,
                                       "additional"
                                    )
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
                           {(() => {
                              if (!currentVariation) return "-";
                              const priceType = selectedPriceType || "standard";
                              const priceObj = currentVariation.prices?.find(
                                 (p) => p.price_type === priceType
                              );
                              return priceObj
                                 ? formatPrice(priceObj.amount)
                                 : "-";
                           })()}
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
                           variant="subtitle2"
                           className="price-level-text"
                           color="text.secondary"
                        >
                           {selectedPriceType === "retaker"
                              ? "Retaker discount applied"
                              : selectedPriceType === "additional"
                              ? "Additional copy discount applied"
                              : "Standard pricing"}
                        </Typography>
                        <Typography
                           variant="subtitle2"
                           className="vat-status-text"
                           color="text.secondary"
                        >
                           {product.vat_status_display || "Price includes VAT"}
                        </Typography>
                     </Box>

                     {/* Three-tier conditional: buy_both → recommended_product → standard button */}
                     {product.buy_both &&
                     product.variations &&
                     product.variations.length > 1 ? (
                        // Tier 1: Buy Both SpeedDial (takes precedence)
                        <>
                           <Backdrop
                              open={speedDialOpen}
                              onClick={() => setSpeedDialOpen(false)}
                              sx={{
                                 position: "fixed",
                                 zIndex: (theme) => theme.zIndex.speedDial - 1,
                              }}
                           />
                           <SpeedDial
                              variant="product-card-speeddial" 
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
								position: "absolute",
								bottom: 18,
								right: 8,

								"& .MuiFab-root": {
								   backgroundColor:
									  theme.palette.bpp.sky["050"],
								   "&:hover": {
									  backgroundColor:
										 theme.palette.bpp.sky["040"],
								   },
								   "& .MuiSpeedDialIcon-root": {
									  "& .MuiSvgIcon-root": {
										 fontSize: "1.6rem",
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
                                       title: "Add to Cart",
                                    },
                                 }}
                                 sx={{
                                    "& .MuiSpeedDialAction-staticTooltipLabel":
                                       {
                                          whiteSpace: "nowrap",
                                          maxWidth: "none",
                                       },
                                    "& .MuiSpeedDialAction-fab": {
                                       color: "white",
                                       backgroundColor:
                                          theme.palette.bpp.sky["050"],                                       
                                       boxShadow: "var(--Paper-shadow)",  
                                       "&:hover": {
                                          backgroundColor:
                                             theme.palette.bpp.sky["040"],
                                       },
                                    },
                                 }}
                                 aria-label="Add to cart"
                                 onClick={() => {
                                    const priceType =
                                       selectedPriceType || "standard";
                                    if (!currentVariation) return;
                                    const priceObj =
                                       currentVariation.prices?.find(
                                          (p) => p.price_type === priceType
                                       );
                                    if (priceObj) {
                                       onAddToCart(product, {
                                          variationId: currentVariation.id,
                                          variationName: currentVariation.name,
                                          priceType: priceType,
                                          actualPrice: priceObj.amount,
                                       });
                                    }
                                    setSpeedDialOpen(false);
                                 }}
                              />

                              {/* Buy Both action */}
                              <SpeedDialAction
                                 icon={<FolderCopyOutlined />}
                                 slotProps={{
                                    tooltip: {
                                       open: true,
                                       title: "Buy Both (Printed + eBook)",
                                    },
                                 }}
                                 sx={{
                                    "& .MuiSpeedDialAction-staticTooltipLabel":
                                       {
                                          whiteSpace: "nowrap",
                                          maxWidth: "none",
                                       },

                                    "& .MuiSpeedDialAction-fab": {
                                       color: "white",
                                       backgroundColor:
                                          theme.palette.bpp.sky["060"],
                                       "&:hover": {
                                          backgroundColor:
                                             theme.palette.bpp.sky["040"],
                                       },
                                    },
                                 }}
                                 aria-label="Buy Both (Printed + eBook)"
                                 onClick={() => {
                                    const priceType =
                                       selectedPriceType || "standard";
                                    const variation1 = product.variations[0];
                                    const variation2 = product.variations[1];
                                    const price1 = variation1?.prices?.find(
                                       (p) => p.price_type === priceType
                                    );
                                    const price2 = variation2?.prices?.find(
                                       (p) => p.price_type === priceType
                                    );

                                    if (
                                       variation1 &&
                                       variation2 &&
                                       price1 &&
                                       price2
                                    ) {
                                       // Add first variation
                                       onAddToCart(product, {
                                          variationId: variation1.id,
                                          variationName: variation1.name,
                                          priceType: priceType,
                                          actualPrice: price1.amount,
                                       });

                                       // Add second variation
                                       onAddToCart(product, {
                                          variationId: variation2.id,
                                          variationName: variation2.name,
                                          priceType: priceType,
                                          actualPrice: price2.amount,
                                       });
                                    }
                                    setSpeedDialOpen(false);
                                 }}
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
                                 position: "fixed",
                                 zIndex: (theme) => theme.zIndex.speedDial - 1,
                              }}
                           />
                           <SpeedDial
                              ariaLabel="Speed Dial for add to cart"
                              className="add-to-cart-speed-dial"
                              variant="product-card-speeddial"
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
                                 position: "absolute",
                                 bottom: 18,
                                 right: 8,

                                 "& .MuiFab-root": {                                    
                                    backgroundColor: theme.palette.bpp.sky["060"],
                                    boxShadow: "var(--Paper-shadow)",
                                    "&:hover": {
                                       backgroundColor:
                                          theme.palette.bpp.sky["040"],
                                    },
                                    "& .MuiSpeedDialIcon-root": {
                                       "& .MuiSvgIcon-root": {
                                          fontSize: "1.6rem",
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
                                       title: "Add to Cart",
                                    },
                                 }}
                                 sx={{
                                    "& .MuiSpeedDialAction-staticTooltipLabel":
                                       {
                                          whiteSpace: "nowrap",
                                          maxWidth: "none",
                                       },

                                    "& .MuiSpeedDialAction-fab": {
                                       color: "white",
                                       backgroundColor:
                                          theme.palette.bpp.sky["060"],
                                       "&:hover": {
                                          backgroundColor:
                                             theme.palette.bpp.sky["040"],
                                       },
                                    },
                                 }}
                                 aria-label="Add to cart"
                                 onClick={() => {
                                    const priceType =
                                       selectedPriceType || "standard";
                                    if (!currentVariation) return;
                                    const priceObj =
                                       currentVariation.prices?.find(
                                          (p) => p.price_type === priceType
                                       );
                                    if (priceObj) {
                                       onAddToCart(product, {
                                          variationId: currentVariation.id,
                                          variationName: currentVariation.name,
                                          priceType: priceType,
                                          actualPrice: priceObj.amount,
                                       });
                                    }
                                    setSpeedDialOpen(false);
                                 }}
                              />

                              {/* Buy with Recommended action */}
                              <SpeedDialAction
                                 icon={<TipsAndUpdatesOutlined />}
                                 slotProps={{
                                    tooltip: {
                                       open: true,
                                       title: (() => {
                                          const recommendedProduct =
                                             currentVariation.recommended_product;
                                          const standardPrice =
                                             recommendedProduct.prices?.find(
                                                (p) =>
                                                   p.price_type === "standard"
                                             );
                                          return `Buy with ${recommendedProduct.product_short_name} (${
                                             standardPrice ? formatPrice(standardPrice.amount) : "-"
                                          })`;
                                       })(),
                                    },
                                 }}
                                 sx={{
                                    "& .MuiSpeedDialAction-staticTooltipLabel":
                                       {
                                          whiteSpace: "normal",
                                          textWrap: "balance",
                                          minWidth: "200px",
                                       },
                                    "& .MuiSpeedDialAction-fab": {
                                       color: "white",
                                       backgroundColor:
                                          theme.palette.bpp.sky["060"],
                                       "&:hover": {
                                          backgroundColor:
                                             theme.palette.bpp.sky["040"],
                                       },
                                    },
                                 }}
                                 aria-label="Buy with Recommended"
                                 onClick={() => {
                                    const priceType =
                                       selectedPriceType || "standard";
                                    const recommendedProduct =
                                       currentVariation.recommended_product;

                                    // Add current variation
                                    const currentPriceObj =
                                       currentVariation.prices?.find(
                                          (p) => p.price_type === priceType
                                       );
                                    if (currentPriceObj) {
                                       onAddToCart(product, {
                                          variationId: currentVariation.id,
                                          variationName: currentVariation.name,
                                          priceType: priceType,
                                          actualPrice: currentPriceObj.amount,
                                       });
                                    }

                                    // Add recommended product
                                    const recommendedPriceObj =
                                       recommendedProduct.prices?.find(
                                          (p) => p.price_type === priceType
                                       );
                                    if (recommendedPriceObj) {
                                       onAddToCart(
                                          {
                                             id: recommendedProduct.essp_id,
                                             essp_id:
                                                recommendedProduct.essp_id,
                                             product_code:
                                                recommendedProduct.product_code,
                                             product_name:
                                                recommendedProduct.product_name,
                                             product_short_name:
                                                recommendedProduct.product_short_name,
                                             type: "Materials", // Recommended products are typically Materials
                                          },
                                          {
                                             variationId:
                                                recommendedProduct.esspv_id,
                                             variationName:
                                                recommendedProduct.variation_type,
                                             priceType: priceType,
                                             actualPrice:
                                                recommendedPriceObj.amount,
                                          }
                                       );
                                    }
                                    setSpeedDialOpen(false);
                                 }}
                              />
                           </SpeedDial>
                        </>
                     ) : (
                        // Tier 3: Standard Add to Cart button (fallback)
                        <Button
                           variant="contained"
                           className="add-to-cart-button"
                           aria-label="Add to cart"
                           onClick={() => {
                              const priceType = selectedPriceType || "standard";

                              // Handle single variation
                              if (!currentVariation) return;
                              const priceObj = currentVariation.prices?.find(
                                 (p) => p.price_type === priceType
                              );
                              onAddToCart(product, {
                                 variationId: currentVariation.id,
                                 variationName: currentVariation.name,
                                 priceType: priceType,
                                 actualPrice: priceObj?.amount,
                              });
                           }}
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
                  transform: isHovered ? "scale(1.02)" : "scale(1)",
                  transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
               }}
            >
               {/* Floating Badges */}
               <Box className="floating-badges-container">
                  <Chip
                     label={product.subject_code}
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
                           product.exam_session_code ||
                           product.session_code ||
                           product.exam_session ||
                           product.session
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
                        variant="h4"
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
            </BaseProductCard>{" "}
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
         prevProps.product?.prices === nextProps.product?.prices &&
         prevProps.onAddToCart === nextProps.onAddToCart &&
         prevProps.bulkDeadlines === nextProps.bulkDeadlines &&
         prevProps.allEsspIds === nextProps.allEsspIds
      );
   }
);

MaterialProductCard.displayName = "MaterialProductCard";

export default MaterialProductCard;
