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
import Select from "react-select";

const ProductList = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);
	const subjectFilter = queryParams.get("subject");
	const categoryFilter = queryParams.get("category");

	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [bulkDeadlines, setBulkDeadlines] = useState({});
	const [mainCategory, setMainCategory] = useState([]);
	const [subjectGroup, setSubjectGroup] = useState([]);
	const [deliveryMethod, setDeliveryMethod] = useState([]);
	const [groupFilters, setGroupFilters] = useState({ MAIN_CATEGORY: [], SUBJECT: [], DELIVERY_METHOD: [] });
	const [groupOptions, setGroupOptions] = useState({ MAIN_CATEGORY: [], SUBJECT: [], DELIVERY_METHOD: [] });

	const { addToCart } = useCart();

	useEffect(() => {
		if (subjectFilter) {
			setSubjectGroup([subjectFilter]);
		} else {
			setSubjectGroup([]); // Reset when no subject in URL
		}
	}, [subjectFilter]);

	useEffect(() => {
		if (categoryFilter) {
			setMainCategory([categoryFilter]);
		} else {
			setMainCategory([]); // Reset when no category in URL
		}
	}, [categoryFilter]);

	// Reset all filters when subject or category changes from navbar
	useEffect(() => {
		setMainCategory(categoryFilter ? [categoryFilter] : []);
		setSubjectGroup(subjectFilter ? [subjectFilter] : []);
		setDeliveryMethod([]);
	}, [subjectFilter, categoryFilter]);

	// Fetch products from backend when group filters change
	useEffect(() => {
		setLoading(true);
		setError(null);
		const params = new URLSearchParams();
		mainCategory.forEach(id => params.append('group', id));
		subjectGroup.forEach(id => params.append('group', id));
		deliveryMethod.forEach(id => params.append('group', id));
		productService.getAvailableProducts(params)
			.then((data) => {
				setProducts(data.products || []);
				setLoading(false);
			})
			.catch((err) => {
				setError("Failed to load products");
				setLoading(false);
			});
	}, [mainCategory, subjectGroup, deliveryMethod]);

	// Fetch product group filters for MAIN_CATEGORY, SUBJECT, DELIVERY_METHOD
	useEffect(() => {
		productService.getProductGroupFilters().then((filters) => {
			const filterMap = { MAIN_CATEGORY: [], SUBJECT: [], DELIVERY_METHOD: [] };
			const optionMap = { MAIN_CATEGORY: [], SUBJECT: [], DELIVERY_METHOD: [] };
			filters.forEach((f) => {
				if (f.filter_type === "MAIN_CATEGORY") {
					filterMap.MAIN_CATEGORY.push(...f.groups);
					optionMap.MAIN_CATEGORY.push(
						...f.groups
							.filter(g => g && g.id !== undefined && g.name)
							.map(g => ({ value: g.id, label: g.name }))
					);
				}
				if (f.filter_type === "SUBJECT") {
					filterMap.SUBJECT.push(...f.groups);
					optionMap.SUBJECT.push(
						...f.groups
							.filter(g => g && g.id !== undefined && g.name)
							.map(g => ({ value: g.id, label: g.name }))
					);
				}
				if (f.filter_type === "DELIVERY_METHOD") {
					filterMap.DELIVERY_METHOD.push(...f.groups);
					optionMap.DELIVERY_METHOD.push(
						...f.groups
							.filter(g => g && g.id !== undefined && g.name)
							.map(g => ({ value: g.id, label: g.name }))
					);
				}
			});
			setGroupFilters(filterMap);
			setGroupOptions(optionMap);
		});
	}, []);

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

	// Handle main category selection change
	const handleMainCategoryChange = (selected) => setMainCategory(selected ? selected.map(opt => opt.value) : []);

	// Handle subject group selection change
	const handleSubjectGroupChange = (selected) => setSubjectGroup(selected ? selected.map(opt => opt.value) : []);

	// Handle delivery method selection change
	const handleDeliveryMethodChange = (selected) => setDeliveryMethod(selected ? selected.map(opt => opt.value) : []);

	const handleAddToCart = (product) => {
		addToCart(product);
	};

	const filteredProducts = products;

	if (loading) return <div>Loading products...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<Container>
			<h2>Available Products</h2>

			{/* Filter Dropdowns */}
			<Row className="mb-4">
				<div>Filter by:</div>
				<Col md={3}>
					<Form.Group>
						<Form.Label>Main Category</Form.Label>
						<Select
							isMulti
							options={groupOptions.MAIN_CATEGORY}
							value={groupOptions.MAIN_CATEGORY.filter(opt => mainCategory.includes(opt.value))}
							onChange={handleMainCategoryChange}
							placeholder="All Main Categories"
							classNamePrefix="filter-dropdown"
						/>
					</Form.Group>
				</Col>

				<Col md={3}>
					<Form.Group>
						<Form.Label>Subject Group</Form.Label>
						<Select
							isMulti
							options={groupOptions.SUBJECT}
							value={groupOptions.SUBJECT.filter(opt => subjectGroup.includes(opt.value))}
							onChange={handleSubjectGroupChange}
							placeholder="All Subject Groups"
							classNamePrefix="filter-dropdown"
						/>
					</Form.Group>
				</Col>

				<Col md={3}>
					<Form.Group>
						<Form.Label>Delivery Method</Form.Label>
						<Select
							isMulti
							options={groupOptions.DELIVERY_METHOD}
							value={groupOptions.DELIVERY_METHOD.filter(opt => deliveryMethod.includes(opt.value))}
							onChange={handleDeliveryMethodChange}
							placeholder="All Delivery Methods"
							classNamePrefix="filter-dropdown"
						/>
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
