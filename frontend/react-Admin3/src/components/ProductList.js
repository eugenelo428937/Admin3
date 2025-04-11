import React, { useState, useEffect } from "react";
import {
	Container,
	Row,
	Col,
	Card,
	Button,
	Alert,
	Spinner,
} from "react-bootstrap";
import { useLocation } from "react-router-dom";
import productService from "../services/productService";

const ProductList = () => {
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const location = useLocation();

	const queryParams = new URLSearchParams(location.search);
	const subjectFilter = queryParams.get("subject");

	useEffect(() => {
		fetchAvailableProducts();
	}, [subjectFilter]);

	const fetchAvailableProducts = async () => {
		try {
			setLoading(true);
			const data = await productService.getAvailableProducts();

			let filteredProducts = [];
			// Check what data structure is being returned
			console.log("API Response:", data);
			// Ensure subjects is always an array
			if (Array.isArray(data)) {
				filteredProducts = data;
			} else if (data && data.results && Array.isArray(data.results)) {
				// If data is wrapped in an object with a results property
				filteredProducts = data.results;
			} else if (data && typeof data === "object") {
				// If data is an object of subjects
				filteredProducts = Object.values(data);
			} else {
				// Default to empty array if data format is unrecognized
				setError("Unexpected data format received from server");
				console.error("Unexpected data format:", data);
				return;
			}

			// Apply subject filter if provided
			if (subjectFilter) {
				filteredProducts = filteredProducts.filter(
					(product) => product.subject_code === subjectFilter
				);
			}
			setProducts(filteredProducts);
			setLoading(false);
		} catch (error) {
			console.error("Error fetching products:", error);
			setError("Failed to load products. Please try again later.");
			setLoading(false);
		}
	};

	const handleAddToCart = (product) => {
		// You can implement cart functionality here
		console.log("Added to cart:", product);
		// For example, you might call a cart service to add the product
		// cartService.addToCart(product);
		alert(`Added ${product.product_name} to cart!`);
	};

	if (loading) {
		return (
			<Container className="d-flex justify-content-center mt-5">
				<Spinner animation="border" role="status">
					<span className="visually-hidden">Loading...</span>
				</Spinner>
			</Container>
		);
	}

	if (error) {
		return (
			<Container className="mt-4">
				<Alert variant="danger">{error}</Alert>
			</Container>
		);
	}

	return (
		<Container className="mt-4">
			<h2 className="mb-4">Products</h2>

			{products.length === 0 ? (
				<Alert variant="info">No products available at the moment.</Alert>
			) : (
				<Row xs={1} md={2} lg={5} className="g-4">
					{products.map((product) => (
						<Col key={product.id}>
							<Card className="h-100 shadow-sm">
								<Card.Header className="bg-primary text-white">
									<h5 className="mb-0">
										{product.subject_code}
									</h5>
								</Card.Header>
								<Card.Body>
									<Card.Title>{product.product_name}</Card.Title>
									<Card.Text>
										Product Code: {product.product_code}
									</Card.Text>
								</Card.Body>
								<Card.Footer className="bg-white border-0">
									<Button
										variant="success"
										className="w-100"
										onClick={() => handleAddToCart(product)}>
										Add to Cart
									</Button>
								</Card.Footer>
							</Card>
						</Col>
					))}
				</Row>
			)}
		</Container>
	);
};
export default ProductList;
