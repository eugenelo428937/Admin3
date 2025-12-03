import React, { useState, useEffect, useRef } from "react";
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
   FormControlLabel,
   Tooltip,
   Radio,
   SpeedDial,
   SpeedDialAction,
   SpeedDialIcon,
   Backdrop,
} from "@mui/material";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import {
   School,
   AddShoppingCart,
   CalendarMonthOutlined,
   InfoOutline,
   ViewModule,
   LocationOn,
   Close,
   ErrorOutline,
} from "@mui/icons-material";
import BaseProductCard from "../../Common/BaseProductCard";
const actions = [
   { icon: <ViewModule />, name: "View Selection" },
   { icon: <CalendarMonthOutlined />, name: "Select Tutorial" },
   { icon: <AddShoppingCart />, name: "Add to Cart" },
];
const TutorialProductCard = ({
   producttype = "tutorial",
   hasTutorialSelection = false,
   onOpenTutorialSelection,
   onViewSelection,
   onAddToCart,
   ...props
}) => {
   const [selectedOptions, setSelectedOptions] = useState({
      materials: false,
      recording: false,
   });
   const [isHovered, setIsHovered] = useState(false);
   const [speedDialOpen, setSpeedDialOpen] = useState(false);
   const [overlayCenter, setOverlayCenter] = useState({ x: 0, y: 0 });
   const speedDialWrapperRef = useRef(null);
   const cardRef = useRef(null);
   const theme = useTheme();
   const basePrice = 299;
   const materialsPrice = 99;
   const recordingPrice = 149;
   const [selectedPriceType, setSelectedPriceType] = useState(""); // Empty means standard pricing

   const calculateTotal = () => {
      let total = basePrice;
      if (selectedOptions.materials) total += materialsPrice;
      if (selectedOptions.recording) total += recordingPrice;
      return total;
   };

   const handleOptionChange = (option) => {
      setSelectedOptions((prev) => ({
         ...prev,
         [option]: !prev[option],
      }));
   };

   const handleMouseEnter = () => {
      setIsHovered(true);
   };

   const handleMouseLeave = () => {
      setIsHovered(false);
   };

   const handleSpeedDialOpen = () => {
      setSpeedDialOpen(true);
   };

   const handleSpeedDialClose = () => setSpeedDialOpen(false);

   const handleFabClick = () => {
      if (!hasTutorialSelection) {
         if (typeof onOpenTutorialSelection === "function") {
            onOpenTutorialSelection();
         }
         return;
      }
      setSpeedDialOpen((prev) => !prev);
   };

   const recalcOverlayCenter = () => {
      try {
         const wrapper = speedDialWrapperRef.current;
         if (!wrapper) return;
         const fab = wrapper.querySelector?.(".MuiFab-root");
         const target = fab || wrapper;
         const rect = target.getBoundingClientRect();
         const centerX = rect.left + rect.width / 2;
         const centerY = rect.top + rect.height / 2;
         setOverlayCenter({ x: centerX, y: centerY });
      } catch (_) {
         // ignore
      }
   };

   useEffect(() => {
      if (speedDialOpen) {
         recalcOverlayCenter();
         const onResize = () => recalcOverlayCenter();
         const onScroll = () => recalcOverlayCenter();
         window.addEventListener("resize", onResize);
         window.addEventListener("scroll", onScroll, true);
         return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("scroll", onScroll, true);
         };
      }
   }, [speedDialOpen]);

   return (
      <ThemeProvider theme={theme}>
         <BaseProductCard
            ref={cardRef}
            elevation={2}
            variant="product"
            producttype={producttype}
            className="d-flex flex-column"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            sx={{
               position: "relative",
               transform: isHovered ? "scale(1.02)" : "scale(1)",
               transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            {...props}
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
                  aria-label="Exam session: 25S"
               />
			   <Chip
					label={
						<Box>
							<ErrorOutline/>
							<Typography variant="chip">Full</Typography> 
						</Box>
						}
					size="small"
					className="availability-badge"
					role="img"					
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
                     Birmingham
                  </Typography>
               }
               subheader={
                  <Typography
                     variant="subtitle1"
                     textAlign="left"
                     className="product-subtitle"
                  >
                     CS1 Tutorial
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
                     <Stack direction="column">
                        <Typography variant="caption" className="info-sub-text">
                           • 3 full days
                        </Typography>
                        <Typography variant="caption" className="info-sub-text">
                           • 6-day bundle
                        </Typography>
                     </Stack>
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
                     <Stack direction="column">
                        <Typography variant="caption" className="info-sub-text">
                           • BPP Birmingham
                        </Typography>
                        <Typography variant="caption" className="info-sub-text">
                           • BPP Birmingham 2
                        </Typography>
                     </Stack>
                  </Stack>
               </Box>
               {/* Action buttons merged into Speed Dial below */}
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
                              ? "£239.20"
                              : selectedPriceType === "additional"
                              ? "£149.50"
                              : "£299.00"}
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
                           {selectedPriceType === "retaker" ||
                           selectedPriceType === "additional"
                              ? "Discount applied"
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

                     {/* Tutorial SpeedDial - View Selection, Select Tutorial, Add to Cart */}
                     <Backdrop
                        open={speedDialOpen}
                        onClick={() => setSpeedDialOpen(false)}
                        sx={{
                           position: "fixed",
                           zIndex: (thm) => thm.zIndex.speedDial - 1,
                        }}
                     />
                     <SpeedDial
                        ariaLabel="Tutorial actions"
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
                              backgroundColor: theme.palette.bpp.purple["070"],
                              boxShadow: "var(--Paper-shadow)",
                              "&:hover": {
                                 backgroundColor:
                                    theme.palette.bpp.purple["080"],
                              },
                              "& .MuiSpeedDialIcon-root": {
                                 "& .MuiSvgIcon-root": {
                                    fontSize: "1.6rem",
                                 },
                              },
                           },
                        }}
                     >
                        <SpeedDialAction
                           icon={<AddShoppingCart />}
                           slotProps={{
                              tooltip: { open: true, title: "Add to Cart" },
                           }}
                           sx={{
                              "& .MuiSpeedDialAction-staticTooltipLabel": {
                                 whiteSpace: "nowrap",
                                 maxWidth: "none",
                              },
                              "& .MuiSpeedDialAction-fab": {
                                 color: "white",
                                 backgroundColor:
                                    theme.palette.bpp.purple["060"],
                                 "&:hover": {
                                    backgroundColor:
                                       theme.palette.bpp.purple["070"],
                                 },
                              },
                           }}
                           aria-label="Add to cart"
                           onClick={() => {
                              if (typeof onAddToCart === "function")
                                 onAddToCart();
                              setSpeedDialOpen(false);
                           }}
                        />
                        <SpeedDialAction
                           icon={<CalendarMonthOutlined />}
                           slotProps={{
                              tooltip: { open: true, title: "Select Tutorial" },
                           }}
                           sx={{
                              "& .MuiSpeedDialAction-staticTooltipLabel": {
                                 whiteSpace: "nowrap",
                                 maxWidth: "none",
                              },
                              "& .MuiSpeedDialAction-fab": {
                                 color: "white",
                                 backgroundColor:
                                    theme.palette.bpp.purple["060"],
                                 "&:hover": {
                                    backgroundColor:
                                       theme.palette.bpp.purple["070"],
                                 },
                              },
                           }}
                           aria-label="Select Tutorial"
                           onClick={() => {
                              if (typeof onOpenTutorialSelection === "function")
                                 onOpenTutorialSelection();
                              setSpeedDialOpen(false);
                           }}
                        />
                        <SpeedDialAction
                           icon={<ViewModule />}
                           slotProps={{
                              tooltip: { open: true, title: "View Selection" },
                           }}
                           sx={{
                              "& .MuiSpeedDialAction-staticTooltipLabel": {
                                 whiteSpace: "nowrap",
                                 maxWidth: "none",
                              },
                              "& .MuiSpeedDialAction-fab": {
                                 color: "white",
                                 backgroundColor:
                                    theme.palette.bpp.purple["060"],
                                 "&:hover": {
                                    backgroundColor:
                                       theme.palette.bpp.purple["070"],
                                 },
                              },
                           }}
                           aria-label="View Selection"
                           onClick={() => {
                              if (typeof onViewSelection === "function")
                                 onViewSelection();
                              setSpeedDialOpen(false);
                           }}
                        />
                     </SpeedDial>
                  </Box>
               </Box>
            </CardActions>
         </BaseProductCard>
      </ThemeProvider>
   );
};

export default TutorialProductCard;
