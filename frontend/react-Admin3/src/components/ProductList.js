import React, { useState, useEffect } from "react";
import {
	Container,
	Row,
	Col,
	Form,
	Alert,
} from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { useProducts } from "../contexts/ProductContext";
import "../styles/product_list.css";
import ProductCard from "./ProductCard";
import { useCart } from "../contexts/CartContext";
import productService from "../services/productService";

const ProductList = () => {
	const { products, loading } = useProducts();
	const [error, setError] = useState(null);
	const [productTypes, setProductTypes] = useState([]);
	const [productSubtypes, setProductSubtypes] = useState([]);
	const [filteredSubtypes, setFilteredSubtypes] = useState([]); // Separate state for filtered subtypes
	const [subjects, setSubjects] = useState([]);
	const [selectedType, setSelectedType] = useState("");
	const [selectedSubtype, setSelectedSubtype] = useState("");
	const [selectedSubject, setSelectedSubject] = useState("");
	const [bulkDeadlines, setBulkDeadlines] = useState({});

	const navigate = useNavigate();
	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);
	const subjectFilter = queryParams.get("subject");

	const { addToCart } = useCart();

	useEffect(() => {
		if (subjectFilter) {
			setSelectedSubject(subjectFilter);
		} else {
			setSelectedSubject(""); // Reset when no subject in URL
		}
	}, [subjectFilter]);

	// Update filtered subtypes whenever product type selection or subtypes list changes
	useEffect(() => {
		// If no type is selected, show all subtypes
		if (!selectedType) {
			setFilteredSubtypes(productSubtypes);
		} else {
			// Filter subtypes based on selected type
			const filtered = productSubtypes.filter((subtype) => 
				subtype.startsWith(selectedType + ":") ||
				subtype.includes(selectedType) ||
				subtype.toLowerCase().includes(selectedType.toLowerCase())
			);
			setFilteredSubtypes(filtered);
		}
	}, [selectedType, productSubtypes]);

	// Fetch bulk deadlines whenever products change
	useEffect(() => {
		const markingProducts = products.filter((p) => p.type === "Markings");
		const allEsspIds = markingProducts.map((p) => p.id || p.product_id);
		if (allEsspIds.length > 0) {
			productService.getBulkMarkingDeadlines(allEsspIds).then((deadlines) => {
				setBulkDeadlines(deadlines);
			});
		} else {
			setBulkDeadlines({});
		}
	}, [products]);

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

	const handleAddToCart = (product) => {
		addToCart(product);
	};

	if (loading) return <div>Loading products...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<Container>
			<h2>Available Products</h2>

			{/* Filter Dropdowns */}
			<Row className="mb-4">
				<div>Filter by:</div>
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
							{filteredSubtypes.map((subtype, index) => (
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
							allEsspIds={products.filter((p) => p.type === "Markings").map((p) => p.id || p.product_id)}
							bulkDeadlines={bulkDeadlines}
						/>
					))}
				</Row>
			)}
		</Container>
	);
};

export default ProductList;
