import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
	Card,
	Row,
	Col,
	Form,	
	Alert,
	Modal,
	OverlayTrigger,
	Tooltip,
} from "react-bootstrap";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import { InfoCircle } from "react-bootstrap-icons";
import {
	Button as MuiButton,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Card as MuiCard,
	CardContent,
	Typography,
	Chip,
	Box,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Stack,
	Button,
	Checkbox,
	FormControlLabel,
	FormLabel
} from "@mui/material";
import { useCart } from "../contexts/CartContext";
import tutorialService from "../services/tutorialService";

/**
 * TutorialProductCard
 * Shows tutorial products for a specific subject and location
 * Allows users to select tutorial variations with choice preferences (1st, 2nd, 3rd)
 * For Online Classroom products (recordings), uses the same layout as normal ProductCard
 */
const TutorialProductCard = ({
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

	// Check if this is an Online Classroom product (recordings without events)
	const isOnlineClassroom = product.product_name?.toLowerCase().includes('online classroom') || 
	                         product.product_name?.toLowerCase().includes('recording') ||
	                         product.learning_mode === 'LMS' ||
	                         !variations.some(v => v.events && v.events.length > 0);

	// Regular product card logic (from ProductCard.js)
	const hasVariations = variations && variations.length > 0;
	const singleVariation = variations && variations.length === 1 ? variations[0] : null;
	const currentVariation = hasVariations
		? (selectedVariations.length > 0 
			? variations.find((v) => selectedVariations.includes(v.id)) 
			: singleVariation || variations[0])
		: singleVariation;

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
			setSelectedVariations(prev => [...prev, variationId]);
		} else {
			setSelectedVariations(prev => prev.filter(id => id !== variationId));
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
			const priceStr = getTutorialPrice(
				primaryChoice.variation,
				primaryChoice.event,
				"standard"
			);
			const actualPrice = priceStr
				? parseFloat(priceStr.replace("£", ""))
				: primaryChoice.event.price || 0;

			// Add cart item with location-specific choices
			// The cart service will handle merging with existing subject items
			addToCart(product, {
				priceType: "standard",
				actualPrice: actualPrice,
				title: `${subjectCode} Tutorial`,
				type: "tutorial",
				subjectCode: subjectCode,
				newLocation: locationData, // Use newLocation to indicate this should be merged
				// Legacy fields for backward compatibility
				choices: locationChoices,
				choiceCount: selectedItems.length,
				location: location,
			});

			// Note: We keep selections so users can add more choices incrementally
			// They can manually clear selections or they'll be preserved for additional adds
			// setSelectedChoices({}); // Commented out to allow incremental adding
			
			// Show success feedback
			console.log(`Added ${selectedItems.length} tutorial choices for ${subjectCode} in ${location}`);
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
				return "secondary";
		}
	};

	// Get price for variation (same logic as ProductCard)
	const getPrice = (variation, priceType) => {
		if (!variation || !variation.prices) return null;
		const priceObj = variation.prices.find((p) => p.price_type === priceType);
		return priceObj ? `£${priceObj.amount}` : null;
	};

	// For tutorials, get price from event (tutorials store price in event.price)
	const getEventPrice = (event) => {
		if (!event || !event.price) return null;
		return `£${event.price}`;
	};

	// Get price for tutorial variation + event combination
	// First tries variation prices, then falls back to event price
	const getTutorialPrice = (variation, event, priceType = "standard") => {
		// First try variation pricing (same as regular products)
		const variationPrice = getPrice(variation, priceType);
		if (variationPrice) {
			return variationPrice;
		}

		// Fallback to event pricing
		return getEventPrice(event);
	};

	// Calculate summary information
	const getSummaryInfo = () => {
		const allEvents = variations.flatMap((v) => v.events || []);
		const totalEvents = allEvents.length;
		const distinctDescriptions = [
			...new Set(variations.map((v) => v.description_short || v.description).filter(Boolean)),
		];
		const distinctVenues = [
			...new Set(allEvents.map((e) => e.venue).filter(Boolean)),
		];

		return {
			totalEvents,
			distinctDescriptions,
			distinctVenues,
		};
	};

	const summaryInfo = getSummaryInfo();

	// Regular product card price modal (from ProductCard.js)
	const renderPriceModal = () => (
		<Modal show={showPriceModal} onHide={() => setShowPriceModal(false)} size="lg" centered>
			<Modal.Header closeButton>
				<Modal.Title>Price Information</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<div className="mb-2">
					<strong>Subject:</strong> {subjectCode}
					<br />
					<strong>Product Name:</strong> {product.product_name}
				</div>
				<div className="table-responsive">
					<table className="table table-bordered table-sm">
						<thead>
							<tr>
								<th>Variation</th>
								<th>Price Type</th>
								<th>Price</th>
							</tr>
						</thead>
						<tbody>
							{variations &&
								variations.map((variation) =>
									variation.prices &&
									variation.prices.map((price) => (
										<tr key={`${variation.id}-${price.price_type}`}>
											<td>{variation.name}</td>
											<td>{price.price_type}</td>
											<td>£{price.amount}</td>
										</tr>
									))
								)}
						</tbody>
					</table>
				</div>
			</Modal.Body>
		</Modal>
	);

	// Regular product content (from ProductCard.js)
	const renderRegularContent = () => (
		<>
			<Card.Body>
				<div className="d-flex justify-content-between align-items-center mt-2">
					<Card.Title className="mb-0">{product.product_name}</Card.Title>
				</div>
			</Card.Body>

			<Card.Footer className="bg-white border-0 d-flex flex-column">
				<div className="d-flex flex-column align-items-start mb-2">
					{singleVariation && (
						<div>
							<span className="form-label mb-1">Product Variation:</span>
							<div>
								<span className="form-label mb-0">
									<b>{singleVariation.name}</b>
								</span>
							</div>
						</div>
					)}
					{hasVariations && !singleVariation && (
						<FormControl component="fieldset" size="small">
							<FormLabel 
								component="legend" 
								sx={{ fontSize: '0.875rem', mb: 1, color: 'text.primary' }}>
								Product Variations:
							</FormLabel>
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
								{variations.map((variation) => (
									<FormControlLabel
										key={variation.id}
										control={
											<Checkbox 
												size="small" 
												checked={selectedVariations.includes(variation.id)}
												onChange={(e) => handleVariationChange(variation.id, e.target.checked)}
											/>
										}
										label={variation.name}
										sx={{ 
											margin: 0,
											'& .MuiFormControlLabel-label': { 
												fontSize: '0.875rem' 
											} 
										}}
									/>
								))}
							</div>
						</FormControl>
					)}
				</div>

				<div className="d-flex justify-content-between align-items-end">
					<div className="d-flex flex-column">
						<div className="d-flex align-items-center mb-2">
							<span
								className="fw-bold me-3"
								style={{ fontSize: "1.2em" }}>
								{getPrice(currentVariation, selectedPriceType) || "-"}
							</span>
							<div className="d-flex justify-content-between align-items-center">
								<div className="d-flex align-items-center">
									<OverlayTrigger
										placement="top"
										overlay={<Tooltip>Show all price types</Tooltip>}>
										<InfoCircle
											role="button"
											className="text-info me-2"
											onClick={() => setShowPriceModal(true)}
											style={{ cursor: "pointer" }}
											aria-label="Show price information"
										/>
									</OverlayTrigger>
								</div>
							</div>
						</div>
						<div className="mb-2">
							<div
								className="d-flex align-items-center"
								style={{ cursor: "pointer" }}
								onClick={() => setShowDiscounts(!showDiscounts)}
								role="button"
								aria-expanded={showDiscounts}
								aria-label="Toggle discount options">
								<span className="me-2 text-primary">Discounts:</span>
								<span className="text-muted">
									{showDiscounts ? "▼" : "▶"}
								</span>
							</div>
							{showDiscounts && (
								<div className="mt-2 ps-3">
									<div className="form-check">
										<input
											className="form-check-input"
											type="checkbox"
											id={`retaker-${productId}`}
											checked={selectedPriceType === "retaker"}
											disabled={
												!hasPriceType(currentVariation, "retaker")
											}
											onChange={() =>
												handlePriceTypeChange("retaker")
											}
										/>
										<label
											className={`form-check-label ${
												!hasPriceType(currentVariation, "retaker")
													? "text-muted"
													: ""
											}`}
											htmlFor={`retaker-${productId}`}>
											Retaker
										</label>
									</div>
									<div className="form-check">
										<input
											className="form-check-input"
											type="checkbox"
											id={`additional-${productId}`}
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
										/>
										<label
											className={`form-check-label ${
												!hasPriceType(
													currentVariation,
													"additional"
												)
													? "text-muted"
													: ""
											}`}
											htmlFor={`additional-${productId}`}>
											Additional Copy
										</label>
									</div>
								</div>
							)}
						</div>
					</div>
					<div>
						<Button
							color="success"
							variant="contained"
							size="small"
							className="d-flex flex-row flex-wrap align-items-center justify-content-center product-add-to-cart-button p-2"
							onClick={() => {
								if (singleVariation) {
									// Handle single variation
									const priceObj = singleVariation.prices?.find(
										(p) => p.price_type === selectedPriceType
									);
									addToCart(product, {
										variationId: singleVariation.id,
										variationName: singleVariation.name,
										priceType: selectedPriceType,
										actualPrice: priceObj?.amount,
									});
								} else if (selectedVariations.length > 0) {
									// Handle multiple variations - add each as separate cart item
									selectedVariations.forEach(variationId => {
										const variation = variations.find(v => v.id === variationId);
										const priceObj = variation?.prices?.find(
											(p) => p.price_type === selectedPriceType
										);
										addToCart(product, {
											variationId: variation.id,
											variationName: variation.name,
											priceType: selectedPriceType,
											actualPrice: priceObj?.amount,
										});
									});
								}
							}}
							disabled={hasVariations && !singleVariation && selectedVariations.length === 0}
							aria-label="Add product to cart"
							sx={{
								borderRadius: "50%",
								minWidth: "2rem",
								width: "2rem",
								height: "2rem",
								padding: "4px",
							}}>
							<AddShoppingCartIcon sx={{ fontSize: "1.1rem" }} />
						</Button>
					</div>
				</div>
			</Card.Footer>
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
			<Col>
				<Card className="h-100">
					<Card.Body className="d-flex justify-content-center align-items-center">
						<div>Loading tutorial options...</div>
					</Card.Body>
				</Card>
			</Col>
		);
	}

	if (error) {
		return (
			<Col>
				<Card className="h-100">
					<Card.Body>
						<Alert variant="danger">{error}</Alert>
					</Card.Body>
				</Card>
			</Col>
		);
	}

	// For Online Classroom products, use regular product card layout
	if (isOnlineClassroom) {
		return (
			<Col>
				<Card className="h-100 shadow-sm product-card">
					<Card.Header className="product-card-header d-flex justify-content-between align-items-center tutorial-product-card-header">
						<div>
							<h5 className="mb-0">Subject {subjectCode}</h5>
							<h6 className="mb-0">Online Classroom</h6>
						</div>
					</Card.Header>

					{renderRegularContent()}
					{renderPriceModal()}
				</Card>
			</Col>
		);
	}

	return (
		<>
			<Col>
				<Card className="h-100 shadow-sm product-card tutorial-product-card">
					<Card.Header className="d-flex justify-content-between align-items-center tutorial-product-card-header">
						<div className="py-1">
							<h5 className="mb-0">Subject {subjectCode}</h5>
							<h6 className="mb-0">{location}</h6>
						</div>
					</Card.Header>

					<Card.Body className="p-3 pb-0">
						{variations.length === 0 ? (
							<div className="text-center text-muted">
								No tutorial variations available for this subject and
								location.
							</div>
						) : (
							<div className="tutorial-summary">
								<div className="mb-2">
									<div className="summary-item mb-2">
										<strong>Number of Events:</strong>{" "}
										{summaryInfo.totalEvents}
									</div>
									<div className="d-flex justify-content-between">
										<div className="summary-item mb-2 w-50">
											<strong>Format:</strong>
											<Stack direction="column" spacing={1}>
												{summaryInfo.distinctDescriptions.map(
													(desc, index) => (
														<Chip
															key={index}
															color="info"
															className="me-1"
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
															onClick={() => {
																console.log(desc);
															}}
															style={{
																cursor: "pointer",
															}}></Chip>
													)
												)}
											</Stack>
										</div>

										<div className="summary-item mb-3 w-50">
											<strong>Venues:</strong>
											<Stack direction="column" spacing={1}>
												{summaryInfo.distinctVenues.map(
													(venue, index) => (
														<Chip
															key={index}
															className="my-1"
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
															onClick={() => {
																console.log(venue);
															}}
															style={{
																cursor: "pointer",
															}}></Chip>
													)
												)}
											</Stack>
										</div>
									</div>
								</div>

								<div className="d-flex justify-content-center mb-1">
									<Button
										variant="contained"
										color="secondary"
										onClick={() => setShowDetailModal(true)}>
										Select Tutorials
									</Button>
								</div>

								{/* Show only the first tutorial variation */}
								{/* {variations.length > 0 &&
									variations[0].events &&
									variations[0].events.length > 0 && (
										<div className="quick-selection">
											<h6 className="text-muted mb-2">
												Quick Selection
											</h6>
											<Row className="align-items-center mb-2 p-2 border rounded">
												<Col xs={8}>
													<small className="fw-bold">
														{variations[0].events[0].title}
													</small>
													{getTutorialPrice(
														variations[0],
														variations[0].events[0]
													) && (
														<div className="text-success fw-bold">
															{getTutorialPrice(
																variations[0],
																variations[0].events[0]
															)}
														</div>
													)}
												</Col>
												<Col xs={4}>
													<Form.Select
														size="sm"
														value={
															selectedChoices[
																`${variations[0].id}_${variations[0].events[0].id}`
															] || ""
														}
														onChange={(e) =>
															handleChoiceChange(
																variations[0].id,
																variations[0].events[0].id,
																e.target.value
															)
														}>
														<option value="">Choice</option>
														<option value="1st">1st</option>
														<option value="2nd">2nd</option>
														<option value="3rd">3rd</option>
													</Form.Select>
												</Col>
											</Row>
										</div>
									)} */}
							</div>
						)}
					</Card.Body>

					{variations.length > 0 && (
						<Card.Footer className="bg-white border-top-0">
							<div className="d-flex justify-content-between align-items-center mb-2">
								<small className="text-muted">
									{
										Object.keys(selectedChoices).filter(
											(key) => selectedChoices[key]
										).length
									}{" "}
									selection(s) made
								</small>
								<div className="d-flex gap-2">
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
										<AddShoppingCartIcon sx={{ fontSize: "1.1rem" }} />
									</Button>
								</div>
							</div>
							{hasAnySelection() && (
								<div className="mb-1">
									<small className="text-info">
										💡 Tip: You can add more choices incrementally. Your selections will be merged into one cart item per subject.
									</small>
								</div>
							)}
						</Card.Footer>
					)}
				</Card>
			</Col>

			{/* Tutorial Details Modal */}
			<Dialog
				open={showDetailModal}
				onClose={() => setShowDetailModal(false)}
				maxWidth="lg"
				fullWidth>
				<DialogTitle>
					<Typography variant="h5">
						{subjectCode} {location}
					</Typography>
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
								<Typography variant="h6" color="primary" gutterBottom>
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
											<MuiCard
												key={event.id}
												variant="outlined"
												sx={{ p: 1 }}>
												<CardContent sx={{ pb: "8px !important" }}>
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
															<strong>Finalisation Date:</strong>{" "}
															{formatDateOnly(
																event.finalisation_date
															)}
														</Typography>
														<Typography variant="body2">
															<strong>Remaining Spaces:</strong>{" "}
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
															<MenuItem value="">None</MenuItem>
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
											</MuiCard>
										))}
								</Box>
							</div>
						))}
					</Box>
				</DialogContent>
				<DialogActions>
					<MuiButton onClick={() => setShowDetailModal(false)}>
						Close
					</MuiButton>
					<MuiButton
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
						<AddShoppingCartIcon />
						Add Selected to Cart
					</MuiButton>
				</DialogActions>
			</Dialog>
		</>
	);
};

TutorialProductCard.propTypes = {
	subjectCode: PropTypes.string.isRequired,
	subjectName: PropTypes.string.isRequired,
	location: PropTypes.string.isRequired,
	productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
		.isRequired,
	product: PropTypes.object.isRequired,
	variations: PropTypes.array, // Optional pre-loaded variations
};

export default TutorialProductCard;
