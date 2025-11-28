import React, { useState } from "react";
import {
	Alert,
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
import { NumberInput } from '@chakra-ui/react';
import BaseProductCard from "../../Common/BaseProductCard";

const MarkingVoucherProductCard = ({ productType = "marking-voucher" }) => {
	const theme = useTheme();
	const [quantity, setQuantity] = useState(1);
	const [isHovered, setIsHovered] = useState(false);
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
			productType={productType}
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
						className="product-title">
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
				<Alert severity="info" className="voucher-info-alert">
					<Typography variant="caption" className="alert-text">
						To ensure that your script is returned before the date of the
						exam, please adhere to the explicit Marking Voucher deadline
						dates in each session.
					</Typography>
				</Alert>

				<Box className="voucher-validity-info">
					<Stack
						direction="row"
						spacing={1}
						alignItems="center"
						className="validity-info-row">
						<Timer className="validity-info-icon" />
						<Typography variant="caption" className="validity-info-text">
							Valid for 4 years
						</Typography>
					</Stack>
				</Box>

				<Box className="voucher-quantity-section">
					<Typography
						variant="body2"
						className="quantity-label"
						sx={{ mb: 1 }}>
						Quantity
					</Typography>
					<Box className="quantity-input-container">
						<NumberInput.Root 
							value={quantity.toString()}
							onValueChange={handleQuantityChange}
							min={1}
							max={99}
							width="120px"
							className="chakra-number-input"
						>
							<NumberInput.Control />
							<NumberInput.Input className="quantity-input-field" />
						</NumberInput.Root>
					</Box>
				</Box>
			</CardContent>

			<CardActions>
				<Box className="price-container">
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
								color="text.secondary">
								{quantity} voucher{quantity !== 1 ? "s" : ""} • £
								{basePrice} each
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
		</BaseProductCard>
		</ThemeProvider>
	);
};

export default MarkingVoucherProductCard;
