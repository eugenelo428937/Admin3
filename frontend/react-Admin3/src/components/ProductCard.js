import React, { useState } from "react";
import { Col, Card, Button, Modal, OverlayTrigger, Tooltip } from "react-bootstrap";
import { CartPlus, ExclamationCircle, InfoCircle } from "react-bootstrap-icons";
import { useCart } from "../contexts/CartContext";
import MarkingProductCard from "./MarkingProductCard";
import "../styles/product_card.css";

const ProductCard = ({ product, onAddToCart, allEsspIds, bulkDeadlines }) => {
	const [selectedVariation, setSelectedVariation] = useState("");
	const [showPriceModal, setShowPriceModal] = useState(false);
	const [selectedPriceType, setSelectedPriceType] = useState("standard");
	const [showDiscounts, setShowDiscounts] = useState(false);

	if (product.type === "Markings") {
		return (
			<MarkingProductCard
				product={product}
				onAddToCart={onAddToCart}
				allEsspIds={allEsspIds}
				bulkDeadlines={bulkDeadlines}
			/>
		);
	}

	const hasVariations = product.variations && product.variations.length > 0;
	const singleVariation =
		product.variations && product.variations.length === 1
			? product.variations[0]
			: null;	const currentVariation = hasVariations
		? product.variations.find((v) => v.id === parseInt(selectedVariation)) || singleVariation || product.variations[0]
		: singleVariation;	const getPrice = (variation, priceType) => {
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

	return (
		<Col>
			<Card className="h-100 shadow-sm product-card">
				<Card.Header className="bg-primary text-white product-card-header">
					<h5 className="mb-0">{product.subject_code}</h5>
				</Card.Header>{" "}
				<Card.Body>
					<div className="d-flex justify-content-between align-items-center mt-2">
						<Card.Title className="mb-0">
							{product.product_name}
						</Card.Title>
					</div>
				</Card.Body>{" "}
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
									id={`variation-select-${
										product.essp_id ||
										product.id ||
										product.product_id
									}`}
									className="form-select me-2"
									style={{ minWidth: 150 }}
									value={selectedVariation}
									onChange={(e) =>
										setSelectedVariation(e.target.value)
									}>
									<option value="">Please select</option>
									{product.variations.map((variation) => (
										<option key={variation.id} value={variation.id}>
											{variation.name}
										</option>
									))}
								</select>
							)}
						</div>
					</div>{" "}
					<div className="d-flex justify-content-between align-items-end">
						<div className="d-flex flex-column">
							<div className="d-flex align-items-center mb-2">
								<span
									className="fw-bold me-3"
									style={{ fontSize: "1.2em" }}>
									{getPrice(currentVariation, selectedPriceType)
										? getPrice(currentVariation, selectedPriceType)
										: "-"}
								</span>
								<div className="d-flex justify-content-between align-items-center">
									<div className="d-flex align-items-center">
										<OverlayTrigger
											placement="top"
											overlay={
												<Tooltip>Show all price types</Tooltip>
											}>
											<InfoCircle
												role="button"
												className="text-info me-2"
												onClick={() => setShowPriceModal(true)}
												style={{ cursor: "pointer" }}
											/>
										</OverlayTrigger>
									</div>
								</div>
							</div>
							<div className="mb-2">
								<div
									className="d-flex align-items-center"
									style={{ cursor: "pointer" }}
									onClick={() => setShowDiscounts(!showDiscounts)}>
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
												onChange={() =>
													handlePriceTypeChange("retaker")
												}
											/>
											<label
												className="form-check-label"
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
												checked={
													selectedPriceType === "additional"
												}
												onChange={() =>
													handlePriceTypeChange("additional")
												}
											/>
											<label
												className="form-check-label"
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
								variant="success"
								className="d-flex flex-row flex-wrap align-items-center justify-content-center product-add-to-cart-button p-2"
								onClick={() => onAddToCart(product)}
								disabled={
									hasVariations &&
									!singleVariation &&
									!selectedVariation
								}>
								<CartPlus className="bi d-flex flex-row align-items-center" />
							</Button>
						</div>
					</div>
				</Card.Footer>
				{renderPriceModal()}
			</Card>
		</Col>
	);
};

export default ProductCard;
