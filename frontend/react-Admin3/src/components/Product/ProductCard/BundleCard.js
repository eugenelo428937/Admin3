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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Tooltip,
	Chip,
	List,
	ListItem,
	ListItemText,
	Checkbox,
	FormControlLabel,
} from "@mui/material";
import { InfoOutline, AddShoppingCart, LocalOffer, ArrowRight, ArrowDropDown } from "@mui/icons-material";
import { BoxSeam } from "react-bootstrap-icons";

import { useCart } from "../../../contexts/CartContext";
import { useVAT } from "../../../contexts/VATContext";
import bundleService from "../../../services/bundleService";
import "../../../styles/product_card.css";


const BundleCard = React.memo(({ bundle, onAddToCart }) => {
	const [showContentsModal, setShowContentsModal] = useState(false);
	const [bundleContents, setBundleContents] = useState(null);
	const [loadingContents, setLoadingContents] = useState(false);
	const [selectedPriceType, setSelectedPriceType] = useState("standard");
	const [showDiscounts, setShowDiscounts] = useState(false);

	const { addToCart } = useCart();
	const {
		getPriceDisplay,
		formatPrice,
		isProductVATExempt,
		showVATInclusive,
	} = useVAT();

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
			setSelectedPriceType("standard");
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
				// Add each component product to cart with correct parameters
				// Note: useCart addToCart always adds quantity 1, so we call it multiple times for higher quantities
				for (const cartItem of result.cartItems) {
					console.log('🛒 [BundleCard] Adding cart item:', {
						productName: cartItem.product.product_name,
						esspId: cartItem.product.essp_id,
						priceInfo: cartItem.priceInfo
					});
					
					const quantity = cartItem.quantity || 1;
					for (let i = 0; i < quantity; i++) {
						const priceInfoToSend = {
							variationId: cartItem.priceInfo.variationId,
							variationName: cartItem.priceInfo.variationName,
							priceType: cartItem.priceInfo.priceType,
							actualPrice: cartItem.priceInfo.actualPrice,
						};
						
						console.log('🛒 [BundleCard] Sending priceInfo:', priceInfoToSend);
						
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
												<Box>
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
												</Box>
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
			<Card className={`product-card h-100 `}>
				<CardHeader
					title={
						<Box
							display="flex"
							alignItems="center"
							justifyContent="space-between">
							<Typography variant="h6" className="fw-normal">
								{bundle.bundle_name}
							</Typography>
							<BoxSeam />
						</Box>
					}
					className="product-card-header bundle-header"
				/>

				<CardContent className="flex-grow-1 pb-0 product-card-content">
					<Box className="d-flex flex-row w-100 align-items-center">
						<Chip
							variant="outlined"
							label={bundle.subject_code}
							clickable={false}
							slotProps={{ root: { className: "subject-chip" } }}
							className="mx-1 "
						/>
						<Chip
							variant="outlined"
							label={bundle.exam_session_code}
							clickable={false}
							className="mx-1 session-chip"
						/>
					</Box>
					<Tooltip title="View bundle contents">
						<Button
							size="small"
							endIcon={<InfoOutline />}
							onClick={handleShowContents}
							className="mb-0">
							Bundle includes {bundle.components_count} items :
						</Button>
					</Tooltip>
					{/* List  */}
					<List dense={true} disablePadding={true}>
						{bundle.components?.map((component) => (
							<ListItem
								key={component.id}
								className="mx-1 my-0"
								disablePadding={true}>
								<ListItemText
									className="my-0"
									primary={
										<Box>
											<Typography
												variant="caption"
												className="fw-bolder me-2">
												{component.product.fullname}
											</Typography>
											<Typography variant="caption">
												{
													component.product_variation
														?.variation_type
												}
											</Typography>
										</Box>
									}
								/>
							</ListItem>
						))}
					</List>
				</CardContent>

				<Divider />

				<CardActions
					sx={{ px: 2, py: 1 }}
					className="d-flex w-100 product-card-actions">
					<Grid container spacing={0} className="w-100 mb-2">
						<Grid size={12}>
							{/* <Typography
								variant="body2"
								color="text.primary"
								sx={{ cursor: "pointer" }}
								onClick={() => setShowDiscounts(!showDiscounts)}
								role="button"
								aria-expanded={showDiscounts}
								aria-label="Toggle discount options">
								Discounts:
								{showDiscounts ? <ArrowDropDown /> : <ArrowRight />}
							</Typography> */}

							<Box className="d-flex flex-row ps-2 mb-2">
								<FormControlLabel
									control={
										<Checkbox
											size="small"
											className="p-0 mx-1"
											checked={selectedPriceType === "retaker"}
											disabled={!hasBundlePriceType("retaker")}
											onChange={() =>
												handlePriceTypeChange("retaker")
											}
											sx={{
												"& .MuiSvgIcon-root": {
													fontSize: 14,
												},
											}}
										/>
									}
									label="Retaker"
									sx={{
										"& .MuiFormControlLabel-label": {
											fontSize: "0.875rem",
											color: !hasBundlePriceType("retaker")
												? "text.disabled"
												: "inherit",
										},
									}}
								/>

								<br />

								<FormControlLabel
									control={
										<Checkbox
											size="small"
											checked={selectedPriceType === "additional"}
											disabled={!hasBundlePriceType("additional")}
											onChange={() =>
												handlePriceTypeChange("additional")
											}
											className="p-0 mx-1"
											sx={{
												"& .MuiSvgIcon-root": {
													fontSize: 14,
												},
											}}
										/>
									}
									label="Additional Copy"
									sx={{
										"& .MuiFormControlLabel-label": {
											fontSize: "0.875rem",
											color: !hasBundlePriceType("additional")
												? "text.disabled"
												: "inherit",
										},
									}}
								/>
							</Box>
						</Grid>
						<Grid size={8} className="d-flex justify-content-start">
							<Box
								sx={{
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
								}}>
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										mb: 1,
									}}>
									{getBundlePrice(selectedPriceType) || (
										<Typography variant="h6" className="fw-bolder">
											-
										</Typography>
									)}
								</Box>
							</Box>
						</Grid>
						<Grid size={4} className="d-flex justify-content-end">
							<Button
								color="success"
								variant="contained"
								size="small"
								onClick={handleAddToCart}
								aria-label="Add bundle to cart"
								sx={{
									borderRadius: "50%",
									minWidth: "2rem",
									width: "2rem",
									height: "2rem",
									padding: "4px",
								}}>
								<AddShoppingCart sx={{ fontSize: "1.1rem" }} />
							</Button>
						</Grid>
					</Grid>
				</CardActions>
			</Card>

			{renderContentsModal()}
		</>
	);
});

BundleCard.displayName = "BundleCard";

export default BundleCard;
