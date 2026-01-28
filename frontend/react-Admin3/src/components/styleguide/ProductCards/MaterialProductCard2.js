import React, { useState, useRef } from "react";
import {
   Avatar,
   Box,
   Typography,
   CardContent,
   CardHeader,
   CardActions,
   Button,
   Chip,
   Stack,
   Radio,
   RadioGroup,
   FormControlLabel,
   Tooltip,
   SpeedDial,
   SpeedDialAction,
   SpeedDialIcon,
   Backdrop,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import {
   LibraryBooksSharp,
   AddShoppingCart,
   InfoOutline,
   CheckCircle,
   Close,
   TipsAndUpdatesOutlined,
   FolderCopyOutlined,
} from "@mui/icons-material";
import BaseProductCard from "../../Common/BaseProductCard";

const MaterialProductCard2 = ({ producttype = "material", buttonPage = 0, ...props }) => {
   const [selectedVariation, setSelectedVariation] = useState("printed");
   const [selectedPriceType, setSelectedPriceType] = useState(""); // Empty means standard pricing

   const [isHovered, setIsHovered] = useState(false);

   const [showCheck, setShowCheck] = useState(false);
   const [speedDialOpen, setSpeedDialOpen] = useState(false);
   const theme = useTheme();
   const cardRef = useRef(null);
   const headerRef = useRef(null);
   const variationOptions = {
      printed: {
         price: 45,
         label: "Printed Materials",
         description: "Physical study materials",
      },
      ebook: {
         price: 35,
         label: "Vitalsource eBook",
         description: "Digital download",
      },
   };

   const handleVariationChange = (event) => {
      setSelectedVariation(event.target.value);
   };

   return (
      <ThemeProvider theme={theme}>
         <BaseProductCard
            ref={cardRef}
            elevation={2}
            variant="product"
            producttype={producttype}
            className="d-flex flex-column"
            sx={{
               transform: isHovered ? "scale(1.02)" : "scale(1)",
               transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
         >
            {/* Floating Badges */}
            <Box className="floating-badges-container">
               <Chip
                  label={<Typography variant="chip">CS1</Typography>}
                  size="small"
                  className="subject-badge"
                  role="img"
                  aria-label="Subject: CS1"
               />
               <Chip
                  label={<Typography variant="chip">26A</Typography>}
                  size="small"
                  className="session-badge"
                  role="img"
                  aria-label="Exam session: 26A"
               />
            </Box>
            {/* Enhanced Header with Glass Effect */}
            <Box
               sx={{
                  position: "relative",
                  overflow: "hidden",
                  // Base gradient background
                  background: "linear-gradient(145deg, rgba(180, 120, 100, 0.3) 0%, rgba(42, 101, 206, 0.65) 35%, rgba(0, 49, 149, 0.8) 70%, rgba(80, 140, 140, 0.4) 100%)",
               }}
            >
               {/* Glowing orb - top right (muted-warm) - BEHIND everything */}
               <Box
                  sx={{
                     position: "absolute",
                     width: 280,
                     height: 280,
                     top: -120,
                     right: -100,
                     borderRadius: "50%",
                     background: "rgba(180, 120, 100, 0.4)",
                     filter: "blur(50px)",
                     zIndex: 0,
                     pointerEvents: "none",
                  }}
               />
               {/* Glowing orb - bottom left (cobalt-050) - BEHIND everything */}
               <Box
                  sx={{
                     position: "absolute",
                     width: 220,
                     height: 220,
                     bottom: -100,
                     left: -80,
                     borderRadius: "50%",
                     background: "#4481ec",
                     opacity: 0.35,
                     filter: "blur(45px)",
                     zIndex: 0,
                     pointerEvents: "none",
                  }}
               />
               {/* CardHeader - content layer */}
               <CardHeader
                  ref={headerRef}
                  className="product-header product-header2"
                  sx={{
                     position: "relative",
                     zIndex: 1,
                     background: "transparent",
                  }}
                  title={
                     <Typography
                        variant="productTitle"
                        textAlign="left"
                        className="product-title"
                        sx={{ position: "relative", zIndex: 4 }}
                     >
                        Course Notes
                     </Typography>
                  }
                  avatar={
                     <Avatar
                        className="product-avatar"
                        sx={{
                           position: "relative",
                           zIndex: 4,
                           backdropFilter: "blur(12px)",
                           border: "1px solid rgba(255,255,255,0.15)",
                        }}
                     >
                        <LibraryBooksSharp className="product-avatar-icon" />
                     </Avatar>
                  }
               />
               {/* Glass shape 1 - top right - ON TOP for frosted effect */}
               <Box
                  sx={{
                     position: "absolute",
                     width: 160,
                     height: 160,
                     top: -50,
                     right: 20,
                     borderRadius: "50%",
                     backdropFilter: "blur(20px)",
                     WebkitBackdropFilter: "blur(20px)",
                     border: "1px solid rgba(255,255,255,0.08)",
                     background: "rgba(255,255,255,0.04)",
                     zIndex: 2,
                     pointerEvents: "none",
                  }}
               />
               {/* Glass shape 2 - bottom center - ON TOP for frosted effect */}
               <Box
                  sx={{
                     position: "absolute",
                     width: 100,
                     height: 100,
                     bottom: -30,
                     left: "45%",
                     borderRadius: "50%",
                     backdropFilter: "blur(20px)",
                     WebkitBackdropFilter: "blur(20px)",
                     border: "1px solid rgba(255,255,255,0.08)",
                     background: "rgba(255,255,255,0.03)",
                     zIndex: 2,
                     pointerEvents: "none",
                  }}
               />
               {/* Glass overlay gradient - ON TOP */}
               <Box
                  sx={{
                     position: "absolute",
                     inset: 0,
                     background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
                     pointerEvents: "none",
                     zIndex: 3,
                  }}
               />
            </Box>

            <CardContent>
               {/* Enhanced Variations Section - Better hierarchy */}
               <Box className="product-variations">
                  <Typography variant="subtitle1" className="variations-title">
                     Product Variations
                  </Typography>

                  <RadioGroup
                     value={selectedVariation}
                     onChange={handleVariationChange}
                     className="variations-group"
                  >
                     <Stack spacing={1}>
                        {Object.entries(variationOptions).map(
                           ([key, option]) => (
                              <Box
                                 key={key}
                                 className="variation-option"
                                 sx={{
                                    borderColor:
                                       selectedVariation === key
                                          ? "primary.main"
                                          : "divider",
                                    borderRadius: 1,
                                    transform:
                                       selectedVariation === key
                                          ? "scale(1.01)"
                                          : "scale(1)",
                                    backgroundColor:
                                       selectedVariation === key
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
                                             selectedVariation === key
                                                ? 600
                                                : 400
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
                           )
                        )}
                     </Stack>
                  </RadioGroup>
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

                  {/* Right Column - Price & Action Section */}
                  <Box className="price-action-section">
                     {/* Price and Info Button Row */}
                     <Box className="price-info-row">
                        <Typography variant="price" className="price-display">
                           {selectedPriceType === "retaker"
                              ? `£${(
                                   variationOptions[selectedVariation].price *
                                   0.8
                                ).toFixed(2)}`
                              : selectedPriceType === "additional"
                              ? `£${(
                                   variationOptions[selectedVariation].price *
                                   0.5
                                ).toFixed(2)}`
                              : `£${variationOptions[selectedVariation].price}.00`}
                        </Typography>
                        <Tooltip title="Show price details">
                           <Button size="small" className="info-button">
                              <InfoOutline />
                           </Button>
                        </Tooltip>
                     </Box>

                     {/* Status Text */}
                     <Box className="price-details-row">
                        <Typography
                           variant="caption"
                           className="price-level-text"
                           color=""
                        >
                           {selectedPriceType === "retaker"
                              ? "Retaker discount applied"
                              : selectedPriceType === "additional"
                              ? "Additional copy rate applied"
                              : "Standard pricing"}
                        </Typography>
                        <Typography
                           variant="caption"
                           className="vat-status-text"
                           color="text.secondary"
                        >
                           Price includes VAT
                        </Typography>
                     </Box>

                     {/* Add to Cart Button - Always at bottom */}
                     {buttonPage === 0 ? (
                        <>
                           <Button
                              variant="contained"
                              className="add-to-cart-button"
                              aria-label="Add to cart"
                              sx={{
                                 ...(showCheck
                                    ? { backgroundColor: "green" }
                                    : {}),
                              }}
                           >
                              {showCheck ? (
                                 <CheckCircle />
                              ) : (
                                 <AddShoppingCart />
                              )}
                           </Button>
                        </>
                     ) : buttonPage === 1 ? (
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
                                    backgroundColor: theme.palette.scales.sky[60],
                                    boxShadow: "var(--Paper-shadow)",
                                    "&:hover": {
                                       backgroundColor:
                                          theme.palette.scales.sky[70],
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
                                          theme.palette.scales.sky[60],
                                       "&:hover": {
                                          backgroundColor:
                                             theme.palette.scales.sky[70],
                                       },
                                    },
                                 }}
                                 aria-label="Add to cart"                                 
                              />

                              {/* Buy with Recommended action */}
                              <SpeedDialAction
                                 icon={<TipsAndUpdatesOutlined />}
                                 slotProps={{
                                    tooltip: {
                                       open: true,
                                       title: "Buy with Mock Exam Marking £56",
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
                                          theme.palette.scales.sky[60],
                                       "&:hover": {
                                          backgroundColor:
                                             theme.palette.scales.sky[70],
                                       },
                                    },
                                 }}
                                 aria-label="Buy with Recommended"
                                 onClick={() => {                                                                      
                                    setSpeedDialOpen(false);
                                 }}
                              />
                           </SpeedDial>
						</>
                     ) : (
						// Buy Both
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
									  theme.palette.scales.sky[60],
								   "&:hover": {
									  backgroundColor:
										 theme.palette.scales.sky[70],
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
                                          theme.palette.scales.sky[60],                                       
                                       boxShadow: "var(--Paper-shadow)",  
                                       "&:hover": {
                                          backgroundColor:
                                             theme.palette.scales.sky[70],
                                       },
                                    },
                                 }}
                                 aria-label="Add to cart"
                                 onClick={() => {                                    
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
                                          theme.palette.scales.sky[60],
                                       "&:hover": {
                                          backgroundColor:
                                             theme.palette.scales.sky[70],
                                       },
                                    },
                                 }}
                                 aria-label="Buy Both (Printed + eBook)"
                                 onClick={() => {                                    
                                    setSpeedDialOpen(false);
                                 }}
                              />
                           </SpeedDial>
						</>
                     )}
                  </Box>
               </Box>
            </CardActions>
         </BaseProductCard>
      </ThemeProvider>
   );
};

export default MaterialProductCard2;
