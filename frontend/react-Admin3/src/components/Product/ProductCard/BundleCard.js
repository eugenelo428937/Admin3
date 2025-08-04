import React, { useState, useMemo } from "react";
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
} from "@mui/material";
import { InfoOutline, AddShoppingCart, CheckRounded, Inventory2 } from "@mui/icons-material";
import { BoxSeam } from "react-bootstrap-icons";

import { useCart } from "../../../contexts/CartContext";
import { useVAT } from "../../../contexts/VATContext";
import bundleService from "../../../services/bundleService";
import "../../../styles/product_card.css";


const BundleCard = React.memo(({ bundle, onAddToCart }) => {
	const [showContentsModal, setShowContentsModal] = useState(false);
	const [bundleContents, setBundleContents] = useState(null);
	const [loadingContents, setLoadingContents] = useState(false);
	const [selectedPriceType, setSelectedPriceType] = useState("");
	const [isHovered, setIsHovered] = useState(false);

	const { addToCart } = useCart();
	const {
		getPriceDisplay,
		formatPrice,
		isProductVATExempt,
		showVATInclusive,
	} = useVAT();

	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
	};

	// Calculate bundle total price by summing component prices with fallback logic
	const getBundlePrice = useMemo(() => {
		return (priceType = "standard") => {
			if (!bundle.components || bundle.components.length === 0) return null;

			let totalPrice = 0;
			let hasValidPrices = false;

			// Calculate sum of all component prices with fallback to standard if discount not available
			for (const component of bundle.components) {
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

			if (!hasValidPrices) {
				// If no pricing data available, show placeholder
				return (
					<div className="d-flex flex-row align-items-end">
						<Typography variant="h6" className="fw-lighter w-100">
							Contact for pricing
						</Typography>
					</div>
				);
			}

			// Check if bundle product type is VAT exempt
			const isVATExempt = isProductVATExempt(bundle.type || "Bundle");

			// Get price display info from VAT context
			const priceDisplay = getPriceDisplay(
				totalPrice,
				0.2,
				isVATExempt
			);

			return (
				<div className="d-flex flex-row align-items-end">
					<Typography variant="h6" className="fw-lighter w-100">
						{formatPrice(priceDisplay.displayPrice)}
					</Typography>
					<Typography
						variant="caption"
						className="fw-light w-100 align-self-center">
						{priceDisplay.label}
					</Typography>
				</div>
			);
		};
	}, [
		bundle.components,
		bundle.type,
		getPriceDisplay,
		formatPrice,
		isProductVATExempt,
		showVATInclusive,
	]);

	// Check if bundle has pricing for a specific price type
	// Returns true if ANY component has this price type
	// Components without this price type will fallback to standard pricing
	const hasBundlePriceType = (priceType) => {
		if (!bundle.components || bundle.components.length === 0) return false;
		
		return bundle.components.some(component => {
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
					console.log('🛒 [BundleCard] Adding cart item:', {
						productName: cartItem.product.product_name,
						esspId: cartItem.product.essp_id,
						priceInfo: cartItem.priceInfo
					});
					
					const quantity = cartItem.quantity || 1;
					const priceInfoToSend = {
						variationId: cartItem.priceInfo.variationId,
						variationName: cartItem.priceInfo.variationName,
						priceType: cartItem.priceInfo.priceType,
						actualPrice: cartItem.priceInfo.actualPrice,
					};
					
					console.log('🛒 [BundleCard] Sending priceInfo:', priceInfoToSend);
					
					// Add with the correct quantity - CartContext now handles synchronization
					for (let i = 0; i < quantity; i++) {
						// Wait for each add to complete before proceeding to prevent race conditions
						await addToCart(cartItem.product, priceInfoToSend);
					}
				}

				// For bundles, we don't call the onAddToCart callback since we've already
				// processed and added all components. The callback would cause the parent
				// to try adding the bundle itself as a single product, which fails.
				console.log(`✅ Bundle "${bundle.bundle_name}" added successfully: ${result.cartItems.length} items`);
			}
		} catch (error) {
			console.error("Error adding bundle to cart:", error);
		}
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
						<Box>
							<Typography
								variant="body2"
								color="textSecondary"
								className="mb-2">
								This bundle includes {bundleContents.total_components}{" "}
								items:
							</Typography>
						</Box>
						<Box className="d-flex flex-column gap-2">
							<List>
								{bundleContents.components?.map((component, index) => (
									<ListItem key={index} divider>
										<ListItemText
											primary={
												component.shortname ||
												component.product_name
											}
											secondary={
												<>
													<Typography
														variant="caption"
														display="block">
														{component.type} • Quantity:{" "}
														{component.bundle_info?.quantity || 1}
													</Typography>
													{component.bundle_info
														?.variation_name && (
														<Typography
															variant="caption"
															display="block">
															Variation:{" "}
															{
																component.bundle_info
																	.variation_name
															}
														</Typography>
													)}
													{bundle.bundle_type === "exam_session" &&
														component.bundle_info
															?.exam_session_product_code && (
															<Typography
																variant="caption"
																display="block">
																Product Code:{" "}
																{
																	component.bundle_info
																		.exam_session_product_code
																}
															</Typography>
														)}
												</>
											}
										/>
									</ListItem>
								))}
							</List>
						</Box>
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
				variant="bundle-product"
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

				<CardContent>
					<Typography variant="body2" className="bundle-details-title">
						What's included ({bundle.components_count || bundle.components?.length || 0} items)
					</Typography>

					<List dense className="bundle-items-list">
						{bundle.components?.map((component, index) => (
							<ListItem key={component.id || index} className="bundle-list-item">
								<ListItemIcon className="bundle-item-icon">
									<CheckRounded />
								</ListItemIcon>
								<ListItemText
									primary={component.product?.fullname || component.name}
									slotProps={{
										primary: {
											variant: "body2",
											className: "bundle-item-text",
										},
									}}								
								/>
								<Typography
									variant="caption"
									color="text.secondary"
									className="bundle-item-value">
									{/* Component price if available */}
									{component.price || ''}
								</Typography>
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
								<Typography variant="h3" className="price-display">
									{(() => {
										const priceType = selectedPriceType || "standard";
										const priceComponent = getBundlePrice(priceType);
										
										// Extract formatted price from the component
										if (priceComponent && priceComponent.props && priceComponent.props.children) {
											const priceText = priceComponent.props.children[0]?.props?.children;
											return priceText || '-';
										}
										return '-';
									})()}
								</Typography>
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
									Price includes VAT
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
