import React, { useEffect, useMemo } from "react";
import {
	Button,
	Card,
	CardHeader,
	CardContent,
	CardActions,
	Checkbox,
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
	Alert,
	CircularProgress,
	Chip,
	FormLabel,
} from "@mui/material";
import {
	AddShoppingCart,
	InfoOutline,
	ArrowRight,
	ArrowDropDown,
	Warning,
	RuleOutlined,
	CalendarMonthOutlined,
} from "@mui/icons-material";
import productService from "../../../services/productService";
import { useVAT } from "../../../contexts/VATContext";
import "../../../styles/product_card.css";


const MarkingProductCard = React.memo(({
	product,
	onAddToCart,
	allEsspIds,
	bulkDeadlines,
}) => {
	const [deadlines, setDeadlines] = React.useState([]);
	const [loading, setLoading] = React.useState(true);
	const [showModal, setShowModal] = React.useState(false);
	const [showPriceModal, setShowPriceModal] = React.useState(false);
	const [selectedVariations, setSelectedVariations] = React.useState([]);
	const [selectedPriceType, setSelectedPriceType] = React.useState("standard");
	const [showDiscounts, setShowDiscounts] = React.useState(false);
	const [showExpiredWarning, setShowExpiredWarning] = React.useState(false);

	const { getPriceDisplay, formatPrice, isProductVATExempt, showVATInclusive } = useVAT();

	// Memoize variation calculations for performance
	const variationInfo = useMemo(() => {
		const hasVariations = product.variations && product.variations.length > 0;
		const singleVariation = product.variations && product.variations.length === 1
			? product.variations[0]
			: null;
		const currentVariation = hasVariations
			? (selectedVariations.length > 0 
				? product.variations.find((v) => selectedVariations.includes(v.id)) 
				: singleVariation || product.variations[0])
			: singleVariation;

		return { hasVariations, singleVariation, currentVariation };
	}, [product.variations, selectedVariations]);

	const { hasVariations, singleVariation, currentVariation } = variationInfo;

	// Memoize price calculation
	const getPrice = useMemo(() => {
		return (variation, priceType) => {
			if (!variation || !variation.prices) return null;
			const priceObj = variation.prices.find((p) => p.price_type === priceType);
			if (!priceObj) return null;

			// Check if this product is VAT exempt
			const isVATExempt = isProductVATExempt(product.type);
			
			// Get price display info from VAT context
			const priceDisplay = getPriceDisplay(priceObj.amount, 0.20, isVATExempt);
			
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
	}, [getPriceDisplay, formatPrice, isProductVATExempt, product.type, showVATInclusive]);

	React.useEffect(() => {
		setLoading(true);
		const esspId = product.id || product.product_id;
		// Only call single API if bulkDeadlines is undefined (not just empty)
		if (bulkDeadlines && esspId in bulkDeadlines) {
			setDeadlines(bulkDeadlines[esspId] || []);
			setLoading(false);
		} else if (bulkDeadlines && Object.keys(bulkDeadlines).length === 0) {
			// Do nothing, wait for bulkDeadlines to be populated
			setLoading(true);
		} else if (esspId) {
			// fallback: only for single product view
			productService.getMarkingDeadlines(esspId).then((data) => {
				setDeadlines(data || []);
				setLoading(false);
			});
		} else {
			setDeadlines([]);
			setLoading(false);
		}
	}, [product, bulkDeadlines]);

	const now = new Date();
	const parsedDeadlines = deadlines.map((d) => ({
		...d,
		deadline: new Date(d.deadline),
		recommended_submit_date: new Date(d.recommended_submit_date),
	}));
	const upcoming = parsedDeadlines
		.filter((d) => d.deadline > now)
		.sort((a, b) => a.deadline - b.deadline);
	const expired = parsedDeadlines
		.filter((d) => d.deadline <= now)
		.sort((a, b) => b.deadline - a.deadline);
	const allExpired =
		deadlines.length > 0 && expired.length === deadlines.length;

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

	const handleAddToCart = () => {
		if (expired.length > 0 && !allExpired) {
			// Some deadlines are expired but not all - show warning
			setShowExpiredWarning(true);
		} else {
			// No expired deadlines or all expired (shouldn't reach here if all expired due to disabled button)
			addToCartConfirmed();
		}
	};

	const handleVariationChange = (variationId, checked) => {
		if (checked) {
			setSelectedVariations(prev => [...prev, variationId]);
		} else {
			setSelectedVariations(prev => prev.filter(id => id !== variationId));
		}
	};

	const addToCartConfirmed = () => {
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
			selectedVariations.forEach(variationId => {
				const variation = product.variations.find(v => v.id === variationId);
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
		setShowExpiredWarning(false);
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
							product.variations.map((variation) =>
								variation.prices &&
								variation.prices.map((price) => (
									<TableRow key={`${variation.id}-${price.price_type}`}>
										<TableCell>{variation.name}</TableCell>
										<TableCell>{price.price_type}</TableCell>
										<TableCell>
											{(() => {
												const priceDisplay = getPrice(variation, price.price_type);
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

	return (
		<>
			<Card elevation={2} className="product-card d-flex flex-column">
				<CardHeader
					title={
						<Box className="d-flex flex-row w-100 align-items-center justify-content-between mb-2">
							<Typography variant="h6" className="mb-0 w-75">
								{product.product_name}
							</Typography>
							<RuleOutlined />
						</Box>
					}
					className="product-card-header marking-header"
				/>

				<CardContent
					className="d-flex flex-column pb-0 product-card-content"
					sx={{ marginTop: "0" }}>
					<Box className="d-flex flex-row w-100 align-items-center mb-2">
						<Chip
							variant="outlined"
							label={product.subject_code}
							clickable={false}
						/>
						{/* <Chip
								variant="outlined"
								label={product.exam_session_code}
								clickable={false}
							/> */}
					</Box>
					{/* Deadline Information */}
					<Box sx={{ width: "100%", mt: 0, mb: 0 }}>
						{loading && (
							<Box className="d-flex align-items-center mb-2">
								<CircularProgress size={16} sx={{ mr: 1 }} />
								<Typography variant="caption" color="text.secondary">
									Loading deadlines...
								</Typography>
							</Box>
						)}
						{!loading && deadlines.length > 0 && (
							<Box sx={{ m: 0, p: 0 }} className="justify-content-start">
								{/* Deadline Status */}
								<Box sx={{ mb: 0, p: 0 }}>
									{expired.length > 0 && !allExpired && (
										<Box sx={{ mb: 0, p: 0 }}>
											<Alert
												severity="warning"
												sx={{ p: 0, backgroundColor: "#fff" }}>
												<Typography variant="body2">
													{expired.length} deadline
													{expired.length > 1 ? "s" : ""} overdue
												</Typography>
											</Alert>
										</Box>
									)}
									{upcoming.length > 0 && (
										<Box sx={{ mb: 2 }}>
											<Typography
												variant="body2"
												color="text.secondary">
												Upcoming deadline:{" "}
												{upcoming[0].deadline.toLocaleDateString()}
											</Typography>
											{/* <Typography
												variant="body2"
												color="text.secondary">
												Recommended submission:{" "}
												{upcoming[0].recommended_submit_date.toLocaleDateString()}
											</Typography> */}
										</Box>
									)}
									{allExpired && (
										<Box sx={{ mb: 2 }} className="align-self-end">
											<Alert
												severity="error"
												sx={{ p: 0, backgroundColor: "#fff" }}>
												<Typography variant="body2">
													All deadlines have expired
												</Typography>
											</Alert>
										</Box>
									)}
								</Box>
								{/* View Deadlines Button */}
								<Box
									sx={{ mb: 0 }}
									className="d-flex justify-content-center">
									<Button
										variant="outlined"
										size="small"
										onClick={() => setShowModal(true)}
										color={allExpired ? "error" : "primary"}>
										<CalendarMonthOutlined className="me-1" />
										{allExpired
											? "All Deadlines Expired"
											: "View Deadlines"}
										{upcoming.length > 0 &&
											` (${upcoming.length} upcoming)`}
									</Button>
								</Box>
							</Box>
						)}
					</Box>

					{/* Variation Section - Fixed height for alignment */}
					<Box
						sx={{ width: "100%", height: "5.5rem", mt: 2 }}
						className="d-none">
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

				<CardActions
					sx={{ px: 2, py: 1 }}
					className="d-flex w-100 product-card-actions">
					<Grid container spacing={0} className="w-100 mb-2">
						<Grid size={12}>
							<Box className="d-flex flex-row ps-2 mb-2">
								<FormControlLabel
									control={
										<Checkbox
											size="small"
											className="p-0 mx-1"
											checked={selectedPriceType === "retaker"}
											disabled={
												!hasPriceType(currentVariation, "retaker")
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

								<FormControlLabel
									control={
										<Checkbox
											size="small"
											checked={selectedPriceType === "additional"}
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
								onClick={handleAddToCart}
								disabled={
									allExpired ||
									(hasVariations &&
										!singleVariation &&
										selectedVariations.length === 0)
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
				{renderPriceModal()}
			</Card>

			{/* Marking Deadlines Modal */}
			<Dialog
				open={showModal}
				onClose={() => setShowModal(false)}
				maxWidth="lg"
				fullWidth>
				<DialogTitle>Marking Deadlines</DialogTitle>
				<DialogContent>
					<Box sx={{ mb: 2 }}>
						<Typography variant="body2">
							<strong>Subject:</strong> {product.subject_code}
						</Typography>
						<Typography variant="body2">
							<strong>Marking Product:</strong> {product.product_name}
						</Typography>
					</Box>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell></TableCell>
								<TableCell align="center">
									Recommended Submission Date
								</TableCell>
								<TableCell align="center">Deadline</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{parsedDeadlines
								.sort((a, b) => a.deadline - b.deadline)
								.map((d, i) => {
									const isRecommendedExpired =
										d.recommended_submit_date < now;
									const isDeadlineExpired = d.deadline < now;
									return (
										<TableRow key={i}>
											<TableCell align="center">{d.name}</TableCell>
											<TableCell
												align="center"
												sx={{
													color: isRecommendedExpired
														? "error.main"
														: "inherit",
												}}>
												{isRecommendedExpired && (
													<Warning
														sx={{ fontSize: "1rem", mr: 0.5 }}
													/>
												)}
												{d.recommended_submit_date.toLocaleDateString()}
											</TableCell>
											<TableCell
												align="center"
												sx={{
													color: isDeadlineExpired
														? "error.main"
														: "inherit",
												}}>
												{isDeadlineExpired && (
													<Warning
														sx={{ fontSize: "1rem", mr: 0.5 }}
													/>
												)}
												{d.deadline.toLocaleDateString()}
											</TableCell>
										</TableRow>
									);
								})}
						</TableBody>
					</Table>
				</DialogContent>
				<DialogActions>
					<Button variant="outlined" onClick={() => setShowModal(false)}>
						Close
					</Button>
					<Button
						variant="contained"
						color="success"
						disabled={allExpired}
						onClick={() => {
							if (expired.length > 0 && !allExpired) {
								setShowExpiredWarning(true);
								setShowModal(false);
							} else {
								addToCartConfirmed();
								setShowModal(false);
							}
						}}
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 1,
						}}>
						<AddShoppingCart sx={{ fontSize: "1.1rem" }} />
						Add to Cart
					</Button>
				</DialogActions>
			</Dialog>

			{/* Expired Deadline Warning Modal */}
			<Dialog
				open={showExpiredWarning}
				onClose={() => setShowExpiredWarning(false)}
				maxWidth="sm">
				<DialogTitle sx={{ color: "warning.main" }}>
					<Warning sx={{ mr: 1 }} />
					Warning: Expired Deadlines
				</DialogTitle>
				<DialogContent>
					<Typography variant="body1" sx={{ mb: 2 }}>
						This marking product has <strong>{expired.length}</strong>{" "}
						expired deadline{expired.length > 1 ? "s" : ""}. Adding this
						product to your cart may not be useful as some submission
						deadlines have already passed.
					</Typography>
					<Typography variant="body1">
						Are you sure you want to continue?
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button
						variant="outlined"
						onClick={() => setShowExpiredWarning(false)}>
						Cancel
					</Button>
					<Button
						variant="contained"
						color="warning"
						onClick={addToCartConfirmed}>
						Add to Cart Anyway
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
});

export default MarkingProductCard;
