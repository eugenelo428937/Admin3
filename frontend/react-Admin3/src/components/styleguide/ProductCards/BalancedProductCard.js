import React, { useState, useEffect, useRef } from "react";
import {
	Paper,
	Avatar,
	Box,
	Typography,
	Card,
	CardContent,
	CardHeader,
	CardActions,
	Button,
	Chip,
	Divider,
	Stack,
	Radio,
	RadioGroup,
	FormControlLabel,
	Tooltip,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { createPortal } from "react-dom";
import { useTheme } from "@mui/material/styles";
import {
	LibraryBooksSharp,
	AddShoppingCart,
	InfoOutline,
	CheckCircle,
} from "@mui/icons-material";
import BaseProductCard from "../../Common/BaseProductCard";

const BalancedProductCard = ({ productType = "material", ...props }) => {
	const [selectedVariation, setSelectedVariation] = useState("printed");
	const [selectedPriceType, setSelectedPriceType] = useState(""); // Empty means standard pricing
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [overlayStyle, setOverlayStyle] = useState(null);
  const [showCheck, setShowCheck] = useState(false);
	const theme = useTheme();
	const cardRef = useRef(null);
	const headerRef = useRef(null);

	const variationOptions = {
		printed: {
			price: 45,
			label: "Printed Version",
			description: "Physical study materials",
		},
		ebook: {
			price: 35,
			label: "eBook Version",
			description: "Digital download",
		},
		both: {
			price: 65,
			label: "Printed + eBook",
			description: "Complete package",
		},
	};

	const handleVariationChange = (event) => {
		setSelectedVariation(event.target.value);
	};

	// Initialize mouse position to center
	useEffect(() => {
		setMousePosition({ x: 50, y: 50 });
	}, []);

	const handleMouseMove = (e) => {
		// Calculate mouse position relative to the header, not the entire card
		if (headerRef.current) {
			const rect = headerRef.current.getBoundingClientRect();
			const x = ((e.clientX - rect.left) / rect.width) * 100;
			const y = ((e.clientY - rect.top) / rect.height) * 100;
			setMousePosition({ x, y });
		}
	};

  const handleMouseEnter = () => {
		setIsHovered(true);
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
		setMousePosition({ x: 50, y: 50 }); // Reset to center
	};

  const runAddToCartAnimation = (buttonEl) => {
    if (!buttonEl || animating) return;
    const cartBtn = document.getElementById("main-cart-button");
    if (!cartBtn) return;

    setAnimating(true);
    setShowCheck(false);

    const btnRect = buttonEl.getBoundingClientRect();
    const cartRect = cartBtn.getBoundingClientRect();

    // 1) Expand radial backdrop from button center
    const startX = btnRect.left + btnRect.width / 2;
    const startY = btnRect.top + btnRect.height / 2;

    setOverlayStyle({
      position: "fixed",
      left: 0,
      top: 0,
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: 1300,
      background: `radial-gradient(circle at ${startX}px ${startY}px, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.20) 120px, rgba(0,0,0,0.12) 240px, rgba(0,0,0,0.06) 420px, rgba(0,0,0,0.0) 65%)`,
      opacity: 0,
      transition: "opacity 200ms ease-out",
    });

    requestAnimationFrame(() => {
      setOverlayStyle((prev) => prev && { ...prev, opacity: 1 });
    });

    // 2) Briefly turn button green and swap icon to check
    setTimeout(() => {
      setShowCheck(true);
    }, 120);

    // 3) Collapse backdrop into cart icon
    setTimeout(() => {
      setOverlayStyle((prev) => prev && {
        ...prev,
        background: `radial-gradient(circle at ${cartRect.left + cartRect.width / 2}px ${cartRect.top + cartRect.height / 2}px, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.20) 60px, rgba(0,0,0,0.10) 120px, rgba(0,0,0,0.0) 160px)`,
        opacity: 0,
        transition: "background 300ms ease-in, opacity 200ms ease-in",
      });
    }, 600);

    // 4) Cleanup
    setTimeout(() => {
      setOverlayStyle(null);
      setAnimating(false);
      setShowCheck(false);
    }, 1000);
  };

	// Calculate gradient based on mouse position using theme utility
	const getGradientStyle = () => {
		return theme.gradients.createGradientStyle(
			mousePosition,
			isHovered,
			theme.gradients.colorSchemes.material
		);
	};

	return (
		<ThemeProvider theme={theme}>
			<BaseProductCard
				ref={cardRef}
				elevation={2}
				variant="product"
				productType={productType}
				className="d-flex flex-column"
				onMouseMove={handleMouseMove}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				sx={{
					transform: isHovered ? "scale(1.02)" : "scale(1)",
					transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
				}}
				{...props}>
				{/* Floating Badges */}
				<Box className="floating-badges-container">
					<Chip
						label="CS1"
						size="small"
						className="subject-badge"
						role="img"
						aria-label="Subject: CS1"
					/>
					<Chip
						label="25S"
						size="small"
						className="session-badge"
						role="img"
						aria-label="Exam session: 25S"
					/>
				</Box>
				{/* Enhanced Header - Similar to Variation C */}
				<CardHeader
					ref={headerRef}
					className="product-header"
					title={
						<Typography
							variant="h4"
							textAlign="left"
							className="product-title">
							Mini ASET
						</Typography>
					}
					subheader={
						<Typography
							variant="subtitle1"
							textAlign="left"
							className="product-subtitle">
							(April 2024 Paper)
						</Typography>
					}
					avatar={
						<Avatar className="product-avatar">
							<LibraryBooksSharp className="product-avatar-icon" />
						</Avatar>
					}
					sx={{
						position: "relative",
						"&::before": {
							content: '""',
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							...getGradientStyle(),
							zIndex: 0,
							pointerEvents: "none",
						},
						"& > *": {
							position: "relative",
							zIndex: 1,
						},
					}}
				/>

				<CardContent>
					{/* Enhanced Variations Section - Better hierarchy */}
					<Box className="product-variations">
						<Typography variant="subtitle2" sx={{ mb: 1.5 }}>
							Product Variations
						</Typography>

						<RadioGroup
							value={selectedVariation}
							onChange={handleVariationChange}
							sx={{ width: "100%" }}>
							<Stack spacing={1}>
								{Object.entries(variationOptions).map(
									([key, option]) => (
										<Box
											key={key}
											sx={{
												border: 1,
												borderColor:
													selectedVariation === key
														? "primary.main"
														: "divider",
												borderRadius: 1,
												p: theme.spacing.sm,
												backgroundColor:
													selectedVariation === key
														? "primary.50"
														: "transparent",
												transition: "all 0.2s ease",
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												width: "100%",
											}}>
											<FormControlLabel
												value={key}
												control={<Radio size="small" />}
												label={
													<Typography
														variant="body2"
														fontWeight={
															selectedVariation === key
																? 600
																: 400
														}>
														{option.label}
													</Typography>
												}
												sx={{ mx: 0, flex: 1 }}
											/>
											<Typography
												variant="body2"
												color="primary.main"
												sx={{ paddingRight: "1rem" }}
												fontWeight={600}>
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
											className="discount-label">
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
											className="discount-label">
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
								<Typography variant="h3" className="price-display">
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
									variant="fineprint"
									className="price-level-text"
									color="text.secondary">
									{selectedPriceType === "retaker"
										? "Retaker discount applied"
										: selectedPriceType === "additional"
										? "Additional copy discount applied"
										: "Standard pricing"}
								</Typography>
								<Typography
									variant="fineprint"
									className="vat-status-text"
									color="text.secondary">
									Price includes VAT
								</Typography>
							</Box>

							{/* Add to Cart Button - Always at bottom */}
							<Button
								variant="contained"
								className="add-to-cart-button"
								sx={{
									alignSelf: "stretch",
									transition: "background-color 150ms ease",
									...(showCheck
										? { backgroundColor: "green" }
										: {}),
								}}
								onClick={(e) => runAddToCartAnimation(e.currentTarget)}>
								{showCheck ? <CheckCircle /> : <AddShoppingCart />}
							</Button>
						</Box>
					</Box>
				</CardActions>
			</BaseProductCard>
			{overlayStyle &&
				createPortal(<Box sx={overlayStyle} />, document.body)}
		</ThemeProvider>
	);
};

export default BalancedProductCard;
