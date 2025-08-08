import React, { useEffect, useMemo, useState } from "react";
import {
	Alert,
	AlertTitle,
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Tooltip,
	Chip,
	Stack,
	Avatar,
	Radio,
	FormControlLabel,
} from "@mui/material";
import {
	AddShoppingCart,
	InfoOutline,
	Warning,
	RuleOutlined,
	CalendarMonthOutlined,
} from "@mui/icons-material";
import productService from "../../../services/productService";
import { useVAT } from "../../../contexts/VATContext";
import "../../../styles/product_card.css";

const MarkingProductCard = React.memo(
	({ product, onAddToCart, allEsspIds, bulkDeadlines }) => {
		const [deadlines, setDeadlines] = React.useState([]);
		const [loading, setLoading] = React.useState(true);
		const [showModal, setShowModal] = React.useState(false);
		const [showPriceModal, setShowPriceModal] = React.useState(false);
		const [selectedVariations, setSelectedVariations] = React.useState([]);
		const [selectedPriceType, setSelectedPriceType] = React.useState("");
		const [showExpiredWarning, setShowExpiredWarning] = React.useState(false);
		const [isHovered, setIsHovered] = useState(false);

		const {
			getPriceDisplay,
			formatPrice,
			isProductVATExempt,
			showVATInclusive,
		} = useVAT();

		// Memoize variation calculations for performance
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

		const { hasVariations, singleVariation, currentVariation } =
			variationInfo;

		// Memoize price calculation
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

		// Handle hover effects
		const handleMouseEnter = () => {
			setIsHovered(true);
		};

		const handleMouseLeave = () => {
			setIsHovered(false);
		};

		// Determine deadline scenario based on actual conditions
		const getDeadlineScenario = () => {
			if (loading) {
				return {
					type: "info",
					icon: CalendarMonthOutlined,
					message: "Loading deadlines...",
					bgColor: "grey.50",
					borderColor: "grey.300",
					textColor: "grey.700",
				};
			}

			if (deadlines.length === 0) {
				return {
					type: "info",
					icon: CalendarMonthOutlined,
					message: "No upcoming deadlines",
					submessage: "Check back later for new submissions.",
					bgColor: "grey.50",
					borderColor: "grey.300",
					textColor: "grey.700",
				};
			}

			if (allExpired) {
				return {
					type: "error",
					icon: CalendarMonthOutlined,
					message: "All deadlines expired",
					submessage: "Consider using Marking Voucher instead.",
					bgColor: "error.50",
					borderColor: "error.light",
					textColor: "error.dark",
				};
			}

			if (expired.length > 0) {
				return {
					type: "warning",
					icon: CalendarMonthOutlined,
					message: `${expired.length}/${deadlines.length} deadlines expired`,
					submessage: "Consider using Marking Voucher instead.",
					bgColor: "error.50",
					borderColor: "error.light",
					textColor: "error.dark",
				};
			}

			// Check if upcoming deadline is within 7 days
			if (upcoming.length > 0) {
				const nextDeadline = upcoming[0].deadline;
				const daysDiff = Math.ceil(
					(nextDeadline - new Date()) / (1000 * 60 * 60 * 24)
				);

				if (daysDiff <= 7) {
					return {
						type: "warning",
						icon: CalendarMonthOutlined,
						message: `Next deadline: ${nextDeadline.toLocaleDateString()}`,
						submessage: `Deadline due in ${daysDiff} day${
							daysDiff !== 1 ? "s" : ""
						}.`,
						bgColor: "warning.50",
						borderColor: "warning.light",
						textColor: "warning.dark",
					};
				}
			}

			// All available - no issues
			if (upcoming.length > 0) {
				return {
					type: "info",
					icon: CalendarMonthOutlined,
					message: `Next deadline: ${upcoming[0].deadline.toLocaleDateString()}`,
					bgColor: "info.50",
					borderColor: "info.light",
					textColor: "info.dark",
				};
			}

			return {
				type: "info",
				icon: CalendarMonthOutlined,
				message: "No deadline information available",
				bgColor: "grey.50",
				borderColor: "grey.300",
				textColor: "grey.700",
			};
		};

		const currentDeadlineScenario = getDeadlineScenario();

		const hasPriceType = (variation, priceType) => {
			if (!variation || !variation.prices) return false;
			return variation.prices.some((p) => p.price_type === priceType);
		};

		// Auto-select single variation
		useEffect(() => {
			if (singleVariation && selectedVariations.length === 0) {
				setSelectedVariations([singleVariation.id]);
			}
		}, [singleVariation, selectedVariations.length]);

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
				setSelectedPriceType("");
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

		const addToCartConfirmed = () => {
			const finalPriceType = "standard";

			if (selectedVariations.length > 0) {
				// Handle selected variations (including auto-selected single variations)
				selectedVariations.forEach((variationId) => {
					const variation = product.variations.find(
						(v) => v.id === variationId
					);
					const priceObj = variation?.prices?.find(
						(p) => p.price_type === finalPriceType
					);
					onAddToCart(product, {
						variationId: variation.id,
						variationName: variation.name,
						priceType: finalPriceType,
						actualPrice: priceObj?.amount,
					});
				});
			} else if (singleVariation) {
				// Handle single variation (fallback if auto-selection didn't work)
				const priceObj = singleVariation.prices?.find(
					(p) => p.price_type === finalPriceType
				);
				onAddToCart(product, {
					variationId: singleVariation.id,
					variationName: singleVariation.name,
					priceType: finalPriceType,
					actualPrice: priceObj?.amount,
				});
			} else if (!hasVariations) {
				// Handle products without variations OR marking products where variations weren't loaded
				// For marking products, try to get the price from currentVariation if available,
				// otherwise let backend determine the price
				let actualPrice = null;
				if (currentVariation && currentVariation.prices) {
					const priceObj = currentVariation.prices.find(
						(p) => p.price_type === finalPriceType
					);
					actualPrice = priceObj?.amount || null;
				}

				onAddToCart(product, {
					priceType: finalPriceType,
					actualPrice: actualPrice,
					variationId: currentVariation?.id,
					variationName: currentVariation?.name,
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

		return (
			<>
				<Card
					elevation={2}
					variant="marking-product"
					className="d-flex flex-column"
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
					sx={{
						transform: isHovered ? "scale(1.02)" : "scale(1)",
						transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
						width: "100%",
						margin: 0,
						padding: 0,
						display: "flex",
						flexDirection: "column",
						height: "100%",
						"& .MuiCardHeader-root": {
							width: "100%",
						},
					}}>
					{/* Floating Badges */}
					<Box className="floating-badges-container">
						<Chip
							label={product.subject_code}
							size="small"
							className="subject-badge"
							role="img"
							aria-label={`Subject: ${product.subject_code}`}
						/>
						<Chip
							label="25S"
							size="small"
							className="session-badge"
							role="img"
							aria-label="Exam session: 25S"
						/>
					</Box>

					<CardHeader
						className="product-header"
						title={
							<Typography variant="h4" className="product-title">
								{product.product_name}
							</Typography>
						}
						avatar={
							<Avatar className="product-avatar">
								<RuleOutlined className="product-avatar-icon" />
							</Avatar>
						}
					/>

					<CardContent
						sx={{
							alignSelf: "flex-start",
							width: "100%",
							flex: 1,
							display: "flex",
							flexDirection: "column",
							justifyContent: "flex-start",
						}}>
						{/* Number of submissions info */}
						<Stack
							direction="column"
							spacing={1}
							className="marking-submissions-info">
							<Stack
								direction="row"
								alignItems="center"
								spacing={1}
								className="submissions-info-row">
								<CalendarMonthOutlined className="submissions-info-icon" />
								<Typography
									variant="body2"
									color="text.secondary"
									className="submissions-info-title">
									Number of submissions:
								</Typography>
								<Typography
									variant="body2"
									className="submissions-info-count">
									{deadlines.length}
								</Typography>
							</Stack>
						</Stack>

						<Alert
							severity={currentDeadlineScenario.type}
							sx={{ textAlign: "left" }}>
							<AlertTitle>{currentDeadlineScenario.message}</AlertTitle>
							{currentDeadlineScenario.submessage}
						</Alert>

						{/* Submission Deadlines Button */}
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								width: "100%",
							}}>
							<Button
								variant="outlined"
								size="small"
								className="submission-deadlines-button"
								onClick={() => setShowModal(true)}
								color={allExpired ? "error" : "primary"}>
								{allExpired
									? "All Deadlines Expired"
									: "Submission Deadlines"}
								{upcoming.length > 0 &&
									` (${upcoming.length} upcoming)`}
							</Button>
						</Box>
					</CardContent>

					<CardActions>
						{/* Discount Options Section - matches theme structure */}
						<Box className="price-container">
							<Box className="discount-options">
								<Typography
									variant="subtitle2"
									className="discount-title">
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
												disabled={
													!hasPriceType(
														currentVariation,
														"retaker"
													)
												}
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
												disabled={
													!hasPriceType(
														currentVariation,
														"additional"
													)
												}
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
							{/* Price & Action Section - matches theme structure */}
							<Box className="price-action-section">
								<Box className="price-info-row">
									<Typography variant="h3" className="price-display">
										{(() => {
											const finalPriceType = "standard";
											const priceResult = getPrice(
												currentVariation,
												finalPriceType
											);
											if (
												priceResult &&
												typeof priceResult === "object" &&
												priceResult.props
											) {
												// Extract price from the JSX structure
												const priceElement =
													priceResult.props.children[0];
												if (
													priceElement &&
													priceElement.props &&
													priceElement.props.children
												) {
													return priceElement.props.children;
												}
											}
										})()}
									</Typography>
									<Tooltip title="Show price details">
										<Button
											size="small"
											className="info-button"
											onClick={() => setShowPriceModal(true)}>
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
									disabled={
										allExpired ||
										(hasVariations &&
											!singleVariation &&
											selectedVariations.length === 0)
									}
									sx={{ alignSelf: "stretch" }}>
									<AddShoppingCart />
								</Button>
							</Box>
						</Box>
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
												<TableCell align="center">
													{d.name}
												</TableCell>
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
						<Button
							variant="outlined"
							onClick={() => setShowModal(false)}>
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
							expired deadline{expired.length > 1 ? "s" : ""}. Adding
							this product to your cart may not be useful as some
							submission deadlines have already passed.
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
	}
);

export default MarkingProductCard;
