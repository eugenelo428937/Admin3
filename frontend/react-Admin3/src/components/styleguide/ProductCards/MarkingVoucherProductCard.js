import React, { useState } from "react";
import {
   Alert,
   AlertTitle,
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
   Tooltip,
} from "@mui/material";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import {
   ConfirmationNumberOutlined,
   AddShoppingCart,
   Star,
   AccessTime,
   InfoOutline,
   Savings,
   Timer,
} from "@mui/icons-material";
import { NumberInput, HStack, IconButton } from "@chakra-ui/react";
import { LuMinus, LuPlus } from "react-icons/lu";
import BaseProductCard from "../../Common/BaseProductCard";

const MarkingVoucherProductCard = ({ producttype = "marking-voucher" }) => {
   const theme = useTheme();
   const [quantity, setQuantity] = useState(1);
   const [selectedPriceType, setSelectedPriceType] = useState("");
   const [isHovered, setIsHovered] = useState(false);
   const [isAlertExpanded, setIsAlertExpanded] = useState(false);
   const basePrice = 35; // Base price per voucher

   const handleQuantityChange = (details) => {
      // Debug log
      const value = parseInt(details.value);
      if (!isNaN(value) && value >= 1 && value <= 99) {
         setQuantity(value);
      }
   };

   const totalPrice = basePrice * quantity;

   const handleMouseEnter = () => {
      setIsHovered(true);
   };

   const handleMouseLeave = () => {
      setIsHovered(false);
   };

   return (
      <ThemeProvider theme={theme}>
         <BaseProductCard
            elevation={2}
            variant="product"
            producttype={producttype}
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
                  label={
                     <Typography variant="chip">
                        <Timer className="validity-info-icon" />
                        Valid for 4 years
                     </Typography>
                  }
                  size="small"
                  className="subject-badge"
                  role="img"
                  aria-label="Subject: CM1"
                  elevation={4}
               />
            </Box>
            <CardHeader
               className="product-header"
               title={
                  <Typography
                     variant="productTitle"
                     textAlign="left"
                     className="product-title"
                  >
                     Marking Voucher
                  </Typography>
               }
               avatar={
                  <Avatar className="product-avatar">
                     <ConfirmationNumberOutlined className="product-avatar-icon" />
                  </Avatar>
               }
            />

            <CardContent>
               <Box
                  sx={{
                     display: "flex",
                     flexDirection: "column",
                     gap: 1,
                     alignItems: "flex-start",
                  }}
               >
                  <Alert
                     severity="info"
                     className="voucher-info-alert"
                     sx={{
                        width: "100%",
                        py: 0.5,
                        "& .MuiAlert-message": {
                           overflow: "hidden",
                           width: "100%",
                        },
                     }}
                  >
                     <Box
                        sx={{
                           display: "flex",
                           alignItems: "flex-start",
                           justifyContent: "space-between",
                           gap: 1,
                        }}
                     >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                           <AlertTitle
                              sx={{ fontSize: "0.75rem", mb: 0.25, mt: 0 }}
                           >
                              Important
                           </AlertTitle>
                           <Typography
                              variant="subtitle1"
                              className="alert-text"
                              sx={{
                                 fontSize: "0.7rem",
                                 lineHeight: 1.3,
                                 ...(!isAlertExpanded && {
                                    display: "-webkit-box",
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                 }),
                              }}
                           >
                              To ensure script is returned before exam, please
                              adhere to Marking Voucher deadline in each
                              session.
                           </Typography>
                           <Typography
                              component="span"
                              onClick={() =>
                                 setIsAlertExpanded(!isAlertExpanded)
                              }
                              sx={{
                                 color: "primary.main",
                                 cursor: "pointer",
                                 fontSize: "0.7rem",
                                 fontWeight: 500,
                                 whiteSpace: "nowrap",
                                 flexShrink: 0,
                                 "&:hover": { textDecoration: "underline" },
                              }}
                           >
                              {isAlertExpanded
                                 ? "... Show less"
                                 : "...Show more"}
                           </Typography>
                        </Box>
                     </Box>
                  </Alert>

                  <Box
                     className="voucher-quantity-section"
                     display="flex"
                     alignItems="center"
                     justifyContent="space-evenly"
                     sx={{ width: "100%" }}
                  >
                     <Typography
                        variant="subtitle1"
                        className="quantity-label"
                        sx={{ mb: 1 }}
                     >
                        Quantity
                     </Typography>
                     <Box className="quantity-input-container">
                        <NumberInput.Root
                           value={quantity.toString()}
                           onValueChange={handleQuantityChange}
                           min={1}
                           max={99}
                           width="90px"
                           size="sm"
                           className="chakra-number-input"
                        >
                           <HStack gap="1">
                              <NumberInput.DecrementTrigger asChild>
                                 <IconButton variant="outline" size="xs">
                                    <LuMinus />
                                 </IconButton>
                              </NumberInput.DecrementTrigger>
                              <NumberInput.ValueText
                                 textAlign="center"
                                 fontSize="sm"
                                 minW="3ch"
                              />
                              <NumberInput.IncrementTrigger asChild>
                                 <IconButton variant="outline" size="xs">
                                    <LuPlus />
                                 </IconButton>
                              </NumberInput.IncrementTrigger>
                           </HStack>
                        </NumberInput.Root>
                     </Box>
                  </Box>
               </Box>
            </CardContent>

            <CardActions>
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
                  <Box className="price-action-section">
                     <Box className="price-info-row">
                        <Typography variant="price" className="price-display">
                           £{totalPrice.toFixed(2)}
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
                           {quantity} voucher{quantity !== 1 ? "s" : ""} • £
                           {basePrice} each
                        </Typography>
                        <Typography
                           variant="fineprint"
                           className="vat-status-text"
                           color="text.secondary"
                        >
                           Price includes VAT
                        </Typography>
                     </Box>
                     <Button variant="contained" className="add-to-cart-button">
                        <AddShoppingCart />
                     </Button>
                  </Box>
               </Box>
            </CardActions>
         </BaseProductCard>
      </ThemeProvider>
   );
};

export default MarkingVoucherProductCard;
