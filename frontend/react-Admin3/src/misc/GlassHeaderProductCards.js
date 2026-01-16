import React, { useState } from "react";
import {
	Box,
	Typography,
	Card,
	CardContent,
	CardHeader,
	CardActions,
	Button,
	Chip,
	Avatar,
	Stack,
	Radio,
	RadioGroup,
	FormControlLabel,
	Tooltip,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
} from "@mui/material";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import {
	LibraryBooksSharp,
	SchoolOutlined,
	Inventory2Outlined,
	ComputerOutlined,
	GradingOutlined,
	QuizOutlined,
	AddShoppingCart,
	InfoOutline,
	CheckCircle,
	CalendarMonth,
	LocationOn,
	AccessTime,
} from "@mui/icons-material";
import colorTheme from "../theme/colorTheme";

// Helper function to convert hex to RGB values
const hexToRgb = (hex) => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
		  }
		: { r: 0, g: 0, b: 0 };
};

// Color configurations for each product type
// Maps glass header colors to valid theme producttype variants
const productColorConfigs = {
	material: {
		name: "Study Material (Cobalt)",
		themeProductType: "material", // Uses sky in theme but we override with cobalt glass header
		primary: colorTheme.palette.cobalt,
		complementary: colorTheme.palette.orange,
		icon: LibraryBooksSharp,
		productTitle: "Mini ASET",
		productSubtitle: "(April 2024 Paper)",
	},
	tutorial: {
		name: "Tutorial (Purple)",
		themeProductType: "tutorial",
		primary: colorTheme.palette.purple,
		complementary: colorTheme.palette.mint,
		icon: SchoolOutlined,
		productTitle: "CS1 Tutorial",
		productSubtitle: "London - April 2025",
	},
	assessment: {
		name: "Assessment (Pink)",
		themeProductType: "marking", // Maps to marking variant (pink header in theme)
		primary: colorTheme.palette.pink,
		complementary: colorTheme.palette.green,
		icon: QuizOutlined,
		productTitle: "Mock Exam Pack",
		productSubtitle: "CM2 - 2025 Session",
	},
	bundle: {
		name: "Bundle (Green)",
		themeProductType: "bundle",
		primary: colorTheme.palette.green,
		complementary: colorTheme.palette.purple,
		icon: Inventory2Outlined,
		productTitle: "Complete Study Pack",
		productSubtitle: "CB1 Bundle",
	},
	"online-classroom": {
		name: "Online Classroom (Sky)",
		themeProductType: "online-classroom",
		primary: colorTheme.palette.sky,
		complementary: colorTheme.palette.orange,
		icon: ComputerOutlined,
		productTitle: "Online Course",
		productSubtitle: "SA2 - Live Sessions",
	},
	marking: {
		name: "Marking Voucher (Orange)",
		themeProductType: "marking",
		primary: colorTheme.palette.orange,
		complementary: colorTheme.palette.sky,
		icon: GradingOutlined,
		productTitle: "Marking Voucher",
		productSubtitle: "CS2 - 3 Submissions",
	},
};

// Glass Header Component with 3 circles
const GlassHeader = ({ producttype, children }) => {
	const config = productColorConfigs[producttype];
	const primary020 = hexToRgb(config.primary["020"]);
	const primary040 = hexToRgb(config.primary["040"]);
	const complementary040 = hexToRgb(config.complementary["040"]);

	const glassHeaderStyle = {
		position: "relative",
		overflow: "hidden",
		background: `linear-gradient(141deg,
			rgba(${primary040.r}, ${primary040.g}, ${primary040.b}, 0.7) -5%,
			rgb(${primary020.r}, ${primary020.g}, ${primary020.b}) 20%,
			rgba(${primary040.r}, ${primary040.g}, ${primary040.b}, 0.7) 95%)`,
	};

	const glassOverlayStyle = {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		background:
			"linear-gradient(173deg, rgba(255, 255, 255, 0.08) 0%, transparent 50%, rgba(0, 0, 0, 0.1) 100%)",
		pointerEvents: "none",
		zIndex: 2,
	};

	const glassShapeBase = {
		position: "absolute",
		borderRadius: "100%",
		pointerEvents: "none",
		zIndex: 1,
	};

	const glassShape1Style = {
		...glassShapeBase,
		width: "160px",
		height: "190.7px",
		top: "-50px",
		right: "-35px",
		background: "rgba(255, 255, 255, 0.06)",
	};

	const glassShape2Style = {
		...glassShapeBase,
		width: "70px",
		height: "70px",
		bottom: "-28px",
		left: "59%",
		background: "rgba(255, 255, 255, 0.07)",
	};

	const glassShape3Style = {
		...glassShapeBase,
		width: "90px",
		height: "90px",
		bottom: "83px",
		left: "-6%",
		background: `rgba(${complementary040.r}, ${complementary040.g}, ${complementary040.b}, 0.07)`,
	};

	return (
		<Box sx={glassHeaderStyle}>
			{/* Glass overlay */}
			<Box sx={glassOverlayStyle} />
			{/* Glass shapes (circles) */}
			<Box sx={glassShape1Style} />
			<Box sx={glassShape2Style} />
			<Box sx={glassShape3Style} />
			{/* Content */}
			<Box sx={{ position: "relative", zIndex: 3 }}>{children}</Box>
		</Box>
	);
};

