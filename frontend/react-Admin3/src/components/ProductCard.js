import React, { useState, useEffect, useMemo } from "react";
import { Col, Card, Modal, OverlayTrigger, Tooltip } from "react-bootstrap";
import { 
	Button, 
	Checkbox, 
	FormControlLabel, 
	FormControl, 
	FormLabel, 
} from "@mui/material";
import { InfoCircle } from "react-bootstrap-icons";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import { useCart } from "../contexts/CartContext";
import { useVAT } from "../contexts/VATContext";
import MarkingProductCard from "./MarkingProductCard";
import TutorialProductCard from "./TutorialProductCard";
import "../styles/product_card.css";

const ProductCard = React.memo(({ product, onAddToCart, allEsspIds, bulkDeadlines }) => {
	const [selectedVariations, setSelectedVariations] = useState([]);
	const [showPriceModal, setShowPriceModal] = useState(false);
	const [selectedPriceType, setSelectedPriceType] = useState("standard");
	const [showDiscounts, setShowDiscounts] = useState(false);

	const { addToCart } = useCart();
	const { getPriceDisplay, formatPrice, isProductVATExempt, showVATInclusive } = useVAT();

	// Memoize expensive calculations
	const productTypeCheck = useMemo(() => ({
		isTutorial: product.type === 'Tutorial',
		isMarking: product.type === 'Markings',
		isOnlineClassroom: product.product_name?.toLowerCase().includes('online classroom') || 
		                  product.product_name?.toLowerCase().includes('recording') ||
		                  product.learning_mode === 'LMS',
	}), [product.type, product.product_name, product.learning_mode]);

	// Memoize variation calculations
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

	// Memoize price calculation to avoid recalculating on every render
	const getPrice = useMemo(() => {
		return (variation, priceType) => {
			if (!variation || !variation.prices) return null;
			const priceObj = variation.prices.find((p) => p.price_type === priceType);
			if (!priceObj) return null;

			// Check if this product is VAT exempt
			const isVATExempt = isProductVATExempt(product.type);
			
			// Get price display info from VAT context
			const priceDisplay = getPriceDisplay(priceObj.amount, 0.20, isVATExempt);
			
			return `${formatPrice(priceDisplay.displayPrice)} ${priceDisplay.label}`;
		};
	}, [getPriceDisplay, formatPrice, isProductVATExempt, product.type, showVATInclusive]);

	const { isTutorial, isMarking, isOnlineClassroom } = productTypeCheck;
	const isMaterial = !isTutorial && !isMarking;
	const { hasVariations, singleVariation, currentVariation } = variationInfo;

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

	// For Tutorial products, use the specialized component
	if (isTutorial) {
		return (
			<TutorialProductCard
				subjectCode={product.subject_code}
				subjectName={product.subject_name || product.product_name}
				location={product.location || product.product_name}
				productId={product.essp_id || product.id || product.product_id}
				product={product}
				variations={product.variations}
			/>
		);
	}

	// For Markings products, use the specialized component
	if (isMarking) {
		return (
			<MarkingProductCard
				product={product}
				onAddToCart={onAddToCart}
				allEsspIds={allEsspIds}
				bulkDeadlines={bulkDeadlines}
			/>
		);
	}

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

	const renderPriceModal = () => (
		<Modal show={showPriceModal} onHide={() => setShowPriceModal(false)} size="lg" centered>
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
											<td>{getPrice(variation, price.price_type)}</td>
										</tr>
									))
								)}
						</tbody>
					</table>
				</div>
			</Modal.Body>
		</Modal>
	);

	// Render Regular Product Content
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
											id={`retaker-${
												product.essp_id ||
												product.id ||
												product.product_id
											}`}
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

	// Determine header class based on product type
	const getHeaderClass = () => {
		if (isOnlineClassroom) return "tutorial-product-card-header";
		if (isMarking) return "marking-header";
		return "material-header";
	};

	return (
		<Col>
			<Card className="h-100 shadow-sm product-card">
				<Card.Header className={`product-card-header d-flex justify-content-between align-items-center ${getHeaderClass()}`}>
					<div>
						<h5 className="mb-0">Subject {product.subject_code}</h5>
						{isOnlineClassroom && (
							<h6 className="mb-0">Online Classroom</h6>
						)}
					</div>
				</Card.Header>

				{renderRegularContent()}
				{renderPriceModal()}
			</Card>
		</Col>
	);
});

export default ProductCard;
