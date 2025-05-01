import React, { useState, useEffect } from "react";
import {
	Container,
	Row,
	Col,
	Form,
	Alert,
} from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import productService from "../services/productService";
import "../styles/product_list.css";
import ProductCard from "./ProductCard";

const ProductList = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);
	const subjectFilter = queryParams.get("subject");
	const categoryFilter = queryParams.get("category");

	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [selectedType, setSelectedType] = useState("");
	const [selectedSubtype, setSelectedSubtype] = useState("");
	const [selectedSubject, setSelectedSubject] = useState("");
	const [bulkDeadlines, setBulkDeadlines] = useState({});
	const [productCategories, setProductCategories] = useState([]);
	const [selectedCategory, setSelectedCategory] = useState(categoryFilter || "");

	const { addToCart } = useCart();

	useEffect(() => {
		if (subjectFilter) {
			setSelectedSubject(subjectFilter);
		} else {
			setSelectedSubject(""); // Reset when no subject in URL
		}
	}, [subjectFilter]);

	useEffect(() => {
		if (categoryFilter) {
			setSelectedCategory(categoryFilter);
		} else {
			setSelectedCategory(""); // Reset when no category in URL
		}
	}, [categoryFilter]);

	// Reset all filters when subject or category changes from navbar
	useEffect(() => {
		setSelectedType("");
		setSelectedSubtype("");
		setSelectedSubject(subjectFilter || "");
		setSelectedCategory(categoryFilter || "");
	}, [subjectFilter, categoryFilter]);

	// Fetch products from backend when category or subject changes
	useEffect(() => {
		setLoading(true);
		setError(null);
		const params = {};
		if (categoryFilter) params.category = categoryFilter;
		if (subjectFilter) params.subject = subjectFilter;
		productService.getAvailableProducts(new URLSearchParams(params))
			.then((data) => {
				setProducts(data.products || []);
				setLoading(false);
			})
			.catch((err) => {
				setError("Failed to load products");
				setLoading(false);
			});
	}, [categoryFilter, subjectFilter]);

	// Fetch product categories from backend
	useEffect(() => {
		productService.getProductCategories().then((data) => {
			setProductCategories(data.filter((cat) => cat.is_display));
		});
	}, []);

	// Compute available filter options from products (not filteredProducts)
	const availableSubjects = Array.from(new Set(products.map(p => p.subject_code))).filter(Boolean).map(code => {
		const prod = products.find(p => p.subject_code === code);
		return { id: code, code, description: prod?.subject_description || code };
	});
	const availableTypes = Array.from(new Set(products.flatMap(p => p.product_types || []))).filter(Boolean);
	const availableSubtypes = Array.from(new Set(
		products
			.filter(p =>
				(!selectedType || (p.product_types || []).includes(selectedType)) &&
				(!selectedSubject || p.subject_code === selectedSubject)
			)
			.flatMap(p => p.product_subtypes || [])
	)).filter(Boolean);

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

	// Handle category selection change
	const handleCategoryChange = (event) => {
		const newCategory = event.target.value;
		setSelectedCategory(newCategory);
		const params = new URLSearchParams(location.search);
		if (newCategory) {
			params.set("category", newCategory);
		} else {
			params.delete("category");
		}
		navigate(`/products?${params.toString()}`);
	};

	const handleAddToCart = (product) => {
		addToCart(product);
	};

	const filteredProducts = products.filter((product) => {
		let match = true;
		if (selectedSubject && product.subject_code !== selectedSubject) match = false;
		if (selectedType && !(product.product_types || []).includes(selectedType)) match = false;
		if (selectedSubtype && !(product.product_subtypes || []).includes(selectedSubtype)) match = false;
		return match;
	});

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
						<Form.Label>Product Category</Form.Label>
						<Form.Control
							as="select"
							value={selectedCategory}
							onChange={handleCategoryChange}
							className="filter-dropdown">
							<option value="">All Categories</option>
							{productCategories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{cat.name}
								</option>
							))}
						</Form.Control>
					</Form.Group>
				</Col>

				<Col md={2}>
					<Form.Group>
						<Form.Label>Subject</Form.Label>
						<Form.Control
							as="select"
							value={selectedSubject}
							onChange={handleSubjectChange}
							className="filter-dropdown">
							<option value="">All Subjects</option>
								{availableSubjects.map((subject) => (
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
							{availableTypes.map((type, index) => (
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
							{availableSubtypes.map((subtype, index) => (
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
						<ProductCard
							key={product.id}
							product={product}
							onAddToCart={handleAddToCart}
							allEsspIds={filteredProducts.filter((p) => p.type === "Markings").map((p) => p.id || p.product_id)}
							bulkDeadlines={bulkDeadlines}
						/>
					))}
				</Row>
			)}
		</Container>
	);
};

export default ProductList;