// Individual Product Card Component
const GlassProductCard = ({ producttype = "material" }) => {
	const theme = useTheme();
	const config = productColorConfigs[producttype];
	const IconComponent = config.icon;
	// Use the themeProductType for proper theme variant styling
	const themeProductType = config.themeProductType || producttype;

	const [selectedVariation, setSelectedVariation] = useState("printed");
	const [selectedPriceType, setSelectedPriceType] = useState("");

	const variationOptions = {
		printed: { price: 45, label: "Printed Version" },
		ebook: { price: 35, label: "eBook Version" },
		both: { price: 65, label: "Printed + eBook" },
	};

	const handleVariationChange = (event) => {
		setSelectedVariation(event.target.value);
	};

	const getPrice = () => {
		const basePrice = variationOptions[selectedVariation].price;
		if (selectedPriceType === "retaker") return (basePrice * 0.8).toFixed(2);
		if (selectedPriceType === "additional")
			return (basePrice * 0.5).toFixed(2);
		return `${basePrice}.00`;
	};

	return (
		<Card
			variant="product"
			producttype={themeProductType}
			elevation={2}
			sx={{
				minWidth: "20rem",
				maxWidth: "20rem",
				height: "31.6rem",
				display: "flex",
				flexDirection: "column",
				overflow: "visible",
				position: "relative",
				// Override the theme's product-header background since GlassHeader applies its own
				"& .product-header": {
					backgroundColor: "transparent !important",
				},
			}}>
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

			{/* Glass Header - Wraps CardHeader with glass effect background + circles */}
			<GlassHeader producttype={producttype}>
				<CardHeader
					className="product-header"
					sx={{
						backgroundColor: "transparent !important",
						height: "7.43rem",
						padding: "1rem",
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "flex-start",
						"& .MuiCardHeader-content": { order: 1, flex: 1 },
						"& .MuiCardHeader-avatar": {
							order: 2,
							marginLeft: "auto",
							marginRight: 0,
						},
					}}
					title={
						<Typography
							variant="h4"
							textAlign="left"
							className="product-title">
							{config.productTitle}
						</Typography>
					}
					subheader={
						<Typography
							variant="subtitle1"
							textAlign="left"
							className="product-subtitle">
							{config.productSubtitle}
						</Typography>
					}
					avatar={
						<Avatar className="product-avatar">
							<IconComponent className="product-avatar-icon" />
						</Avatar>
					}
				/>
			</GlassHeader>

			{/* Card Content */}
			<CardContent sx={{ flex: 1 }}>
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
										p: 1,
										backgroundColor:
											selectedVariation === key
												? "primary.50"
												: "transparent",
										transition: "all 0.2s ease",
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
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
										fontWeight={600}
										sx={{ pr: 2 }}>
										£{option.price}
									</Typography>
								</Box>
							))}
						</Stack>
					</RadioGroup>
				</Box>
			</CardContent>

			{/* Card Actions */}
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

					<Box className="price-action-section">
						<Box className="price-info-row">
							<Typography variant="h3" className="price-display">
								£{getPrice()}
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

// Main Component - Shows all 6 product card variations
const GlassHeaderProductCards = () => {
	const theme = useTheme();

	const producttypes = [
		"material",
		"tutorial",
		"assessment",
		"bundle",
		"online-classroom",
		"marking",
	];

	return (
		<ThemeProvider theme={theme}>
			<Box sx={{ p: 4, backgroundColor: "#2a2a2f", minHeight: "100vh" }}>
				<Typography
					variant="h4"
					sx={{ color: "#fff", mb: 1, textAlign: "center" }}>
					Glass Header Product Cards
				</Typography>
				<Typography
					variant="body1"
					sx={{ color: "#a9a8b0", mb: 4, textAlign: "center" }}>
					Atmospheric monochrome design with glass morphism circles
				</Typography>

				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
						gap: 4,
						justifyItems: "center",
					}}>
					{producttypes.map((type) => (
						<Box key={type} sx={{ textAlign: "center" }}>
							<Typography
								variant="h6"
								sx={{
									color: "#fff",
									mb: 2,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 1,
								}}>
								<Box
									sx={{
										width: 16,
										height: 16,
										borderRadius: 1,
										backgroundColor:
											productColorConfigs[type].primary["040"],
									}}
								/>
								{productColorConfigs[type].name}
							</Typography>
							<GlassProductCard producttype={type} />
						</Box>
					))}
				</Box>
			</Box>
		</ThemeProvider>
	);
};

export default GlassHeaderProductCards;
