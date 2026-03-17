/**
 * MarkingVoucherProductCard Component
 *
 * Specialized product card for marking vouchers following theme.js marking-voucher-product variant.
 * Uses standardized orange theme styling with proper class structure for theme integration.
 */

import React from "react";
import { formatPrice } from "../../../utils/priceFormatter.js";
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
import { ThemeProvider } from "@mui/material/styles";
import { NumberInput, HStack, IconButton as ChakraIconButton } from "@chakra-ui/react";
import { LuMinus, LuPlus } from "react-icons/lu";
import BaseProductCard from "../../Common/BaseProductCard.js";
import useMarkingVoucherProductCardVM from "./useMarkingVoucherProductCardVM";
import type { VoucherCardProps } from "../../../types/browse/browse.types";

const MarkingVoucherProductCard: React.FC<VoucherCardProps> = React.memo(({ voucher }) => {
	const vm = useMarkingVoucherProductCardVM(voucher);

	return (
		<ThemeProvider theme={vm.theme}>
			<BaseProductCard
				elevation={2}
				variant="product"
				producttype="marking-voucher"
				className="d-flex flex-column"
				onMouseEnter={vm.handleMouseEnter}
				onMouseLeave={vm.handleMouseLeave}
				sx={{
					opacity: vm.isAvailable ? 1 : 0.6,
					transform: vm.isHovered ? "scale(1.02)" : "scale(1)",
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
											...(!vm.isAlertExpanded && {
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
											vm.setIsAlertExpanded(!vm.isAlertExpanded)
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
										{vm.isAlertExpanded
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
									value={vm.quantity.toString()}
									onValueChange={vm.handleQuantityChange}
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
											checked={vm.selectedPriceType === "retaker"}
											onClick={() =>
												vm.setSelectedPriceType(
													vm.selectedPriceType === "retaker"
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
											checked={vm.selectedPriceType === "additional"}
											onClick={() =>
												vm.setSelectedPriceType(
													vm.selectedPriceType === "additional"
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
									{formatPrice(vm.totalPrice)}
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
									{vm.quantity} voucher{vm.quantity !== 1 ? "s" : ""} • {formatPrice(vm.basePrice)} each
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
								onClick={vm.handleAddToCart}
								disabled={!vm.isAvailable || vm.isLoading}
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
