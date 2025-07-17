import React, { useState, useMemo } from "react";
import {
	Button,
	Card,
	CardHeader,
	CardContent,
	CardActions,
	Grid,
	Typography,
	Box,
	Divider,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Tooltip,
	Alert,
	Chip,
} from "@mui/material";
import {
	AddShoppingCart,
	InfoOutline,
	LocalActivityOutlined,
	CalendarMonthOutlined,
} from "@mui/icons-material";
import { useVAT } from "../contexts/VATContext";
import "../styles/product_card.css";
import "../styles/custom-bootstrap.css";

const MarkingVoucherProductCard = React.memo(({ voucher, onAddToCart }) => {
	const [showInfoDialog, setShowInfoDialog] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const { formatPrice } = useVAT();

	// Check if voucher is available
	const isAvailable = useMemo(() => {
		if (!voucher.is_active) return false;
		if (voucher.expiry_date) {
			const expiryDate = new Date(voucher.expiry_date);
			const now = new Date();
			return now <= expiryDate;
		}
		return true;
	}, [voucher.is_active, voucher.expiry_date]);

	// Format expiry date
	const formattedExpiryDate = useMemo(() => {
		if (!voucher.expiry_date) return null;
		const date = new Date(voucher.expiry_date);
		return date.toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}, [voucher.expiry_date]);

	// Calculate days until expiry
	const daysUntilExpiry = useMemo(() => {
		if (!voucher.expiry_date) return null;
		const expiryDate = new Date(voucher.expiry_date);
		const now = new Date();
		const diffTime = expiryDate - now;
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	}, [voucher.expiry_date]);

	// Get urgency status
	const urgencyStatus = useMemo(() => {
		if (!daysUntilExpiry) return null;
		if (daysUntilExpiry <= 0) return 'expired';
		if (daysUntilExpiry <= 7) return 'urgent';
		if (daysUntilExpiry <= 30) return 'warning';
		return 'normal';
	}, [daysUntilExpiry]);

	const handleAddToCart = async () => {
		if (!isAvailable || isLoading) return;

		setIsLoading(true);
		try {
			// Call the onAddToCart with voucher details
			await onAddToCart(voucher, {
				variationId: null,
				variationName: 'Marking Voucher',
				priceType: 'standard',
				actualPrice: voucher.price,
				quantity: 1
			});
		} catch (error) {
			console.error('Failed to add voucher to cart:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleInfoClick = () => {
		setShowInfoDialog(true);
	};

	const handleInfoClose = () => {
		setShowInfoDialog(false);
	};

	return (
		<>
			<Card
				elevation={2}
				className={`product-card d-flex flex-column ${!isAvailable ? 'disabled' : ''}`}
				sx={{
					opacity: isAvailable ? 1 : 0.6,
					position: 'relative'
				}}
			>
				<CardHeader
					title={
						<Box className="d-flex align-items-center">
							<LocalActivityOutlined
								className="me-2"
								sx={{ fontSize: 20 }}
							/>
							<Typography
								variant="h6"
								className="product-title mb-0"
								sx={{ fontSize: "1rem", fontWeight: 600 }}
							>
								{voucher.name}
							</Typography>
						</Box>
					}
					className="product-card-header marking-header"
					sx={{
						backgroundColor: '#ff9800',
						color: 'white',
						'& .MuiCardHeader-title': {
							color: 'white',
						},
					}}
				/>

				<CardContent className="product-card-content">
					{/* Voucher Code */}
					<Box className="mb-2">
						<Chip
							label={voucher.code}
							size="small"
							color="primary"
							variant="outlined"
							sx={{ fontSize: '0.75rem' }}
						/>
					</Box>

					{/* Description */}
					{voucher.description && (
						<Box className="mb-2">
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ fontSize: '0.875rem' }}
							>
								{voucher.description}
							</Typography>
						</Box>
					)}

					{/* Expiry Information */}
					{voucher.expiry_date && (
						<Box className="mb-2">
							<Box className="d-flex align-items-center">
								<CalendarMonthOutlined
									sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }}
								/>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ fontSize: '0.875rem' }}
								>
									Expires: {formattedExpiryDate}
								</Typography>
							</Box>
							
							{urgencyStatus && urgencyStatus !== 'normal' && (
								<Alert
									severity={
										urgencyStatus === 'expired' ? 'error' :
										urgencyStatus === 'urgent' ? 'warning' : 'info'
									}
									sx={{ mt: 1, py: 0.5 }}
									size="small"
								>
									{urgencyStatus === 'expired' 
										? 'Voucher has expired'
										: `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`
									}
								</Alert>
							)}
						</Box>
					)}

					{!voucher.expiry_date && (
						<Box className="mb-2">
							<Chip
								label="No Expiry"
								size="small"
								color="success"
								variant="outlined"
								sx={{ fontSize: '0.75rem' }}
							/>
						</Box>
					)}
				</CardContent>

				<Divider />

				<CardActions className="product-card-actions">
					<Grid container spacing={1} alignItems="center">
						{/* Price Display */}
						<Grid item xs={6}>
							<Box>
								<Typography
									variant="h6"
									className="price-display"
									sx={{ fontSize: '1.125rem', fontWeight: 600 }}
								>
									{formatPrice(voucher.price)}
								</Typography>
								<Typography
									variant="caption"
									color="text.secondary"
									sx={{ fontSize: '0.75rem' }}
								>
									Inc. VAT
								</Typography>
							</Box>
						</Grid>

						{/* Action Buttons */}
						<Grid item xs={6}>
							<Box className="d-flex justify-content-end gap-1">
								<Tooltip title="Voucher Information">
									<Button
										size="small"
										variant="outlined"
										onClick={handleInfoClick}
										sx={{ minWidth: 'auto', p: 1 }}
									>
										<InfoOutline sx={{ fontSize: 16 }} />
									</Button>
								</Tooltip>

								<Tooltip 
									title={
										!isAvailable 
											? 'Voucher not available' 
											: 'Add voucher to cart'
									}
								>
									<span>
										<Button
											size="small"
											variant="contained"
											onClick={handleAddToCart}
											disabled={!isAvailable || isLoading}
											startIcon={<AddShoppingCart sx={{ fontSize: 16 }} />}
											sx={{
												fontSize: '0.75rem',
												backgroundColor: '#ff9800',
												'&:hover': {
													backgroundColor: '#f57c00',
												},
											}}
										>
											{isLoading ? 'Adding...' : 'Add'}
										</Button>
									</span>
								</Tooltip>
							</Box>
						</Grid>
					</Grid>
				</CardActions>
			</Card>

			{/* Information Dialog */}
			<Dialog
				open={showInfoDialog}
				onClose={handleInfoClose}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>
					<Box className="d-flex align-items-center">
						<LocalActivityOutlined className="me-2" />
						Marking Voucher Details
					</Box>
				</DialogTitle>
				<DialogContent>
					<Box className="mb-3">
						<Typography variant="h6" gutterBottom>
							{voucher.name}
						</Typography>
						<Typography variant="subtitle2" color="text.secondary" gutterBottom>
							Code: {voucher.code}
						</Typography>
					</Box>

					{voucher.description && (
						<Box className="mb-3">
							<Typography variant="subtitle1" gutterBottom>
								Description
							</Typography>
							<Typography variant="body2" color="text.secondary">
								{voucher.description}
							</Typography>
						</Box>
					)}

					<Box className="mb-3">
						<Typography variant="subtitle1" gutterBottom>
							Price
						</Typography>
						<Typography variant="h6" color="primary">
							{formatPrice(voucher.price)} <span style={{ fontSize: '0.875rem', color: '#666' }}>Inc. VAT</span>
						</Typography>
					</Box>

					{voucher.expiry_date && (
						<Box className="mb-3">
							<Typography variant="subtitle1" gutterBottom>
								Expiry Date
							</Typography>
							<Typography variant="body2" color="text.secondary">
								{formattedExpiryDate}
								{daysUntilExpiry > 0 && (
									<span> ({daysUntilExpiry} days remaining)</span>
								)}
							</Typography>
						</Box>
					)}

					<Box>
						<Typography variant="subtitle1" gutterBottom>
							Status
						</Typography>
						<Chip
							label={isAvailable ? 'Available' : 'Not Available'}
							color={isAvailable ? 'success' : 'error'}
							size="small"
						/>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleInfoClose}>Close</Button>
					{isAvailable && (
						<Button
							variant="contained"
							onClick={async () => {
								handleInfoClose();
								await handleAddToCart();
							}}
							disabled={isLoading}
							startIcon={<AddShoppingCart />}
							sx={{
								backgroundColor: '#ff9800',
								'&:hover': {
									backgroundColor: '#f57c00',
								},
							}}
						>
							Add to Cart
						</Button>
					)}
				</DialogActions>
			</Dialog>
		</>
	);
});

MarkingVoucherProductCard.displayName = 'MarkingVoucherProductCard';

export default MarkingVoucherProductCard;