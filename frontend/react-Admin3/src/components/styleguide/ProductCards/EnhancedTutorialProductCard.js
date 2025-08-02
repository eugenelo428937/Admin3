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
	Badge,
	Divider,
	Stack,
	Avatar,
	Checkbox,
	FormControlLabel,
	FormGroup,
	Tooltip,
	Radio,
} from "@mui/material";
import {
	School,
	AddShoppingCart,
	Star,
	AccessTime,
	CalendarMonthOutlined,
	InfoOutline,
	ViewModule,
	LocationOn,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const EnhancedTutorialProductCard = ({
	variant = "tutorial-product",
	...props
}) => {
	const [selectedOptions, setSelectedOptions] = useState({
		materials: false,
		recording: false,
	});
	const [isHovered, setIsHovered] = useState(false);
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

	return (
		<Card
			elevation={2}
			variant={variant}
			className="d-flex flex-column"
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
			<CardHeader
				className="product-header"
				title={
					<Typography
						variant="h4"
						textAlign="left"
						className="product-title">
						Birmingham
					</Typography>
				}
				subheader={
					<Typography
						variant="subtitle1"
						textAlign="left"
						className="product-subtitle">
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
							className="info-title">
							<CalendarMonthOutlined className="info-icon" />
							<Typography variant="caption" className="info-text">
								Tutorials available:
							</Typography>
						</Stack>
						<Typography variant="caption" className="info-sub-text">
							• 6 (4 available, 1 partially booked)
						</Typography>
					</Stack>

					<Stack direction="column" className="info-row">
						<Stack
							direction="row"
							alignItems="center"
							className="info-title">
							<ViewModule className="info-icon" />
							<Typography variant="caption" className="info-text">
								Format:
							</Typography>
						</Stack>
						<Typography variant="caption" className="info-sub-text">
							• 3 full days
						</Typography>
						<Typography variant="caption" className="info-sub-text">
							• 6-day bundle
						</Typography>
					</Stack>

					<Stack direction="column" className="info-row">
						<Stack
							direction="row"
							alignItems="center"
							className="info-title">
							<LocationOn className="info-icon" />
							<Typography variant="caption" className="info-text">
								Venue:
							</Typography>
						</Stack>
						<Typography variant="caption" className="info-sub-text">
							• BPP Birmingham
						</Typography>
						<Typography variant="caption" className="info-sub-text">
							• Birmingham Vue Cinema
						</Typography>
					</Stack>
				</Box>
				<Box className="tutorial-action-buttons">
					<Button
						variant="contained"
						size="small"
						color="primary"
						className="select-tutorial-button">
						Select Tutorial
					</Button>
					<Button
						variant="contained"
						size="small"
						color="secondary"
						className="view-selection-button">
						View Selection
					</Button>
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
					{/* Price & Action Section - matches theme structure */}
					<Box className="price-action-section">
						<Box className="price-info-row">
							<Typography variant="h3" className="price-display">
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
								color="text.secondary">
								{selectedPriceType === "retaker" ||
								selectedPriceType === "additional"
									? "Discount applied"
									: "Standard pricing"}
							</Typography>
							<Typography
								variant="fineprint"
								className="vat-status-text"
								color="text.secondary">
								Price includes VAT
							</Typography>
						</Box>
						<Button variant="contained" className="add-to-cart-button">
							<AddShoppingCart />
						</Button>
					</Box>
				</Box>
			</CardActions>
		</Card>
	);
};

export default EnhancedTutorialProductCard;
