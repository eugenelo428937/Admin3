import React from 'react';
import { Card, Button, Spinner, Modal } from 'react-bootstrap';
import { CartPlus, ExclamationCircle } from 'react-bootstrap-icons';
import productService from '../services/productService';

const MarkingProductCard = ({ product, onAddToCart }) => {
    const [deadlines, setDeadlines] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [showModal, setShowModal] = React.useState(false);

    React.useEffect(() => {
        console.log("MarkingProductCard product:", product);
        const fetchDeadlines = async () => {
            setLoading(true);
            try {
                const esspId = product.id || product.product_id;
                console.log("esspId used for deadlines:", esspId);
                const data = await productService.getMarkingDeadlines(esspId);
                console.log("data:", data);
                setDeadlines(data || []);
            } catch (e) {
                setDeadlines([]);
            }
            setLoading(false);
        };
        fetchDeadlines();
    }, [product]);

    const now = new Date();
    const parsedDeadlines = deadlines.map(d => ({
        ...d,
        deadline: new Date(d.deadline),
        recommended_submit_date: new Date(d.recommended_submit_date)
    }));
    const upcoming = parsedDeadlines.filter(d => d.deadline > now).sort((a, b) => a.deadline - b.deadline);
    const expired = parsedDeadlines.filter(d => d.deadline <= now).sort((a, b) => b.deadline - a.deadline);
    const allExpired = deadlines.length > 0 && expired.length === deadlines.length;

    return (
			<>
				<Card className="h-100 shadow-sm">
					<Card.Header className="bg-primary text-white product-card-header">
						<h5 className="mb-0">{product.subject_code}</h5>
					</Card.Header>
					<Card.Body>
						<Card.Title>{product.product_name}</Card.Title>
						<div className="mt-2">
							{loading ? (
								<Spinner animation="border" size="sm" />
							) : (
								<>
									{upcoming.length > 0 && (
										<div>
											<strong>Upcoming deadlines:</strong>{" "}
											<span>
												{upcoming[0].deadline.toLocaleDateString()}
											</span>
										</div>
									)}
									{(expired.length > 0 || allExpired) && (
										<div
											className={
												allExpired
													? "text-danger d-flex align-items-center mt-1"
													: "text-warning d-flex align-items-center mt-1"
											}>
											<ExclamationCircle className="me-1" />
											{allExpired
												? "All deadline expired"
												: `${expired.length} expired`}
										</div>
									)}
									{
										<div className="mt-2">
											<Button
												variant="link"
												size="sm"
												className="p-0"
												onClick={() => setShowModal(true)}>
												Show all deadlines
											</Button>
										</div>
									}
								</>
							)}
						</div>
					</Card.Body>
					<Card.Footer className="bg-white border-0 d-flex flex-row flex-wrap justify-content-end">
						<Button
							variant="success"
							className="d-flex flex-row flex-wrap align-items-center justify-content-center product-add-to-cart-button p-2"
							onClick={() => onAddToCart(product)}>
							<CartPlus className="bi d-flex flex-row align-items-center" />
						</Button>
					</Card.Footer>
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
															"text-center " + (isDeadlineExpired
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
								onClick={() => { onAddToCart(product); setShowModal(false); }}
							>
								<CartPlus className="bi d-flex flex-row align-items-center" />
								<span className="ms-1">Add to Cart</span>
							</Button>
					</Modal.Footer>
				</Modal>
			</>
		);
};

export default MarkingProductCard;
