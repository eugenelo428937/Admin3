import React, { useEffect } from "react";
import {
	Card,
	Spinner,
	Modal,
	Col,
	OverlayTrigger,
	Tooltip,
} from "react-bootstrap";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { 
	Button, 
	Checkbox, 
	FormControlLabel, 
	FormControl, 
	FormLabel 
} from "@mui/material";
import { ExclamationCircle, InfoCircle } from "react-bootstrap-icons";
import productService from "../services/productService";
import "../styles/product_card.css";

const MarkingProductCard = ({
	product,
	onAddToCart,
	allEsspIds,
	bulkDeadlines,
}) => {	const [deadlines, setDeadlines] = React.useState([]);
	const [loading, setLoading] = React.useState(true);
	const [showModal, setShowModal] = React.useState(false);
	const [showPriceModal, setShowPriceModal] = React.useState(false);
	const [selectedVariations, setSelectedVariations] = React.useState([]);
	const [selectedPriceType, setSelectedPriceType] = React.useState("standard");
	const [showDiscounts, setShowDiscounts] = React.useState(false);
	const [showExpiredWarning, setShowExpiredWarning] = React.useState(false);

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

	const hasVariations = product.variations && product.variations.length > 0;
	const singleVariation =
		product.variations && product.variations.length === 1
			? product.variations[0]
			: null;	const currentVariation = hasVariations
		? (selectedVariations.length > 0 
			? product.variations.find((v) => selectedVariations.includes(v.id)) 
			: singleVariation || product.variations[0])
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
	const getPrice = (variation, priceType) => {
		if (!variation || !variation.prices) return null;
		const priceObj = variation.prices.find(
			(p) => p.price_type === priceType
		);
		return priceObj ? `£${priceObj.amount}` : null;
	};

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
		<Modal
			show={showPriceModal}
			onHide={() => setShowPriceModal(false)}
			size="lg"
			centered>
			<Modal.Header closeButton>
				<Modal.Title>Price Information</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<div className="mb-2">
					<strong>Subject:</strong> {product.subject_code}
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
							{product.variations &&
								product.variations.map((variation) =>
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

	return (
		<Col>
			<Card className="h-100 shadow-sm product-card">
				<Card.Header className="product-card-header marking-header">
					<h5 className="mb-0">Subject {product.subject_code}</h5>
				</Card.Header>{" "}
				<Card.Body>
					<div className="d-flex justify-content-between align-items-center mt-2">
						<Card.Title className="mb-0">
							{product.product_name}
						</Card.Title>
					</div>
				</Card.Body>{" "}
				<Card.Footer className="bg-white border-0 d-flex flex-column">
					{/* Deadline Information */}
					{loading && (
						<div className="d-flex align-items-center mb-2">
							<Spinner size="sm" className="me-2" />
							<span className="text-muted">Loading deadlines...</span>
						</div>
					)}
					{!loading && deadlines.length > 0 && (
						<div className="mb-2">
							{/* Deadline Status Line */}
							<div className="mb-2">
								{expired.length > 0 && (
									<div className="text-danger small mb-1">
										<ExclamationCircle className="me-1" />
										{expired.length} deadline
										{expired.length > 1 ? "s" : ""} overdue
									</div>
								)}
								{upcoming.length > 0 && (
									<div className="text-secondary small">
										<div>
											Upcoming deadline:{" "}
											{upcoming[0].deadline.toLocaleDateString()}
										</div>
										<>
											Recommended submission:{" "}
											{upcoming[0].recommended_submit_date.toLocaleDateString()}
										</>
									</div>
								)}
								{allExpired && (
									<div className="text-danger small">
										<ExclamationCircle className="me-1" />
										All deadlines have expired
									</div>
								)}
							</div>
							{/* View Deadlines Button */}
							<div className="mb-2">
								<Button
									variant="outlined"
									size="small"
									onClick={() => setShowModal(true)}
									color={allExpired ? "error" : "info"}>
									{allExpired
										? "All Deadlines Expired"
										: "View Deadlines"}
									{upcoming.length > 0 &&
										` (${upcoming.length} upcoming)`}
								</Button>
							</div>
						</div>
					)}
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
									{product.variations.map((variation) => (
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
					</div>{" "}
					<div className="d-flex justify-content-between align-items-center">
						<div className="d-flex flex-column">
							<div className="d-flex align-items-center mb-2">
								<span
									className="fw-bold me-3"
									style={{ fontSize: "1.2em" }}>
									{getPrice(currentVariation, selectedPriceType)
										? getPrice(currentVariation, selectedPriceType)
										: "-"}
								</span>
								<OverlayTrigger
									placement="top"
									overlay={<Tooltip>Show all price types</Tooltip>}>
									<InfoCircle
										role="button"
										className="text-info me-2"
										onClick={() => setShowPriceModal(true)}
										style={{ cursor: "pointer" }}
									/>
								</OverlayTrigger>
							</div>
							<div className="mb-2">
								<div
									className="d-flex align-items-center"
									style={{ cursor: "pointer" }}
									onClick={() => setShowDiscounts(!showDiscounts)}>
									<span className="me-2 text-secondary">
										Discounts:
									</span>
									<span className="text-muted">
										{showDiscounts ? <ArrowDropDownIcon /> : <ArrowRightIcon />}
									</span>
								</div>{" "}
								{showDiscounts && (
									<div className="mt-2 ps-3">
										<div className="form-check">
											<input
												className="form-check-input"
												type="checkbox"
												id={`retaker-${
													product.essp_id ||
													product.id ||
													product.product_id
												}`}
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
											/>
											<label
												className={`form-check-label ${
													!hasPriceType(
														currentVariation,
														"retaker"
													)
														? "text-muted"
														: ""
												}`}
												htmlFor={`retaker-${
													product.essp_id ||
													product.id ||
													product.product_id
												}`}>
												Retaker
											</label>
										</div>
										<div className="form-check">
											<input
												className="form-check-input"
												type="checkbox"
												id={`additional-${
													product.essp_id ||
													product.id ||
													product.product_id
												}`}
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
												htmlFor={`additional-${
													product.essp_id ||
													product.id ||
													product.product_id
												}`}>
												Additional Copy
											</label>
										</div>
									</div>
								)}
							</div>
						</div>{" "}
						<div>
							<Button
								color="success"
								variant="contained"
								size="small"
								className="d-flex flex-row flex-wrap align-items-center justify-content-center product-add-to-cart-button p-2"
								onClick={handleAddToCart}
																disabled={allExpired || (hasVariations && !singleVariation && selectedVariations.length === 0)}
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
				{renderPriceModal()}
			</Card>
			<Modal
				show={showModal}
				onHide={() => setShowModal(false)}
				size="lg"
				centered>
				<Modal.Header closeButton>
					<Modal.Title>Marking Deadlines</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<div className="mb-2">
						<strong>Subject:</strong> {product.subject_code}
					</div>
					<div className="mb-2">
						<strong>Marking Product:</strong> {product.product_name}
					</div>
					<div className="table-responsive">
						<table className="table table-sm table-bordered">
							<thead>
								<tr>
									<th></th>
									<th className="text-center">
										Recommended Submission Date
									</th>
									<th className="text-center">Deadline</th>
								</tr>
							</thead>
							<tbody>
								{parsedDeadlines
									.sort((a, b) => a.deadline - b.deadline)
									.map((d, i) => {
										const isRecommendedExpired =
											d.recommended_submit_date < now;
										const isDeadlineExpired = d.deadline < now;
										return (
											<tr key={i}>
												<td className="text-center">{d.name}</td>
												<td
													className={
														"text-center " +
														(isRecommendedExpired
															? "text-danger"
															: "")
													}>
													{isRecommendedExpired && (
														<ExclamationCircle className="me-1 text-danger" />
													)}
													{d.recommended_submit_date.toLocaleDateString()}
												</td>
												<td
													className={
														"text-center " +
														(isDeadlineExpired
															? "text-danger"
															: "")
													}>
													{isDeadlineExpired && (
														<ExclamationCircle className="me-1 text-danger" />
													)}
													{d.deadline.toLocaleDateString()}
												</td>
											</tr>
										);
									})}
							</tbody>
						</table>
					</div>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowModal(false)}>
						Close
					</Button>{" "}
					<Button
						variant="success"
						className="d-flex flex-row flex-wrap align-items-center justify-content-center product-add-to-cart-button p-2 ms-2"
						disabled={allExpired}
						onClick={() => {
							if (expired.length > 0 && !allExpired) {
								setShowExpiredWarning(true);
								setShowModal(false);
							} else {
								addToCartConfirmed();
								setShowModal(false);
							}
						}}>
						<AddShoppingCartIcon sx={{ fontSize: "1.1rem" }} />
						<span className="ms-1">Add to Cart</span>
					</Button>
				</Modal.Footer>
			</Modal>

			{/* Expired Deadline Warning Modal */}
			<Modal
				show={showExpiredWarning}
				onHide={() => setShowExpiredWarning(false)}
				centered>
				<Modal.Header closeButton>
					<Modal.Title className="text-warning">
						<ExclamationCircle className="me-2" />
						Warning: Expired Deadlines
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<p>
						This marking product has <strong>{expired.length}</strong>{" "}
						expired deadline{expired.length > 1 ? "s" : ""}. Adding this
						product to your cart may not be useful as some submission
						deadlines have already passed.
					</p>
					<p>Are you sure you want to continue?</p>
				</Modal.Body>
				<Modal.Footer>
					<Button
						variant="outlined"
						onClick={() => setShowExpiredWarning(false)}
						className="me-2">
						Cancel
					</Button>
					<Button
						variant="contained"
						color="warning"
						onClick={addToCartConfirmed}>
						Add to Cart Anyway
					</Button>
				</Modal.Footer>
			</Modal>
		</Col>
	);
};

export default MarkingProductCard;
