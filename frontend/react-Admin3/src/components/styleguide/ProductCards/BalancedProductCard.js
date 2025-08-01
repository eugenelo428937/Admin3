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
import { useTheme } from "@mui/material/styles";
import {
	LibraryBooksSharp,
	AddShoppingCart,
	InfoOutline,
} from "@mui/icons-material";

// Variation B: Enhanced Balanced & Traditional
const BalancedProductCard = ({ variant = "material-product", ...props }) => {
	const [selectedVariation, setSelectedVariation] = useState("printed");
	const [selectedPriceType, setSelectedPriceType] = useState(""); // Empty means standard pricing
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const [isHovered, setIsHovered] = useState(false);
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

	// Calculate gradient based on mouse position using theme utility
	const getGradientStyle = () => {
		return theme.gradients.createGradientStyle(
			mousePosition, 
			isHovered, 
			theme.gradients.colorSchemes.material
		);
	};

	// Debug: Log theme values to console
	console.log("Theme Debug:", {
		md3Available: !!theme.palette.md3,
		onPrimary: theme.palette.md3?.onPrimary,
		fullMd3: theme.palette.md3,
		variant: variant,
	});

	return (
		<Card
			ref={cardRef}
			elevation={2}
			variant={variant}
			className="d-flex flex-column"
			onMouseMove={handleMouseMove}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			sx={{ 				
				transform: isHovered ? 'scale(1.02)' : 'scale(1)',
				transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
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
					position: 'relative',
					'&::before': {
						content: '""',
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						...getGradientStyle(),
						zIndex: 0,
						pointerEvents: 'none',
					},
					'& > *': {
						position: 'relative',
						zIndex: 1,
					}
				}}
			/>

			<CardContent>
				{/* Enhanced Chips Section - More prominent */}
				<Box className="product-chips">
					<Chip label="CS1" variant="filled" color="primary" />
					<Chip label="2024A" variant="filled" color="secondary" />
				</Box>

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
							{Object.entries(variationOptions).map(([key, option]) => (
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
													selectedVariation === key ? 600 : 400
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
							))}
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
											variationOptions[selectedVariation].price * 0.8
									  ).toFixed(2)}`
									: selectedPriceType === "additional"
									? `£${(
											variationOptions[selectedVariation].price * 0.5
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
							sx={{ alignSelf: "stretch" }}>
							<AddShoppingCart />
						</Button>
					</Box>
				</Box>
			</CardActions>
		</Card>
	);
};

export default BalancedProductCard;
