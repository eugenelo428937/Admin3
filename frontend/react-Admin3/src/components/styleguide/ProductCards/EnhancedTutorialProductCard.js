import React, { useState } from 'react';
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
  Radio
} from '@mui/material';
import {
  School,
  AddShoppingCart,
  Star,
  AccessTime,
  CalendarMonthOutlined,
  InfoOutline
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const EnhancedTutorialProductCard = ({ variant = "tutorial-product", ...props }) => {
	const [selectedOptions, setSelectedOptions] = useState({
		materials: false,
		recording: false,
	});
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

	return (
		<Card
			elevation={2}
			variant={variant}
			className="d-flex flex-column"
			{...props}>
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
				{/* Enhanced Chips Section - More prominent */}
				<Box className="product-chips">
					<Chip label="CS1" variant="filled" color="primary" />
					<Chip label="2024A" variant="filled" color="secondary" />
				</Box>

				<Box sx={{ mb: 2 }}>
					{/* Number of tutorials : 6 */}
					{/* Venue available: */}
					{/*  BPP Birmingham */}
					{/* Birmingham Vue Cinema */}
					{/* Format: */}
					{/* 3 full days */}
					{/* 6-day bundle */}
					{/* Select tutorial button */}
					<Stack
						direction="row"
						spacing={1}
						alignItems="center"
						sx={{ mb: 1 }}>
						<CalendarMonthOutlined
							sx={{ fontSize: 16, color: "text.secondary" }}
						/>
						<Typography variant="caption"></Typography>
					</Stack>
					<Stack direction="row" spacing={1} alignItems="center">
						<AccessTime sx={{ fontSize: 16, color: "text.secondary" }} />
						<Typography variant="caption">2 days • 9am-5pm</Typography>
					</Stack>
				</Box>

				<Divider sx={{ my: 2 }} />
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
						<Box className="price-info">
							<Typography variant="h3" className="price-display">
								{selectedPriceType === "retaker"
									? "£36.00"
									: selectedPriceType === "additional"
									? "£22.50"
									: "£45.00"}
							</Typography>
							<Tooltip title="Show price details">
								<Button size="small" className="info-button">
									<InfoOutline />
								</Button>
							</Tooltip>
						</Box>
						<Button variant="contained" className="add-to-cart-button">
							<AddShoppingCart />
						</Button>
					</Box>
				</Box>
				{/* Status Text */}
				<Typography variant="caption" className="status-text">
					{selectedPriceType === "retaker"
						? "Retaker discount applied"
						: selectedPriceType === "additional"
						? "Additional copy discount applied"
						: "Standard pricing"}{" "}
					• Price includes VAT
				</Typography>
			</CardActions>
		</Card>
	);
};

export default EnhancedTutorialProductCard;