/**
 * MarkingVoucherProductCard Component
 *
 * Specialized product card for marking vouchers following theme.js marking-voucher-product variant.
 * Uses standardized orange theme styling with proper class structure for theme integration.
 */

import React, { useState, useMemo } from "react";
import { formatPrice } from "../../../utils/priceFormatter";
import {
	CardHeader,
	CardContent,
	CardActions,
	Typography,
	Box,
	Alert,
	AlertTitle,
	Chip,
	IconButton,
	Avatar,
	FormControlLabel,
	Radio,
	Tooltip,
	Button,
} from "@mui/material";
import {
	ShoppingCart as ShoppingCartIcon,
	Timer as TimerIcon,
	ConfirmationNumberOutlined,
	InfoOutline,
} from "@mui/icons-material";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import { NumberInput, HStack, IconButton as ChakraIconButton } from "@chakra-ui/react";
import { LuMinus, LuPlus } from "react-icons/lu";
import BaseProductCard from "../../Common/BaseProductCard";

const MarkingVoucherProductCard = React.memo(({ voucher, onAddToCart }) => {
	const theme = useTheme();
	const [quantity, setQuantity] = useState(1);
	const [selectedPriceType, setSelectedPriceType] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [isAlertExpanded, setIsAlertExpanded] = useState(false);

	/**
	 * Handle quantity change from NumberInput
	 */
	const handleQuantityChange = (details) => {
		const value = parseInt(details.value);
		if (!isNaN(value) && value >= 1 && value <= 99) {
			setQuantity(value);
		}
	};

	/**
	 * Determine if voucher is available for purchase
	 */
	const isAvailable = useMemo(() => {
		if (!voucher.is_active) return false;
		if (voucher.expiry_date) {
			const expiryDate = new Date(voucher.expiry_date);
			const now = new Date();
			return now <= expiryDate;
		}
		return true;
	}, [voucher.is_active, voucher.expiry_date]);

	/**
	 * Format expiry date for display
	 */
	const formattedExpiryDate = useMemo(() => {
		if (!voucher.expiry_date) return null;
		const date = new Date(voucher.expiry_date);
		return date.toLocaleDateString("en-GB", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	}, [voucher.expiry_date]);

	/**
	 * Get base price from voucher variations
	 */
	const basePrice = useMemo(() => {
		if (voucher.price) {
			return parseFloat(voucher.price);
		}
		if (!voucher.variations || voucher.variations.length === 0) {
			return 0;
		}
		const firstVariation = voucher.variations[0];
		if (!firstVariation.prices || firstVariation.prices.length === 0) {
			return 0;
		}
		return parseFloat(firstVariation.prices[0].amount);
	}, [voucher.variations, voucher.price]);

	/**
	 * Calculate total price based on quantity
	 */
	const totalPrice = basePrice * quantity;

	/**
	 * Handle mouse enter for hover effect
	 */
	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	/**
	 * Handle mouse leave for hover effect
	 */
	const handleMouseLeave = () => {
		setIsHovered(false);
	};

	/**
	 * Handle add to cart action
	 */
	const handleAddToCart = async () => {
		if (!isAvailable || isLoading || !onAddToCart) return;

		setIsLoading(true);
		try {
			// Build voucher metadata for cart including quantity
			const voucherMetadata = {
				type: "MarkingVoucher",
				code: voucher.code,
				name: voucher.name,
				price: basePrice,
				quantity: quantity,
				totalPrice: totalPrice,
				priceType: selectedPriceType || "standard",
				is_active: voucher.is_active,
				expiry_date: voucher.expiry_date,
			};

			// Call parent add to cart handler with metadata
			// Note: The cart service will handle the quantity
			await onAddToCart(voucher, voucherMetadata);
		} catch (error) {
			console.error("Error adding voucher to cart:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<ThemeProvider theme={theme}>
			<BaseProductCard
				elevation={2}
				variant="product"
				productType="marking-voucher"
				className="d-flex flex-column"
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				sx={{
					opacity: isAvailable ? 1 : 0.6,
					transform: isHovered ? "scale(1.02)" : "scale(1)",
					transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
				}}
			>
				{/* Floating Badges */}
				<Box className="floating-badges-container">
					<Chip
						label={
							<Typography variant="chip">
								<TimerIcon className="validity-info-icon" sx={{ mr: 0.5, fontSize: "1rem", verticalAlign: "middle" }} />
								Valid for 4 years
							</Typography>
						}
						size="small"
						className="expiry-badge"
						role="img"
						aria-label="Validity: 4 years"
					/>
				</Box>

				{/* Header with orange theme - follows theme.js structure */}
				<CardHeader
					className="product-header"
					title={
						<Typography
							variant="productTitle"
							textAlign="left"
							className="product-title"
						>
							{voucher.name || "Marking Voucher"}
						</Typography>
					}
					avatar={
						<Avatar className="product-avatar">
							<ConfirmationNumberOutlined className="product-avatar-icon" />
						</Avatar>
					}
				/>

				{/* Content - follows theme.js structure */}
				<CardContent>
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							gap: 1,
							alignItems: "flex-start",
						}}
					>
						{/* Important Info Alert with Expand/Collapse */}
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

						{/* Quantity Section */}
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
											<ChakraIconButton variant="outline" size="xs">
												<LuMinus />
											</ChakraIconButton>
										</NumberInput.DecrementTrigger>
										<NumberInput.ValueText
											textAlign="center"
											fontSize="sm"
											minW="3ch"
										/>
										<NumberInput.IncrementTrigger asChild>
											<ChakraIconButton variant="outline" size="xs">
												<LuPlus />
											</ChakraIconButton>
										</NumberInput.IncrementTrigger>
									</HStack>
								</NumberInput.Root>
							</Box>
						</Box>
					</Box>
				</CardContent>

				{/* Actions - Price and Add to Cart - follows theme.js structure */}
				<CardActions>
					<Box className="price-container">
						{/* Discount Options */}
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

						{/* Price & Action Section */}
						<Box className="price-action-section">
							{/* Price Display */}
							<Box className="price-info-row">
								<Typography variant="price" className="price-display">
									{formatPrice(totalPrice)}
								</Typography>
								<Tooltip title="Show price details">
									<Button size="small" className="info-button">
										<InfoOutline />
									</Button>
								</Tooltip>
							</Box>

							{/* Price Details */}
							<Box className="price-details-row">
								<Typography
									variant="fineprint"
									className="price-level-text"
									color="text.secondary"
								>
									{quantity} voucher{quantity !== 1 ? "s" : ""} • {formatPrice(basePrice)} each
								</Typography>
								<Typography
									variant="fineprint"
									className="vat-status-text"
									color="text.secondary"
								>
									Price includes VAT
								</Typography>
							</Box>

							{/* Add to Cart Button - circular style per theme.js */}
							<IconButton
								className="add-to-cart-button"
								onClick={handleAddToCart}
								disabled={!isAvailable || isLoading}
								aria-label="Add to cart"
							>
								<ShoppingCartIcon />
							</IconButton>
						</Box>
					</Box>
				</CardActions>
			</BaseProductCard>
		</ThemeProvider>
	);
});

MarkingVoucherProductCard.displayName = "MarkingVoucherProductCard";

export default MarkingVoucherProductCard;
