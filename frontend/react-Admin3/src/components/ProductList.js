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
import "../styles/product_list.css";
import ProductCard from "./ProductCard";

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

				updateFilteredSubtypes(productSubtypes, selectedType);
			}

			setLoading(false);
		} catch (err) {
			setError("Failed to fetch products");
			setLoading(false);
			console.error(err);
		}
	}, [selectedType, selectedSubtype, selectedSubject, subjectFilter]);

	// Update filtered subtypes whenever product type selection changes
	useEffect(() => {
		updateFilteredSubtypes(productSubtypes, selectedType);
	}, [selectedType, productSubtypes]);

	// Helper function to update filtered subtypes
	const updateFilteredSubtypes = (subtypes, type) => {
		if (!type) {
			// If no type is selected, show all subtypes
			setProductSubtypes(subtypes);
		} else {
			// Filter subtypes based on selected type
			// This assumes subtypes might be in format "Type:Subtype" or just "Subtype"
			const filtered = subtypes.filter((subtype) => {
				// Try different matching strategies
				return (
					subtype.startsWith(type + ":") ||
					subtype.includes(type) ||
					subtype.toLowerCase().includes(type.toLowerCase())
				);
			});
			setProductSubtypes(filtered);
		}
	};

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
		console.log("Added to cart:", product);
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
				{/* Your existing filter dropdowns... */}
				<Col md={2}>
					<Form.Group>
						<Form.Label>Subject</Form.Label>
						<Form.Control
							as="select"
							value={selectedSubject}
							onChange={handleSubjectChange}
							className="filter-dropdown">
							<option value="">All Subjects</option>
							{subjects.map((subject) => (
								<option key={subject.id} value={subject.code}>
									{subject.code}
								</option>
							))}
						</Form.Control>
					</Form.Group>
				</Col>

				<Col md={2}>
					<Form.Group>
						<Form.Label>Product Type</Form.Label>
						<Form.Control
							as="select"
							value={selectedType}
							onChange={handleTypeChange}
							className="filter-dropdown">
							<option value="">All Types</option>
							{productTypes.map((type, index) => (
								<option key={index} value={type}>
									{type}
								</option>
							))}
						</Form.Control>
					</Form.Group>
				</Col>

				<Col md={2}>
					<Form.Group>
						<Form.Label>Product Subtype</Form.Label>
						<Form.Control
							as="select"
							value={selectedSubtype}
							onChange={handleSubtypeChange}
							disabled={!selectedType}
							className="filter-dropdown">
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
			{products.length === 0 ? (
				<Alert variant="info">
					No products available based on selected filters.
				</Alert>
			) : (
				<Row xs={1} md={2} lg={5} className="g-4">
					{products.map((product) => (
						<ProductCard
							key={product.id}
							product={product}
							onAddToCart={handleAddToCart}
						/>
					))}
				</Row>
			)}
		</Container>
	);
};

export default ProductList;