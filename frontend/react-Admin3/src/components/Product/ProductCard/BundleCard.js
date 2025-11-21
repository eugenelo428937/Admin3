import React, { useState, useMemo, useEffect } from "react";
import {
	Button,
	Card,
	CardHeader,
	CardContent,
	CardActions,
	Typography,
	Box,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Tooltip,
	Chip,
	List,
	ListItem,
	ListItemText,
	ListItemIcon,
	Radio,
	FormControlLabel,
	Avatar,
	useTheme,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Divider,
	CircularProgress
} from "@mui/material";
import { InfoOutline, AddShoppingCart, CheckRounded, Inventory2 } from "@mui/icons-material";
import { BoxSeam } from "react-bootstrap-icons";

import { useCart } from "../../../contexts/CartContext";
import bundleService from "../../../services/bundleService";
import "../../../styles/product_card.css";

const BundleCard = React.memo(({ bundle, onAddToCart }) => {
	const theme = useTheme();
	const [showContentsModal, setShowContentsModal] = useState(false);
	const [bundleContents, setBundleContents] = useState(null);
	const [loadingContents, setLoadingContents] = useState(false);
	const [selectedPriceType, setSelectedPriceType] = useState("");
	const [isHovered, setIsHovered] = useState(false);
	const [loadingPrices, setLoadingPrices] = useState(true);

	const { addToCart } = useCart();

	// Fetch full bundle contents with prices on mount
	useEffect(() => {
		const fetchBundleData = async () => {
			setLoadingPrices(true);
			try {
				const response = await bundleService.getBundleContents(bundle.id);
				if (response.success) {
					setBundleContents(response.data);
				}
			} catch (error) {
				console.error("Error fetching bundle prices:", error);
			} finally {
				setLoadingPrices(false);
			}
		};

		fetchBundleData();
	}, [bundle.id]);

	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
	};

	// Calculate bundle total price by summing component prices with fallback logic
	const getBundlePrice = useMemo(() => {
		return (priceType = "standard") => {
			// Use fetched bundleContents if available, otherwise fall back to bundle prop
			const components = bundleContents?.components || bundle.components;

			if (!components || components.length === 0) return null;

			let totalPrice = 0;
			let hasValidPrices = false;

			// Calculate sum of all component prices with fallback to standard if discount not available
			for (const component of components) {
				// Check if component has pricing information (new API structure)
				if (component.prices && Array.isArray(component.prices)) {
					// First try to find the requested price type
					let priceObj = component.prices.find(
						(p) => p.price_type === priceType
					);
					
					// If requested price type not found, fallback to standard price
					if (!priceObj || !priceObj.amount) {
						priceObj = component.prices.find(
							(p) => p.price_type === "standard"
						);
					}
					
					if (priceObj && priceObj.amount) {
						const quantity = component.quantity || 1;
						totalPrice += parseFloat(priceObj.amount) * quantity;
						hasValidPrices = true;
					}
				}
			}

			return hasValidPrices ? totalPrice : null;
		};
	}, [
		bundleContents,
		bundle.components,
		bundle.type
	]);

	// Check if bundle has pricing for a specific price type
	// Returns true if ANY component has this price type
	// Components without this price type will fallback to standard pricing
	const hasBundlePriceType = (priceType) => {
		// Use fetched bundleContents if available, otherwise fall back to bundle prop
		const components = bundleContents?.components || bundle.components;

		if (!components || components.length === 0) return false;

		return components.some(component => {
			// Check if component has pricing information (new API structure)
			if (component.prices && Array.isArray(component.prices)) {
				return component.prices.some(p => p.price_type === priceType);
			}
			return false;
		});
	};

	// Handle price type change for discounts
	const handlePriceTypeChange = (priceType) => {
		if (selectedPriceType === priceType) {
			setSelectedPriceType("");
		} else {
			setSelectedPriceType(priceType);
		}
	};

	// Fetch bundle contents when modal is opened
	const handleShowContents = async () => {
		setShowContentsModal(true);
		if (!bundleContents) {
			setLoadingContents(true);
			try {
				const response = await bundleService.getBundleContents(bundle.id);
				if (response.success) {
					setBundleContents(response.data);
				}
			} catch (error) {
				console.error("Error fetching bundle contents:", error);
			} finally {
				setLoadingContents(false);
			}
		}
	};

	// Handle adding bundle to cart
	const handleAddToCart = async () => {
		try {
			// Process bundle for cart - this will convert bundle into individual products
			// Pass the selected price type to handle discount pricing
			const result = await bundleService.processBundleForCart(
				bundle, 
				selectedPriceType
			);

			if (result.success && result.cartItems) {
				// Add each component product to cart sequentially to avoid overwriting
				for (const cartItem of result.cartItems) {
					
					
					const quantity = cartItem.quantity || 1;
					const priceInfoToSend = {
						variationId: cartItem.priceInfo.variationId,
						variationName: cartItem.priceInfo.variationName,
						priceType: cartItem.priceInfo.priceType,
						actualPrice: cartItem.priceInfo.actualPrice,
					};

					// Add with the correct quantity - CartContext now handles synchronization
					for (let i = 0; i < quantity; i++) {
						// Wait for each add to complete before proceeding to prevent race conditions
						await addToCart(cartItem.product, priceInfoToSend);
					}
				}

				// For bundles, we don't call the onAddToCart callback since we've already
				// processed and added all components. The callback would cause the parent
				// to try adding the bundle itself as a single product, which fails.

			}
		} catch (error) {
			console.error("Error adding bundle to cart:", error);
		}
	};

	// Helper function to format price
	const formatPrice = (amount) => {
		if (!amount) return 'N/A';
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(amount);
	};

	// Helper function to get component price
	const getComponentPrice = (component, priceType = "standard") => {
		if (!component.prices || !Array.isArray(component.prices)) return null;

		// Try to find the requested price type
		let priceObj = component.prices.find(p => p.price_type === priceType);

		// Fallback to standard if requested type not found
		if (!priceObj || !priceObj.amount) {
			priceObj = component.prices.find(p => p.price_type === "standard");
		}

		return priceObj?.amount || null;
	};

	const renderContentsModal = () => (
		<Dialog
			open={showContentsModal}
			onClose={() => setShowContentsModal(false)}
			maxWidth="md"
			fullWidth>
			<DialogTitle>
				<Box
					display="flex"
					alignItems="center"
					justifyContent="space-between">
					<Box display="flex" alignItems="center">
						<BoxSeam style={{ marginRight: 8 }} />
						Bundle Contents: {bundle.bundle_name}
					</Box>
				</Box>
			</DialogTitle>
			<DialogContent>
				{loadingContents ? (
					<Typography>Loading bundle contents...</Typography>
				) : bundleContents ? (
					<Box>
						<Box mb={2}>
							<Typography
								variant="body2"
								color="textSecondary">
								This bundle includes {bundleContents.total_components}{" "}
								items:
							</Typography>
						</Box>

						{/* Price Breakdown Table */}
						<TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell><strong>Product</strong></TableCell>
										<TableCell align="center"><strong>Qty</strong></TableCell>
										<TableCell align="right"><strong>Unit Price</strong></TableCell>
										<TableCell align="right"><strong>Total</strong></TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{bundleContents.components?.map((component, index) => {
										const quantity = component.quantity || 1;
										const priceType = selectedPriceType || "standard";
										const unitPrice = getComponentPrice(component, priceType);
										const totalPrice = unitPrice ? unitPrice * quantity : null;

										return (
											<TableRow key={index} hover>
												<TableCell>
													<Typography variant="body2">
														{component.product?.fullname || component.shortname || component.product_name}
													</Typography>
													{component.product_variation?.name && (
														<Typography variant="caption" color="textSecondary" display="block">
															{component.product_variation.name}
														</Typography>
													)}
												</TableCell>
												<TableCell align="center">
													<Typography variant="body2">
														{quantity}
													</Typography>
												</TableCell>
												<TableCell align="right">
													<Typography variant="body2">
														{formatPrice(unitPrice)}
													</Typography>
												</TableCell>
												<TableCell align="right">
													<Typography variant="body2" fontWeight="medium">
														{formatPrice(totalPrice)}
													</Typography>
												</TableCell>
											</TableRow>
										);
									})}
									{/* Total Row */}
									<TableRow>
										<TableCell colSpan={3} align="right">
											<Typography variant="subtitle1" fontWeight="bold">
												Bundle Total:
											</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="h6" fontWeight="bold" color="primary">
												{(() => {
													const priceType = selectedPriceType || "standard";
													let total = 0;
													bundleContents.components?.forEach(component => {
														const quantity = component.quantity || 1;
														const price = getComponentPrice(component, priceType);
														if (price) total += price * quantity;
													});
													return formatPrice(total);
												})()}
											</Typography>
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</TableContainer>

						{/* Price Type Info */}
						{selectedPriceType && (
							<Box sx={{ p: 1, bgcolor: 'info.lighter', borderRadius: 1 }}>
								<Typography variant="caption" color="info.main">
									{selectedPriceType === "retaker" ? "Retaker discount applied" :
									 selectedPriceType === "additional" ? "Additional copy discount applied" :
									 "Standard pricing"}
								</Typography>
							</Box>
						)}
					</Box>
				) : (
					<Typography>No bundle contents available</Typography>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={() => setShowContentsModal(false)}>Close</Button>
			</DialogActions>
		</Dialog>
	);

	return (
		<>
			<Card
				elevation={2}
				variant="product"
				productType="bundle"
				className="d-flex flex-column"
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				sx={{                 
					transform: isHovered ? 'scale(1.02)' : 'scale(1)',
					transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
				}}>
				{/* Floating Badges */}
				<Box className="floating-badges-container">
					<Chip
						label={bundle.subject_code}
						size="small"
						className="subject-badge"
						role="img"
						aria-label={`Subject: ${bundle.subject_code}`}
						elevation={4}
					/>
					{bundle.exam_session_code && (
						<Chip
							label={bundle.exam_session_code}
							size="small"
							className="session-badge"
							role="img"
							aria-label={`Exam session: ${bundle.exam_session_code}`}
							elevation={4}
						/>
					)}
				</Box>
				<CardHeader
					className="product-header"
					title={
						<Typography
							variant="h4"
							textAlign="left"
							className="product-title">
							{bundle.bundle_name}
							<Tooltip
								className="title-info-tooltip-button"
								title={
									<Typography
										variant="body2"
										color="white"
										padding="0.618rem"
										className="title-info-tooltip-title">
										The products for this bundle are shown separately in your shopping cart. 
										If there's anything you don't want then you can remove it in the shopping cart page as normal.
									</Typography>
								}
								slotProps={{
									popper: {
										sx: {
											width: "20rem",
											boxShadow: "var(--Paper-shadow)",
										},
									},
								}}
								placement="bottom-start"
								arrow>
								<Button size="small" className="title-info-button" onClick={handleShowContents}>
									<InfoOutline />
								</Button>
							</Tooltip>
						</Typography>
					}
					avatar={
						<Avatar className="product-avatar">
							<Inventory2 className="product-avatar-icon" />
						</Avatar>
					}
				/>

				<CardContent sx={{
					maxHeight: '280px',
					overflowY: 'auto',
					paddingBottom: 1,
					'&::-webkit-scrollbar': {
						width: '8px',
					},
					'&::-webkit-scrollbar-track': {
						backgroundColor: 'rgba(0, 0, 0, 0.05)',
						borderRadius: '4px',
					},
					'&::-webkit-scrollbar-thumb': {
						backgroundColor: 'rgba(0, 0, 0, 0.2)',
						borderRadius: '4px',
						'&:hover': {
							backgroundColor: 'rgba(0, 0, 0, 0.3)',
						},
					},
				}}>
					<Typography variant="subtitle2" className="bundle-details-title">
						What's included ({bundle.components_count || bundle.components?.length || 0} items)
					</Typography>

					<List dense>
						{bundle.components?.map((component, index) => (
							<ListItem key={component.id || index} className="bundle-list-item">
								<ListItemIcon>
									<CheckRounded />
								</ListItemIcon>
								<ListItemText
									primary={component.product?.fullname || component.name}
									secondary={component.product_variation?.description_short || component.product_variation?.name || ''}
									slotProps={{
										primary: {
											variant: "caption",											
										},
										secondary:{
											variant: "caption2",
										}
									}}								
								/>								
							</ListItem>
						))}
					</List>
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
												handlePriceTypeChange("retaker")
											}
											size="small"
											disabled={!hasBundlePriceType("retaker")}
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
												handlePriceTypeChange("additional")
											}
											size="small"
											disabled={!hasBundlePriceType("additional")}
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
							<Box className="price-info-row">
								{loadingPrices ? (
									<CircularProgress size={24} />
								) : (
									<Typography variant="price" className="price-display">
										{(() => {
											const priceType = selectedPriceType || "standard";
											const totalPrice = getBundlePrice(priceType);

											if (totalPrice === null) {
												return 'Contact for pricing';
											}

											return formatPrice(totalPrice);
										})()}
									</Typography>
								)}
								<Tooltip title="Show price details">
									<Button size="small" className="info-button" onClick={handleShowContents}>
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
									{bundle.vat_status_display || "Price includes VAT"}
								</Typography>
							</Box>

							<Button
								variant="contained"
								className="add-to-cart-button"
								onClick={handleAddToCart}
								aria-label="Add bundle to cart">
								<AddShoppingCart />
							</Button>
						</Box>
					</Box>
				</CardActions>
			</Card>

			{renderContentsModal()}
		</>
	);
});

BundleCard.displayName = "BundleCard";

export default BundleCard;
