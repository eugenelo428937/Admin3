import React, { useState, useEffect } from "react";
import { Col, Card, Button, Modal, OverlayTrigger, Tooltip } from "react-bootstrap";
import { CartPlus, InfoCircle } from "react-bootstrap-icons";
import { useCart } from "../contexts/CartContext";
import MarkingProductCard from "./MarkingProductCard";
import TutorialProductCard from "./TutorialProductCard";
import "../styles/product_card.css";

const ProductCard = ({ product, onAddToCart, allEsspIds, bulkDeadlines }) => {
	const [selectedVariation, setSelectedVariation] = useState("");
	const [showPriceModal, setShowPriceModal] = useState(false);
	const [selectedPriceType, setSelectedPriceType] = useState("standard");
	const [showDiscounts, setShowDiscounts] = useState(false);

	const { addToCart } = useCart();

	// Handle product type logic
	console.log("Product Card Rendered for:", product.product_name);
	console.log("Product Type:", product.type);
	const isTutorial = product.type === 'Tutorial';
	const isMarking = product.type === 'Markings';
	const isMaterial = !isTutorial && !isMarking;

	const hasVariations = product.variations && product.variations.length > 0;
	const singleVariation =
		product.variations && product.variations.length === 1
			? product.variations[0]
			: null;

	const currentVariation = hasVariations
		? product.variations.find((v) => v.id === parseInt(selectedVariation)) || singleVariation || product.variations[0]
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

	// For Tutorial products, use the specialized component
	if (isTutorial) {
		return (
			<TutorialProductCard
				subjectCode={product.subject_code}
				subjectName={product.subject_name || product.product_name}
				location={product.location || product.product_name}
				productId={product.product_id}
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

	// Get header background color for material products
	const getHeaderStyle = () => {
		return { 
			backgroundColor: 'rgba(239, 246, 255, 1)',
			color: '#1e40af',
			border: '1px solid #bfdbfe'
		};
	};

	const getPrice = (variation, priceType) => {
		if (!variation || !variation.prices) return null;
		const priceObj = variation.prices.find((p) => p.price_type === priceType);
		return priceObj ? `£${priceObj.amount}` : null;
	};

	const handlePriceTypeChange = (priceType) => {
		if (selectedPriceType === priceType) {
			setSelectedPriceType("standard");
		} else {
			setSelectedPriceType(priceType);
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
					<div>
						<span className="form-label mb-1">Product Variation:</span>
					</div>
					<div>
						{singleVariation && (
							<span className="form-label mb-0">
								<b>{singleVariation.name}</b>
							</span>
						)}
						{hasVariations && !singleVariation && (
							<select
								id={`variation-select-${product.essp_id || product.id || product.product_id}`}
								className="form-select me-2"
								style={{ minWidth: 150 }}
								value={selectedVariation}
								onChange={(e) => setSelectedVariation(e.target.value)}
								aria-label="Select product variation">
								<option value="">Please select</option>
								{product.variations.map((variation) => (
									<option key={variation.id} value={variation.id}>
										{variation.name}
									</option>
								))}
							</select>
						)}
					</div>
				</div>

				<div className="d-flex justify-content-between align-items-end">
					<div className="d-flex flex-column">
						<div className="d-flex align-items-center mb-2">
							<span className="fw-bold me-3" style={{ fontSize: "1.2em" }}>
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
											id={`retaker-${product.essp_id || product.id || product.product_id}`}
											checked={selectedPriceType === "retaker"}
											disabled={!hasPriceType(currentVariation, "retaker")}
											onChange={() => handlePriceTypeChange("retaker")}
										/>
										<label
											className={`form-check-label ${!hasPriceType(currentVariation, "retaker") ? "text-muted" : ""}`}
											htmlFor={`retaker-${product.essp_id || product.id || product.product_id}`}>
											Retaker
										</label>
									</div>
									<div className="form-check">
										<input
											className="form-check-input"
											type="checkbox"
											id={`additional-${product.essp_id || product.id || product.product_id}`}
											checked={selectedPriceType === "additional"}
											disabled={!hasPriceType(currentVariation, "additional")}
											onChange={() => handlePriceTypeChange("additional")}
										/>
										<label
											className={`form-check-label ${!hasPriceType(currentVariation, "additional") ? "text-muted" : ""}`}
											htmlFor={`additional-${product.essp_id || product.id || product.product_id}`}>
											Additional Copy
										</label>
									</div>
								</div>
							)}
						</div>
					</div>
					<div>
						<Button
							variant="success"
							className="d-flex flex-row flex-wrap align-items-center justify-content-center product-add-to-cart-button p-2"
							onClick={() => {
								const priceObj = currentVariation?.prices?.find(p => p.price_type === selectedPriceType);
								onAddToCart(product, {
									variationId: currentVariation?.id,
									priceType: selectedPriceType,
									actualPrice: priceObj?.amount
								});
							}}
							disabled={hasVariations && !singleVariation && !selectedVariation}
							aria-label="Add product to cart">
							<CartPlus className="bi d-flex flex-row align-items-center" />
						</Button>
					</div>
				</div>
			</Card.Footer>
		</>
	);

	return (
		<Col>
			<Card className="h-100 shadow-sm product-card">
				<Card.Header 
					className="product-card-header d-flex justify-content-between align-items-center" 
					style={getHeaderStyle()}>
					<div>
						<h5 className="mb-0">{product.subject_code}</h5>
					</div>
				</Card.Header>

				{renderRegularContent()}
				{renderPriceModal()}
			</Card>
		</Col>
	);
};

export default ProductCard;
