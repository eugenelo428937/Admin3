import React, { useState, useEffect, useCallback } from "react";
import {
	Container,
	Row,
	Col,
	Card,
	Form,
	Alert,
	Button,
} from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import productService from "../services/productService";
import "../styles/ProductList.css";

const ProductList = () => {
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [productTypes, setProductTypes] = useState([]);
	const [productSubtypes, setProductSubtypes] = useState([]);
	const [subjects, setSubjects] = useState([]);
	const [selectedType, setSelectedType] = useState("");
	const [selectedSubtype, setSelectedSubtype] = useState("");
	const [selectedSubject, setSelectedSubject] = useState("");

	const navigate = useNavigate();
	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);
	const subjectFilter = queryParams.get("subject");

	useEffect(() => {
		if (subjectFilter) {
			setSelectedSubject(subjectFilter);
		} else {
			setSelectedSubject(""); // Reset when no subject in URL
		}
	}, [subjectFilter]);

	// Fetch all available products and filter options
	const fetchAvailableProducts = useCallback(async () => {
		try {
			setLoading(true);

			// Build query parameters
			const params = new URLSearchParams();
			if (selectedSubject) params.append("subject_code", selectedSubject);
			if (selectedType) params.append("type", selectedType);
			if (selectedSubtype) params.append("subtype", selectedSubtype);

			const response = await productService.getAvailableProducts(params);

			// Handle the new response structure
			setProducts(response.products || []);

			// Set filter options from the response
			if (response.filters) {
				setSubjects(response.filters.subjects || []);
				setProductTypes(response.filters.product_types || []);

				// If a type is selected, filter subtypes based on that type
				// But we're now using the full list from the server
				setProductSubtypes(response.filters.product_subtypes || []);
			}

			setLoading(false);
		} catch (err) {
			setError("Failed to fetch products");
			setLoading(false);
			console.error(err);
		}
	}, [selectedType, selectedSubtype, selectedSubject, subjectFilter]);

	

	useEffect(() => {
		fetchAvailableProducts();
	}, [fetchAvailableProducts]);

	// Handle subject selection change
	const handleSubjectChange = (event) => {
		setSelectedSubject(event.target.value);
	};

	// Handle type selection change
	const handleTypeChange = (event) => {
		const newType = event.target.value;
		setSelectedType(newType);
		setSelectedSubtype(""); // Reset subtype when type changes
	};

	// Handle subtype selection change
	const handleSubtypeChange = (event) => {
		setSelectedSubtype(event.target.value);
	};

	// Filter products based on selected filters (now handled by the server)
	// This is a client-side backup in case we need additional filtering
	const filteredProducts = products;

	// Handle product selection
	const handleProductSelect = (productId) => {
		navigate(`/products/${productId}`);
	};

	const handleAddToCart = (product) => {
		// You can implement cart functionality here
		console.log("Added to cart:", product);
		// For example, you might call a cart service to add the product
		// cartService.addToCart(product);
		alert(`Added ${product.product_name} to cart!`);
	};

	if (loading) return <div>Loading products...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<Container>
			<h2>Available Products</h2>
			{/* Filter Dropdowns */}
			<Row className="mb-4">
				<div>Filter by:</div>
				{/* Subject Filter */}
				<Col md={2}>
					<Form.Group>
						<Form.Label>Subjects</Form.Label>
						<Form.Control
							as="select"
							value={selectedSubject}
							onChange={handleSubjectChange}>
							<option value="">All Subjects</option>
							{subjects.map((subject) => (
								<option key={subject.id} value={subject.code}>
									{subject.code}
								</option>
							))}
						</Form.Control>
					</Form.Group>
				</Col>

				{/* Product Type Filter */}
				<Col md={2}>
					<Form.Group>
						<Form.Label>Product Type</Form.Label>
						<Form.Control
							as="select"
							value={selectedType}
							onChange={handleTypeChange}>
							<option value="">All Types</option>
							{productTypes.map((type, index) => (
								<option key={index} value={type}>
									{type}
								</option>
							))}
						</Form.Control>
					</Form.Group>
				</Col>

				{/* Product Subtype Filter */}
				<Col md={2}>
					<Form.Group>
						<Form.Label>Product Subtype</Form.Label>
						<Form.Control
							as="select"
							value={selectedSubtype}
							onChange={handleSubtypeChange}
							disabled={!selectedType} // Disable if no type is selected
						>
							<option value="">All Subtypes</option>
							{productSubtypes
								.filter(
									(subtype) =>
										!selectedType || subtype.includes(selectedType)
								)
								.map((subtype, index) => (
									<option key={index} value={subtype}>
										{subtype}
									</option>
								))}
						</Form.Control>
					</Form.Group>
				</Col>
			</Row>

			{/* Product Cards */}
			{filteredProducts.length === 0 ? (
				<Alert variant="info">
					No products available based on selected filters.
				</Alert>
			) : (
				<Row xs={1} md={2} lg={5} className="g-4">
					{filteredProducts.map((product) => (
						<Col key={product.id}>
							<Card className="h-100 shadow-sm">
								<Card.Header className="bg-primary text-white">
									<h5 className="mb-0">{product.subject_code}</h5>
								</Card.Header>
								<Card.Body>
									<Card.Title>{product.product_name}</Card.Title>
									<Card.Text>
										Product Code: {product.product_code}
										<br />
										Type: {product.product_type}
										<br />
										Subtype: {product.product_subtype}
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
