import React, { useState, useEffect, useMemo } from "react";
import {
	Button,
	Card,
	CardHeader,
	CardContent,
	Checkbox,
	CardActions,
	FormControlLabel,
	FormControl,
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
} from "@mui/material";
import {
	InfoOutline,
	AddShoppingCart,
	ArrowRight,
	ArrowDropDown,
} from "@mui/icons-material";
import { useCart } from "../contexts/CartContext";
import { useVAT } from "../contexts/VATContext";
import "../styles/product_card.css";
import "../styles/custom-bootstrap.css";

const OnlineClassroomProductCard = React.memo(
	({ product, onAddToCart }) => {
		const [selectedVariations, setSelectedVariations] = useState([]);
		const [showPriceModal, setShowPriceModal] = useState(false);
		const [selectedPriceType, setSelectedPriceType] = useState("standard");
		const [showDiscounts, setShowDiscounts] = useState(false);

		const { addToCart } = useCart();
		const {
			getPriceDisplay,
			formatPrice,
			isProductVATExempt,
			showVATInclusive,
		} = useVAT();

		// Memoize variation calculations
		const variationInfo = useMemo(() => {
			const hasVariations =
				product.variations && product.variations.length > 0;
			const singleVariation =
				product.variations && product.variations.length === 1
					? product.variations[0]
					: null;

			const currentVariation = hasVariations
				? selectedVariations.length > 0
					? product.variations.find((v) =>
							selectedVariations.includes(v.id)
					  )
					: singleVariation || product.variations[0]
				: singleVariation;

			return { hasVariations, singleVariation, currentVariation };
		}, [product.variations, selectedVariations]);

		// Memoize price calculation to avoid recalculating on every render
		const getPrice = useMemo(() => {
			return (variation, priceType) => {
				if (!variation || !variation.prices) return null;
				const priceObj = variation.prices.find(
					(p) => p.price_type === priceType
				);
				if (!priceObj) return null;

				// Check if this product is VAT exempt
				const isVATExempt = isProductVATExempt(product.type);

				// Get price display info from VAT context
				const priceDisplay = getPriceDisplay(
					priceObj.amount,
					0.2,
					isVATExempt
				);

				return (
					<div className="d-flex flex-row align-items-end">
						<Typography variant="h6" className="fw-lighter w-100">
							{formatPrice(priceDisplay.displayPrice)}
						</Typography>

						<Tooltip
							title="Show all price types"
							placement="top"
							className="d-flex flex-row align-self-start">
							<InfoOutline
								role="button"
								className="text-secondary mx-1 fw-light"
								onClick={() => setShowPriceModal(true)}
								style={{
									cursor: "pointer",
									fontSize: "1rem",
								}}
								aria-label="Show price information"
							/>
						</Tooltip>						
						<Typography
							variant="caption"
							className="fw-light w-100 align-self-center">
							{priceDisplay.label}
						</Typography>
					</div>
				);
			};
		}, [
			getPriceDisplay,
			formatPrice,
			isProductVATExempt,
			product.type,
			showVATInclusive,
		]);

		const { hasVariations, singleVariation, currentVariation } =
			variationInfo;

		const hasPriceType = (variation, priceType) => {
			if (!variation || !variation.prices) return false;
			return variation.prices.some((p) => p.price_type === priceType);
		};

		// Reset price type to standard if current selection is not available for the current variation
		useEffect(() => {
			if (currentVariation && selectedPriceType !== "standard") {
				if (!hasPriceType(currentVariation, selectedPriceType)) {
					setSelectedPriceType("standard");
				}
			}
		}, [currentVariation, selectedPriceType]);

		const handlePriceTypeChange = (priceType) => {
			if (selectedPriceType === priceType) {
				setSelectedPriceType("standard");
			} else {
				setSelectedPriceType(priceType);
			}
		};

		const handleVariationChange = (variationId, checked) => {
			if (checked) {
				setSelectedVariations((prev) => [...prev, variationId]);
			} else {
				setSelectedVariations((prev) =>
					prev.filter((id) => id !== variationId)
				);
			}
		};

		const renderPriceModal = () => (
			<Dialog
				open={showPriceModal}
				onClose={() => setShowPriceModal(false)}
				maxWidth="md"
				fullWidth>
				<DialogTitle>
					<Typography variant="h6">Price Information</Typography>
				</DialogTitle>
				<DialogContent>
					<Box sx={{ mb: 2 }}>
						<Typography variant="body2" color="text.secondary">
							Subject: {product.subject_code}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Product Name: {product.product_name}
						</Typography>
					</Box>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Variation</TableCell>
								<TableCell>Price Type</TableCell>
								<TableCell>Price</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{product.variations &&
								product.variations.map(
									(variation) =>
										variation.prices &&
										variation.prices.map((price) => (
											<TableRow
												key={`${variation.id}-${price.price_type}`}>
												<TableCell>{variation.name}</TableCell>
												<TableCell>{price.price_type}</TableCell>
												<TableCell>
													{(() => {
														const priceDisplay = getPrice(
															variation,
															price.price_type
														);
														if (priceDisplay) {
															return priceDisplay;
														}
														return formatPrice(price.amount);
													})()}
												</TableCell>
											</TableRow>
										))
								)}
						</TableBody>
					</Table>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowPriceModal(false)}>Close</Button>
				</DialogActions>
			</Dialog>
		);

		// Render Online Classroom Content
		const renderContent = () => (
			<>
				<CardContent
					className="d-flex flex-column pb-0"
					sx={{ marginTop: "0" }}>
					<Box
						sx={{ height: "5rem" }}
						className="d-flex align-items-center">
						<Typography variant="h5" className="mb-0">
							{product.product_name}
						</Typography>
					</Box>

					{/* Variation Section - Fixed height for alignment */}
					<Box sx={{ width: "100%", height: "5.5rem", mt: 2 }}>
						<Typography
							variant="subtitle2"
							color="text.secondary"
							sx={{ mb: 1 }}>
							Variation:
						</Typography>

						{singleVariation && (
							<FormControl
								component="fieldset"
								size="small"
								sx={{ width: "100%" }}>
								<FormControlLabel
									control={
										<Checkbox
											size="small"
											checked={true}
											disabled={true}
											className="m-0 align-items-center p-0 me-2"
											sx={{
												"& .MuiSvgIcon-root": {
													fontSize: 14,
												},
											}}
										/>
									}
									label={singleVariation.name}
									sx={{
										margin: 0,
										"& .MuiFormControlLabel-label": {
											fontSize: "0.875rem",
										},
									}}
								/>
							</FormControl>
						)}

						{hasVariations && !singleVariation && (
							<FormControl
								component="fieldset"
								size="small"
								sx={{ width: "100%" }}>
								<Box className="d-flex flex-column">
									{product.variations.map((variation) => (
										<FormControlLabel
											key={variation.id}
											className="d-flex flex-row"
											control={
												<Checkbox
													size="small"
													checked={selectedVariations.includes(
														variation.id
													)}
													onChange={(e) =>
														handleVariationChange(
															variation.id,
															e.target.checked
														)
													}
													sx={{
														"& .MuiSvgIcon-root": {
															fontSize: 14,
														},
													}}
													className="m-0 align-items-center p-0 me-2"
												/>
											}
											label={variation.name}
											sx={{
												margin: 0,
												"& .MuiFormControlLabel-label": {
													fontSize: "0.875rem",
												},
											}}
										/>
									))}
								</Box>
							</FormControl>
						)}
					</Box>
				</CardContent>

				<Divider />

				<CardActions sx={{ px: 2, py: 1 }} className="d-flex w-100">
					<Grid container spacing={0} className="w-100 mb-3">
						<Grid size={12} sx={{ height: "4rem" }}>
							<Typography
								variant="body2"
								color="text-primary"
								sx={{ cursor: "pointer" }}
								onClick={() => setShowDiscounts(!showDiscounts)}
								role="button"
								aria-expanded={showDiscounts}
								aria-label="Toggle discount options">
								Discounts:
								{showDiscounts ? <ArrowDropDown /> : <ArrowRight />}
							</Typography>

							{showDiscounts && (
								<>
									<Box className="d-flex flex-row ps-2">
										<FormControlLabel
											control={
												<Checkbox
													size="small"
													className="p-0 mx-1"
													checked={selectedPriceType === "retaker"}
													disabled={
														!hasPriceType(
															currentVariation,
															"retaker"
														)
													}
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
													color: !hasPriceType(
														currentVariation,
														"retaker"
													)
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
													checked={
														selectedPriceType === "additional"
													}
													disabled={
														!hasPriceType(
															currentVariation,
															"additional"
														)
													}
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
													color: !hasPriceType(
														currentVariation,
														"additional"
													)
														? "text.disabled"
														: "inherit",
												},
											}}
										/>
									</Box>
								</>
							)}
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
									{getPrice(currentVariation, selectedPriceType) || (
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
								onClick={() => {
									if (singleVariation) {
										// Handle single variation
										const priceObj = singleVariation.prices?.find(
											(p) => p.price_type === selectedPriceType
										);
										onAddToCart(product, {
											variationId: singleVariation.id,
											variationName: singleVariation.name,
											priceType: selectedPriceType,
											actualPrice: priceObj?.amount,
										});
									} else if (selectedVariations.length > 0) {
										// Handle multiple variations - add each as separate cart item
										selectedVariations.forEach((variationId) => {
											const variation = product.variations.find(
												(v) => v.id === variationId
											);
											const priceObj = variation?.prices?.find(
												(p) => p.price_type === selectedPriceType
											);
											onAddToCart(product, {
												variationId: variation.id,
												variationName: variation.name,
												priceType: selectedPriceType,
												actualPrice: priceObj?.amount,
											});
										});
									}
								}}
								disabled={
									hasVariations &&
									!singleVariation &&
									selectedVariations.length === 0
								}
								aria-label="Add product to cart"
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
			</>
		);

		return (
			<Card
				elevation={2}
				className="product-card d-flex flex-column justify-content-between">
				<CardHeader
					title={
						<Typography variant="h6" className="mb-0">
							Subject {product.subject_code} - Online Classroom
						</Typography>
					}					s
					className="product-card-header d-flex align-items-center online-classroom-header"					
				/>

				{renderContent()}
				{renderPriceModal()}
			</Card>
		);
	}
);

export default OnlineClassroomProductCard; 