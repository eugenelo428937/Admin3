/**
 * MarkingVoucherProductCard Component
 *
 * Specialized product card for marking vouchers following theme.js marking-voucher-product variant.
 * Uses standardized orange theme styling with proper class structure for theme integration.
 */

import React, { useState, useMemo } from "react";
import { formatPrice } from '../../../utils/priceFormatter';
import {
	Card,
	CardHeader,
	CardContent,
	CardActions,
	Typography,
	Box,
	Alert,
	Chip,
	IconButton,
	Avatar,
	Stack
} from "@mui/material";
import {
	ShoppingCart as ShoppingCartIcon,
	Schedule as ScheduleIcon,
	LocalOffer as LocalOfferIcon,
	CheckCircle as CheckCircleIcon
} from "@mui/icons-material";

const MarkingVoucherProductCard = React.memo(({ voucher, onAddToCart }) => {
	const [isLoading, setIsLoading] = useState(false);

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
		return date.toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}, [voucher.expiry_date]);

	/**
	 * Get price from voucher variations
	 */
	const price = useMemo(() => {
		if (voucher.price) {
			return voucher.price;
		}
		if (!voucher.variations || voucher.variations.length === 0) {
			return '0.00';
		}
		const firstVariation = voucher.variations[0];
		if (!firstVariation.prices || firstVariation.prices.length === 0) {
			return '0.00';
		}
		return firstVariation.prices[0].amount;
	}, [voucher.variations, voucher.price]);

	/**
	 * Handle add to cart action
	 */
	const handleAddToCart = async () => {
		if (!isAvailable || isLoading || !onAddToCart) return;

		setIsLoading(true);
		try {
			// Build voucher metadata for cart
			const voucherMetadata = {
				type: 'MarkingVoucher',
				code: voucher.code,
				name: voucher.name,
				price: price,
				is_active: voucher.is_active,
				expiry_date: voucher.expiry_date,
			};

			// Call parent add to cart handler with metadata
			await onAddToCart(voucher, voucherMetadata);
		} catch (error) {
			console.error('Error adding voucher to cart:', error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card
			variant="marking-voucher-product"
			sx={{
				opacity: isAvailable ? 1 : 0.6
			}}
		>
			{/* Floating Badges */}
			<Box className="floating-badges-container">
				{voucher.subject_code && (
					<Chip
						label={voucher.subject_code}
						size="small"
						className="subject-badge"
						role="img"
						aria-label={`Subject: ${voucher.subject_code}`}
					/>
				)}
				{voucher.exam_session_code && (
					<Chip
						label={voucher.exam_session_code}
						size="small"
						className="session-badge"
						role="img"
						aria-label={`Exam session: ${voucher.exam_session_code}`}
					/>
				)}
			</Box>

			{/* Header with orange theme - follows theme.js structure */}
			<CardHeader
				className="product-header"
				title={
					<Typography className="product-title" variant="h4">
						{voucher.name}
					</Typography>
				}
				avatar={
					<Avatar className="product-avatar">
						<LocalOfferIcon className="product-avatar-icon" />
					</Avatar>
				}
			/>

			{/* Content - follows theme.js structure */}
			<CardContent>
				{/* Voucher Code Chip */}
				<Box className="product-chips">
					<Chip
						label={voucher.code}
						color="primary"
						size="small"
						icon={<LocalOfferIcon />}
					/>
				</Box>

				{/* Description */}
				{voucher.description && (
					<Typography className="product-description" variant="body2" color="text.secondary">
						{voucher.description}
					</Typography>
				)}

				{/* Availability Status */}
				<Box className="voucher-info-alert">
					{isAvailable ? (
						<Alert
							severity="success"
							icon={<CheckCircleIcon />}
							sx={{ py: 0.5 }}
						>
							Available for purchase
						</Alert>
					) : (
						<Alert
							severity="warning"
							icon={<ScheduleIcon />}
							sx={{ py: 0.5 }}
						>
							{voucher.expiry_date ? 'Expired' : 'Not available'}
						</Alert>
					)}
				</Box>

				{/* Expiry Information */}
				{formattedExpiryDate && (
					<Box className="voucher-validity-info">
						<Stack className="validity-info-row" direction="row" spacing={1} alignItems="center">
							<ScheduleIcon className="validity-info-icon" />
							<Typography variant="caption" color="text.secondary">
								Valid until: {formattedExpiryDate}
							</Typography>
						</Stack>
					</Box>
				)}
			</CardContent>

			{/* Actions - Price and Add to Cart - follows theme.js structure */}
			<CardActions>
				<Box className="price-container">
					<Box className="price-action-section">
						{/* Price Display */}
						<Box className="price-info-row">
							<Typography className="price-display" variant="h5">
								{formatPrice(price)}
							</Typography>
						</Box>

						{/* VAT Status */}
						<Box className="price-details-row">
							<Typography className="vat-status-text" variant="caption" color="text.secondary">
								Inc. VAT
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
		</Card>
	);
});

MarkingVoucherProductCard.displayName = 'MarkingVoucherProductCard';

export default MarkingVoucherProductCard;