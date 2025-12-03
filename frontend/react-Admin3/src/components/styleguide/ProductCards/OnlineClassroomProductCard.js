import React, { useState, useRef } from "react";
import {
   Box,
   Typography,
   CardContent,
   CardHeader,
   CardActions,
   Button,
   Chip,
   Stack,
   Avatar,
   Radio,
   RadioGroup,
   FormControlLabel,
   Tooltip,
} from "@mui/material";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import { Computer, AddShoppingCart, InfoOutline } from "@mui/icons-material";
import BaseProductCard from "../../Common/BaseProductCard";

const OnlineClassroomProductCard = ({
   producttype = "online-classroom",
   ...props
}) => {
   const [selectedFormat, setSelectedFormat] = useState("UK");
   const [selectedPriceType, setSelectedPriceType] = useState(""); // Empty means standard pricing
   const [isHovered, setIsHovered] = useState(false);
   const cardRef = useRef(null);
   const theme = useTheme();

   const formatOptions = {
      UK: {
         price: 249,
         label: "UK April 2026 Exam",
      },
      IAI: {
         price: 249,
         label: "India April 2026 Exam",
      },
   };

   const handleFormatChange = (event) => {
      setSelectedFormat(event.target.value);
   };

   const handleMouseEnter = () => {
      setIsHovered(true);
   };

   const handleMouseLeave = () => {
      setIsHovered(false);
   };

   return (
      <ThemeProvider theme={theme}>
         <BaseProductCard
            ref={cardRef}
            elevation={2}
            variant="product"
            producttype={producttype}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            sx={{
               transform: isHovered ? "scale(1.02)" : "scale(1)",
               transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            className="d-flex flex-column"
            {...props}
         >
            {/* Floating Badges */}
            <Box className="floating-badges-container">
               <Chip
                  label={<Typography variant="chip">CS1</Typography>}
                  size="small"
                  className="subject-badge"
                  role="img"
                  aria-label="Subject: CP1"
               />
               <Chip
                  label={<Typography variant="chip">26A</Typography>}
                  size="small"
                  className="session-badge"
                  role="img"
                  aria-label="Exam session: 26A"
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
                     Online Classroom
                  </Typography>
               }
               subheader={
                  <Typography
                     variant="subtitle1"
                     textAlign="left"
                     className="product-subtitle"
                  >
                     CP1 - Actuarial Practice
                  </Typography>
               }
               avatar={
                  <Avatar className="product-avatar">
                     <Computer className="product-avatar-icon" />
                  </Avatar>
               }
            />

            <CardContent>
               <Box className="product-variations">
                  <Typography variant="subtitle1" className="variations-title">
                     Product Variations
                  </Typography>
                  <RadioGroup
                     value={selectedFormat}
                     onChange={handleFormatChange}
                     className="variations-group"
                  >
                     <Stack spacing={1}>
                        {Object.entries(formatOptions).map(([key, option]) => (
                           <Box
                              key={key}
                              className="variation-option"
                              sx={{
                                 borderColor:
                                    selectedFormat === key
                                       ? "primary.main"
                                       : "divider",
                                 borderRadius: 1,
                                 transform:
								 selectedFormat === key
                                       ? "scale(1.01)"
                                       : "scale(1)",
                                 backgroundColor:
								 selectedFormat === key
                                       ? "primary.50"
                                       : "transparent",
                              }}
                           >
                              <FormControlLabel
                                 value={key}
                                 control={<Radio size="small" />}
                                 label={
                                    <Typography
                                       variant="body2"
                                       className="variation-label"
                                       fontWeight={
										selectedFormat === key ? 600 : 400
                                       }
                                    >
                                       {option.label}
                                    </Typography>
                                 }
                                 className="variation-control"
                              />
                              <Typography
                                 variant="body2"
                                 color="primary.main"
                                 fontWeight={600}
                              >
                                 £{option.price}
                              </Typography>
                           </Box>
                        ))}
                     </Stack>
                  </RadioGroup>
               </Box>
            </CardContent>

            <CardActions>
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
                        <Typography variant="price" className="price-display">
                           {selectedPriceType === "retaker"
                              ? `£${(
                                   formatOptions[selectedFormat].price * 0.8
                                ).toFixed(2)}`
                              : selectedPriceType === "additional"
                              ? `£${(
                                   formatOptions[selectedFormat].price * 0.5
                                ).toFixed(2)}`
                              : `£${formatOptions[selectedFormat].price}`}
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
                           {selectedPriceType === "retaker"
                              ? "Retaker discount applied"
                              : selectedPriceType === "additional"
                              ? "Additional copy discount applied"
                              : "Standard pricing"}
                        </Typography>
                        <Typography
                           variant="fineprint"
                           className="vat-status-text"
                           color="text.secondary"
                        >
                           Price includes VAT
                        </Typography>
                     </Box>
                     {/* Add to Cart Button */}
                     <Button
                        variant="contained"
                        className="add-to-cart-button"
                        aria-label="Add to cart"
                     >
                        <AddShoppingCart />
                     </Button>
                  </Box>
               </Box>
            </CardActions>
         </BaseProductCard>
      </ThemeProvider>
   );
};

export default OnlineClassroomProductCard;
