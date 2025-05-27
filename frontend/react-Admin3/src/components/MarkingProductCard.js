import React from "react";
import {
	Card,
	Button,
	Spinner,
	Modal,
	Col,
	OverlayTrigger,
	Tooltip,
} from "react-bootstrap";
import { CartPlus, ExclamationCircle, InfoCircle } from "react-bootstrap-icons";
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
	const [selectedVariation, setSelectedVariation] = React.useState("");
	const [selectedPriceType, setSelectedPriceType] = React.useState("standard");
	const [showDiscounts, setShowDiscounts] = React.useState(false);

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
		? product.variations.find((v) => v.id === parseInt(selectedVariation)) ||
		  singleVariation ||
		  product.variations[0]
		: singleVariation;
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
				<Card.Header className="bg-primary text-white product-card-header">
					<h5 className="mb-0">{product.subject_code}</h5>
				</Card.Header>				<Card.Body>
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
								/>
							</OverlayTrigger>
						</div>
					</div>
					<div className="d-flex justify-content-between align-items-center mt-2">
						<Card.Title className="mb-0">{product.product_name}</Card.Title>
					</div>
				</Card.Body>				<Card.Footer className="bg-white border-0 d-flex flex-column">
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
									onChange={(e) => setSelectedVariation(e.target.value)}>
									<option value="">Please select</option>
									{product.variations.map((variation) => (
										<option key={variation.id} value={variation.id}>
											{variation.name}
										</option>
									))}
								</select>
							)}
						</div>
					</div>					<div className="d-flex justify-content-between align-items-center">
						<div className="d-flex flex-column">
							<div className="d-flex align-items-center mb-2">
								<span className="fw-bold me-3" style={{ fontSize: "1.2em" }}>
									{getPrice(currentVariation, selectedPriceType)
										? getPrice(currentVariation, selectedPriceType)
										: "-"}
								</span>
							</div>
							<div className="mb-2">
								<div 
									className="d-flex align-items-center"
									style={{ cursor: 'pointer' }}
									onClick={() => setShowDiscounts(!showDiscounts)}
								>
									<span className="me-2 text-primary">Discounts:</span>
									<span className="text-muted">
										{showDiscounts ? '▼' : '▶'}
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
												onChange={() => handlePriceTypeChange("retaker")}
											/>
											<label className="form-check-label" htmlFor={`retaker-${product.essp_id || product.id || product.product_id}`}>
												Retaker
											</label>
										</div>
										<div className="form-check">
											<input
												className="form-check-input"
												type="checkbox"
												id={`additional-${product.essp_id || product.id || product.product_id}`}
												checked={selectedPriceType === "additional_copy"}
												onChange={() => handlePriceTypeChange("additional_copy")}
											/>
											<label className="form-check-label" htmlFor={`additional-${product.essp_id || product.id || product.product_id}`}>
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
								onClick={() => onAddToCart(product)}>
								<CartPlus className="bi d-flex flex-row align-items-center" />
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
					</Button>
					<Button
						variant="success"
						className="d-flex flex-row flex-wrap align-items-center justify-content-center product-add-to-cart-button p-2 ms-2"
						onClick={() => {
							onAddToCart(product);
							setShowModal(false);
						}}>
						<CartPlus className="bi d-flex flex-row align-items-center" />
						<span className="ms-1">Add to Cart</span>
					</Button>
				</Modal.Footer>
			</Modal>
			{renderPriceModal()}
		</Col>
	);
};

export default MarkingProductCard;
