import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import {
	Button,
	Card,
	CardHeader,
	CardContent,
	CardActions,
	Typography,
	Box,
	Grid,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Divider,
	Chip,
	Stack,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Checkbox,
	FormControlLabel,
	FormLabel,
	Alert,
	CircularProgress,
	Tooltip,
} from "@mui/material";
import {
	AddShoppingCart,
	InfoOutline,
	ArrowRight,
	ArrowDropDown,
	QuestionAnswerOutlined,
} from "@mui/icons-material";
import { useCart } from "../contexts/CartContext";
import tutorialService from "../services/tutorialService";
import { useVAT } from "../contexts/VATContext";
import "../styles/product_card.css";
import "../styles/custom-bootstrap.css";

/**
 * TutorialProductCard
 * Shows tutorial products for a specific subject and location
 * Allows users to select tutorial variations with choice preferences (1st, 2nd, 3rd)
 * For Online Classroom products (recordings), uses the same layout as normal ProductCard
 */
const TutorialProductCard = React.memo(
	({
		subjectCode,
		subjectName,
		location,
		productId,
		product,
		variations: preloadedVariations = null,
	}) => {
		const [variations, setVariations] = useState(preloadedVariations || []);
		const [loading, setLoading] = useState(!preloadedVariations);
		const [error, setError] = useState(null);
		const [selectedChoices, setSelectedChoices] = useState({});
		const [expanded, setExpanded] = useState(false);
		const [showDetailModal, setShowDetailModal] = useState(false);

		// States for Online Classroom products (same as regular ProductCard)
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

		// Memoize expensive calculations
		const productChecks = useMemo(
			() => ({
				isOnlineClassroom:
					product.product_name
						?.toLowerCase()
						.includes("online classroom") ||
					product.product_name?.toLowerCase().includes("recording") ||
					product.learning_mode === "LMS" ||
					!variations.some((v) => v.events && v.events.length > 0),
			}),
			[product.product_name, product.learning_mode, variations]
		);

		const { isOnlineClassroom } = productChecks;

		// Memoize variation info
		const variationInfo = useMemo(() => {
			const hasVariations = variations && variations.length > 0;
			const singleVariation =
				variations && variations.length === 1 ? variations[0] : null;
			const currentVariation = hasVariations
				? selectedVariations.length > 0
					? variations.find((v) => selectedVariations.includes(v.id))
					: singleVariation || variations[0]
				: singleVariation;

			return { hasVariations, singleVariation, currentVariation };
		}, [variations, selectedVariations]);

		const { hasVariations, singleVariation, currentVariation } =
			variationInfo;

		const hasPriceType = (variation, priceType) => {
			if (!variation || !variation.prices) return false;
			return variation.prices.some((p) => p.price_type === priceType);
		};

		// Memoize price calculation functions
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

		const getEventPrice = useMemo(() => {
			return (event) => {
				if (!event || !event.price) return null;
				return `£${parseFloat(event.price).toFixed(2)}`;
			};
		}, []);

		// Reset price type to standard if current selection is not available for the current variation
		useEffect(() => {
			if (currentVariation && selectedPriceType !== "standard") {
				if (!hasPriceType(currentVariation, selectedPriceType)) {
					setSelectedPriceType("standard");
				}
			}
		}, [currentVariation, selectedPriceType]);

		useEffect(() => {
			// Only fetch if variations weren't preloaded
			if (!preloadedVariations && productId && subjectCode) {
				const fetchTutorialVariations = async () => {
					try {
						setLoading(true);
						const data = await tutorialService.getTutorialVariations(
							productId,
							subjectCode
						);
						setVariations(data || []);
						setError(null);
					} catch (err) {
						console.error("Error fetching tutorial variations:", err);
						setError("Failed to load tutorial variations");
					} finally {
						setLoading(false);
					}
				};

				fetchTutorialVariations();
			} else if (preloadedVariations) {
				setVariations(preloadedVariations);
				setLoading(false);
			}
		}, [productId, subjectCode, preloadedVariations]);

		const handleChoiceChange = (variationId, eventId, choice) => {
			setSelectedChoices((prev) => ({
				...prev,
				[`${variationId}_${eventId}`]: choice,
			}));
		};

		// Regular product card functions (from ProductCard.js)
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

		const hasAnySelection = () => {
			return (
				Object.keys(selectedChoices).length > 0 &&
				Object.values(selectedChoices).some((choice) => choice !== "")
			);
		};

		const handleAddToCart = () => {
			const selectedItems = [];

			Object.entries(selectedChoices).forEach(([key, choice]) => {
				if (choice) {
					const [variationId, eventId] = key.split("_");
					const variation = variations.find(
						(v) => v.id === parseInt(variationId)
					);
					const event = variation?.events?.find(
						(e) => e.id === parseInt(eventId)
					);

					if (variation && event) {
						selectedItems.push({
							variationId: parseInt(variationId),
							eventId: parseInt(eventId),
							choice: choice,
							variation: variation,
							event: event,
						});
					}
				}
			});

			if (selectedItems.length > 0) {
				// Group selections by choice priority and create choice arrays
				const choicesByPriority = {
					"1st": selectedItems.filter((item) => item.choice === "1st"),
					"2nd": selectedItems.filter((item) => item.choice === "2nd"),
					"3rd": selectedItems.filter((item) => item.choice === "3rd"),
				};

				// Create choices for this location
				const locationChoices = selectedItems.map((item) => ({
					choice: item.choice,
					variationId: item.variationId,
					eventId: item.eventId,
					variationName: item.variation.name,
					eventTitle: item.event.title,
					eventCode: item.event.code,
					venue: item.event.venue,
					startDate: item.event.start_date,
					endDate: item.event.end_date,
					price: getTutorialPrice(item.variation, item.event, "standard"),
				}));

				// Create location data
				const locationData = {
					location: location,
					choices: locationChoices,
					choiceCount: locationChoices.length,
				};

				// Use the 1st choice for primary pricing, or the first available choice
				const primaryChoice =
					choicesByPriority["1st"][0] ||
					choicesByPriority["2nd"][0] ||
					choicesByPriority["3rd"][0] ||
					selectedItems[0];

				// Add to cart with tutorial metadata
				addToCart({
					id: productId,
					essp_id: productId,
					product_id: productId,
					subject_code: subjectCode,
					subject_name: subjectName,
					product_name: `${subjectCode} Tutorial - ${location}`,
					type: "Tutorial",
					location: locationData,
					quantity: 1,
					metadata: {
						type: "tutorial",
						subjectCode: subjectCode,
						location: location,
						choices: locationChoices,
						variationId: primaryChoice.variationId,
						eventId: primaryChoice.eventId,
					},
				});

				// Clear selections after adding to cart
				setSelectedChoices({});
			}
		};

		const getChoiceColor = (choice) => {
			switch (choice) {
				case "1st":
					return "success";
				case "2nd":
					return "warning";
				case "3rd":
					return "info";
				default:
					return "default";
			}
		};

		const getTutorialPrice = (variation, event, priceType = "standard") => {
			if (!variation || !variation.prices) return null;
			const priceObj = variation.prices.find(
				(p) => p.price_type === priceType
			);
			if (!priceObj) return null;
			return `£${parseFloat(priceObj.amount).toFixed(2)}`;
		};

		const getSummaryInfo = () => {
			const totalEvents = variations.reduce(
				(sum, variation) => sum + (variation.events?.length || 0),
				0
			);
			const distinctDescriptions = [
				...new Set(
					variations
						.map((v) => v.description_short || v.description)
						.filter(Boolean)
				),
			];
			const distinctVenues = [
				...new Set(
					variations
						.flatMap((v) => v.events || [])
						.map((e) => e.venue)
						.filter(Boolean)
				),
			];

			return { totalEvents, distinctDescriptions, distinctVenues };
		};

		const summaryInfo = getSummaryInfo();

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
					<Box sx={{ overflowX: "auto" }}>
						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<thead>
								<tr>
									<th
										style={{
											border: "1px solid #ddd",
											padding: "8px",
										}}>
										Variation
									</th>
									<th
										style={{
											border: "1px solid #ddd",
											padding: "8px",
										}}>
										Price Type
									</th>
									<th
										style={{
											border: "1px solid #ddd",
											padding: "8px",
										}}>
										Price
									</th>
								</tr>
							</thead>
							<tbody>
								{variations &&
									variations.map(
										(variation) =>
											variation.prices &&
											variation.prices.map((price) => (
												<tr
													key={`${variation.id}-${price.price_type}`}>
													<td
														style={{
															border: "1px solid #ddd",
															padding: "8px",
														}}>
														{variation.name}
													</td>
													<td
														style={{
															border: "1px solid #ddd",
															padding: "8px",
														}}>
														{price.price_type}
													</td>
													<td
														style={{
															border: "1px solid #ddd",
															padding: "8px",
														}}>
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
													</td>
												</tr>
											))
									)}
							</tbody>
						</table>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowPriceModal(false)}>Close</Button>
				</DialogActions>
			</Dialog>
		);

		const renderRegularContent = () => (
			<>
				<CardContent
					className="d-flex flex-column pb-0 product-card-content"
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
									{variations.map((variation) => (
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
								onClick={() => {
									if (singleVariation) {
										// Handle single variation
										const priceObj = singleVariation.prices?.find(
											(p) => p.price_type === selectedPriceType
										);
										addToCart({
											id: productId,
											essp_id: productId,
											product_id: productId,
											subject_code: subjectCode,
											subject_name: subjectName,
											product_name: product.product_name,
											type: "Tutorial",
											metadata: {
												variationId: singleVariation.id,
												variationName: singleVariation.name,
												priceType: selectedPriceType,
												actualPrice: priceObj?.amount,
											},
										});
									} else if (selectedVariations.length > 0) {
										// Handle multiple variations - add each as separate cart item
										selectedVariations.forEach((variationId) => {
											const variation = variations.find(
												(v) => v.id === variationId
											);
											const priceObj = variation?.prices?.find(
												(p) => p.price_type === selectedPriceType
											);
											addToCart({
												id: productId,
												essp_id: productId,
												product_id: productId,
												subject_code: subjectCode,
												subject_name: subjectName,
												product_name: product.product_name,
												type: "Tutorial",
												metadata: {
													variationId: variation.id,
													variationName: variation.name,
													priceType: selectedPriceType,
													actualPrice: priceObj?.amount,
												},
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

		const formatDate = (dateString) => {
			if (!dateString) return "N/A";
			try {
				const date = new Date(dateString);
				return date.toLocaleDateString("en-GB", {
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				});
			} catch (error) {
				return "N/A";
			}
		};

		const formatDateOnly = (dateString) => {
			if (!dateString) return "N/A";
			try {
				const date = new Date(dateString);
				return date.toLocaleDateString("en-GB", {
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
				});
			} catch (error) {
				return "N/A";
			}
		};

		if (loading) {
			return (
				<Card
					elevation={2}
					className="product-card d-flex flex-column">
					<CardContent
						className="d-flex justify-content-center align-items-center"
						sx={{ height: "200px" }}>
						<Box
							display="flex"
							flexDirection="column"
							alignItems="center">
							<CircularProgress />
							<Typography variant="body2" sx={{ mt: 2 }}>
								Loading tutorial options...
							</Typography>
						</Box>
					</CardContent>
				</Card>
			);
		}

		if (error) {
			return (
				<Card
					elevation={2}
					className="product-card d-flex flex-column justify-content-between">
					<CardContent>
						<Alert severity="error">{error}</Alert>
					</CardContent>
				</Card>
			);
		}

		return (
			<>
				<Card
					elevation={2}
					className="product-card tutorial-product-card d-flex flex-column">
					<CardHeader
						title={
							<Box className="d-flex flex-row w-100 align-items-center justify-content-between">
								<Typography variant="h6" className="mb-0">
									{location}
								</Typography>
								<QuestionAnswerOutlined />
							</Box>
						}
						className="product-card-header tutorial-header"
					/>

					<CardContent
						className="product-card-content"
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
						{variations.length === 0 ? (
							<Box className="text-center text-muted">
								<Typography variant="body2" color="text.secondary">
									No tutorial variations available for this subject and
									location.
								</Typography>
							</Box>
						) : (
							<Box className="tutorial-summary">
								<Box sx={{ mb: 0 }}>
									<Box className="summary-item">
										<Typography variant="body2">
											Number of Events: {summaryInfo.totalEvents}
										</Typography>
									</Box>
									<Box className="d-flex justify-content-between">
										<Box className="summary-item w-50">
											<Typography variant="body2" sx={{ mb: 1 }}>
												Format:
											</Typography>
											<Stack direction="column" spacing={1}>
												{summaryInfo.distinctDescriptions.map(
													(desc, index) => (
														<Chip
															key={index}
															color="info"
															sx={{
																whiteSpace: "normal",
																height: "auto",
																width: "fit-content",
																minWidth: "auto",
																maxWidth: "100%",
																padding: "2px 2px",
																"& .MuiChip-label": {
																	whiteSpace: "normal",
																	textOverflow: "clip",
																	overflow: "visible",
																	display: "block",
																	margin: "2px",
																	padding: "0 4px",
																	fontSize: "0.75rem",
																},
															}}
															variant="outlined"
															label={desc}
															onClick={() => console.log(desc)}
															style={{ cursor: "pointer" }}
														/>
													)
												)}
											</Stack>
										</Box>

										<Box className="summary-item w-50">
											<Typography variant="body2" sx={{ mb: 1 }}>
												Venues:
											</Typography>
											<Stack direction="column" spacing={1}>
												{summaryInfo.distinctVenues.map(
													(venue, index) => (
														<Chip
															key={index}
															sx={{
																whiteSpace: "normal",
																height: "auto",
																width: "fit-content",
																minWidth: "auto",
																maxWidth: "100%",
																padding: "2px 8px",
																justifyContent: "center",
																borderRadius: "32px",
																"& .MuiChip-label": {
																	whiteSpace: "normal",
																	textOverflow: "clip",
																	overflow: "visible",
																	display: "block",
																	padding: "0 4px",
																	fontSize: "0.75rem",
																},
															}}
															variant="outlined"
															color="info"
															size="small"
															label={venue}
															onClick={() => console.log(venue)}
															style={{ cursor: "pointer" }}
														/>
													)
												)}
											</Stack>
										</Box>
									</Box>
								</Box>

								<Box className="d-flex justify-content-center mb-1">
									<Button
										variant="contained"
										color="secondary"
										onClick={() => setShowDetailModal(true)}>
										Select Tutorials
									</Button>
								</Box>
							</Box>
						)}
					</CardContent>

					{variations.length > 0 && (
						<CardActions
							sx={{ px: 2, py: 1 }}
							className="d-flex w-100 product-card-actions">
							<Box sx={{ width: "100%" }}>
								<Box className="d-flex justify-content-between align-items-center mb-2">
									<Typography variant="caption" color="text.secondary">
										{
											Object.keys(selectedChoices).filter(
												(key) => selectedChoices[key]
											).length
										}{" "}
										selection(s) made
									</Typography>
									<Box className="d-flex gap-2">
										{hasAnySelection() && (
											<Button
												color="secondary"
												variant="outlined"
												size="small"
												onClick={() => setSelectedChoices({})}
												sx={{
													fontSize: "0.75rem",
													padding: "4px 8px",
													minWidth: "auto",
												}}>
												Clear
											</Button>
										)}
										<Button
											color="success"
											variant="contained"
											size="small"
											className="d-flex flex-row flex-wrap align-items-center justify-content-center product-add-to-cart-button p-2"
											disabled={!hasAnySelection()}
											onClick={handleAddToCart}
											aria-label="Add selected tutorials to cart"
											sx={{
												borderRadius: "50%",
												minWidth: "2rem",
												width: "2rem",
												height: "2rem",
												padding: "4px",
											}}>
											<AddShoppingCart sx={{ fontSize: "1.1rem" }} />
										</Button>
									</Box>
								</Box>
								{hasAnySelection() && (
									<Box sx={{ mb: 1 }}>
										<Typography variant="caption" color="info.main">
											💡 Tip: You can add more choices incrementally.
											Your selections will be merged into one cart
											item per subject.
										</Typography>
									</Box>
								)}
							</Box>
						</CardActions>
					)}
				</Card>

				{/* Tutorial Details Modal */}
				<Dialog
					open={showDetailModal}
					onClose={() => setShowDetailModal(false)}
					maxWidth="lg"
					fullWidth>
					<DialogTitle>
						{subjectCode} {location}
					</DialogTitle>
					<DialogContent>
						<Box
							sx={{
								display: "flex",
								flexDirection: "column",
								gap: 2,
								mt: 1,
							}}>
							{variations.map((variation) => (
								<div key={variation.id}>
									<Typography
										variant="h6"
										color="primary"
										gutterBottom>
										{variation.description_short ||
											variation.description}
									</Typography>

									<Box
										sx={{
											display: "grid",
											gap: 2,
											gridTemplateColumns: {
												xs: "1fr",
												md: "repeat(2, 1fr)",
											},
										}}>
										{variation.events &&
											variation.events.map((event) => (
												<Card
													key={event.id}
													variant="outlined"
													sx={{ p: 1 }}>
													<CardContent
														sx={{ pb: "8px !important" }}>
														<Typography
															variant="h6"
															component="h3"
															gutterBottom>
															{event.title || event.code}
														</Typography>

														<Box sx={{ mb: 1 }}>
															<Typography variant="body2">
																<strong>Code:</strong>{" "}
																{event.code || "N/A"}
															</Typography>
															<Typography variant="body2">
																<strong>Venue:</strong>{" "}
																{event.venue || "N/A"}
															</Typography>
															<Typography variant="body2">
																<strong>Start Date:</strong>{" "}
																{formatDate(event.start_date)}
															</Typography>
															<Typography variant="body2">
																<strong>End Date:</strong>{" "}
																{formatDate(event.end_date)}
															</Typography>
															<Typography variant="body2">
																<strong>
																	Finalisation Date:
																</strong>{" "}
																{formatDateOnly(
																	event.finalisation_date
																)}
															</Typography>
															<Typography variant="body2">
																<strong>
																	Remaining Spaces:
																</strong>{" "}
																{event.remain_space ?? "N/A"}
															</Typography>
														</Box>

														<Box
															sx={{
																display: "flex",
																gap: 1,
																flexWrap: "wrap",
																mb: 1,
															}}>
															{event.is_soldout && (
																<Chip
																	label="Sold Out"
																	color="error"
																	size="small"
																/>
															)}
															{getTutorialPrice(
																variation,
																event
															) && (
																<Chip
																	label={getTutorialPrice(
																		variation,
																		event
																	)}
																	color="success"
																	size="small"
																/>
															)}
															{event.remain_space !== null &&
																event.remain_space <= 5 &&
																event.remain_space > 0 && (
																	<Chip
																		label={`Only ${event.remain_space} spaces left`}
																		color="warning"
																		size="small"
																	/>
																)}
														</Box>

														<FormControl
															fullWidth
															size="small"
															sx={{ mt: 1 }}>
															<InputLabel>Choice</InputLabel>
															<Select
																value={
																	selectedChoices[
																		`${variation.id}_${event.id}`
																	] || ""
																}
																onChange={(e) =>
																	handleChoiceChange(
																		variation.id,
																		event.id,
																		e.target.value
																	)
																}
																label="Choice">
																<MenuItem value="">
																	None
																</MenuItem>
																<MenuItem value="1st">
																	1st
																</MenuItem>
																<MenuItem value="2nd">
																	2nd
																</MenuItem>
																<MenuItem value="3rd">
																	3rd
																</MenuItem>
															</Select>
														</FormControl>
													</CardContent>
												</Card>
											))}
									</Box>
								</div>
							))}
						</Box>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setShowDetailModal(false)}>
							Close
						</Button>
						<Button
							variant="contained"
							color="success"
							disabled={!hasAnySelection()}
							onClick={() => {
								handleAddToCart();
								setShowDetailModal(false);
							}}
							sx={{
								display: "flex",
								alignItems: "center",
								gap: 1,
							}}>
							<AddShoppingCart />
							Add Selected to Cart
						</Button>
					</DialogActions>
				</Dialog>
			</>
		);
	}
);

TutorialProductCard.propTypes = {
	subjectCode: PropTypes.string.isRequired,
	subjectName: PropTypes.string.isRequired,
	location: PropTypes.string.isRequired,
	productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
		.isRequired,
	product: PropTypes.object.isRequired,
	variations: PropTypes.array,
};

export default TutorialProductCard;
