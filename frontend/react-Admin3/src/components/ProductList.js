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
import subjectService from "../services/subjectService";
import "../styles/product_list.css";
import ProductCard from "./ProductCard";
import Select from "react-select";
import { FilterCircle } from "react-bootstrap-icons";
import Accordion from 'react-bootstrap/Accordion';

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
	const [groupFilters, setGroupFilters] = useState({ MAIN_CATEGORY: [], DELIVERY_METHOD: [] });
	const [groupOptions, setGroupOptions] = useState({ MAIN_CATEGORY: [], DELIVERY_METHOD: [] });
	const [subjectOptions, setSubjectOptions] = useState([]);
	const [showFilters, setShowFilters] = useState(true);
	const [isMobile, setIsMobile] = useState(false);

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
		mainCategory.forEach(id => params.append('main_category', id));
		deliveryMethod.forEach(id => params.append('delivery_method', id));
		subjectGroup.forEach(id => params.append('subject', id));
		
		console.debug('Product filter params:', params.toString());
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

	// Fetch all subjects for the Subject filter
	useEffect(() => {
		subjectService.getAll().then((subjects) => {
			setSubjectOptions(
				(subjects || []).map((s) => ({ value: s.id, label: s.name || s.code }))
			);
		});
	}, []);

	// Fetch product group filters for MAIN_CATEGORY and DELIVERY_METHOD only
	useEffect(() => {
		productService.getProductGroupFilters().then((filters) => {
			const filterMap = { MAIN_CATEGORY: [], DELIVERY_METHOD: [] };
			const optionMap = { MAIN_CATEGORY: [], DELIVERY_METHOD: [] };
			filters.forEach((f) => {
				if (f.filter_type === "MAIN_CATEGORY") {
					filterMap.MAIN_CATEGORY.push(...f.groups);
					optionMap.MAIN_CATEGORY.push(
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
		// For marking products, use the correct ExamSessionSubjectProduct id (essp_id)
		const markingProducts = products.filter((p) => p.type === "Markings");
		const allEsspIds = markingProducts.map((p) => p.essp_id || p.id || p.product_id);
		if (allEsspIds.length > 0) {
			productService.getBulkMarkingDeadlines(allEsspIds).then((deadlines) => {
				setBulkDeadlines(deadlines);
			});
		} else {
			setBulkDeadlines({});
		}
	}, [products]);

	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth <= 991); // Bootstrap lg breakpoint
			if (window.innerWidth > 991) setShowFilters(true);
		};
		window.addEventListener('resize', handleResize);
		handleResize();
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const handleMainCategoryChange = (selected) => setMainCategory(selected ? selected.map(opt => opt.value) : []);
	const handleSubjectGroupChange = (selected) => setSubjectGroup(selected ? selected.map(opt => opt.value) : []);
	const handleDeliveryMethodChange = (selected) => setDeliveryMethod(selected ? selected.map(opt => opt.value) : []);
	const handleAddToCart = (product, priceInfo) => {
		addToCart(product, priceInfo);
	};
	const handleFilterToggle = () => setShowFilters((prev) => !prev);

	const filteredProducts = products;

	if (loading) return <div>Loading products...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<Container fluid className="product-list-container mx-3">
			<h2 className="my-3">Product List</h2>

			<div className="d-flex align-items-center mb-3">
				<button
					className="filter-toggle-btn"
					onClick={handleFilterToggle}
					aria-label="Toggle Filters"
					style={{
						border: 0,
						backgroundColor: "var(--main-backgound-color)",
					}}>
					<FilterCircle size={20} style={{ marginRight: 8 }} />
					<span>Filter</span>
				</button>
			</div>
			
			<Row
				className={`gx-4${isMobile ? " flex-column" : ""}`}
				style={{ position: "relative", minHeight: "80vh" }}>
				{/* Filter Panel */}
				<Col
					xs={12}
					md={1}
					lg={1}
					className={`filter-panel${showFilters ? " show" : " hide"}${
						isMobile ? " mobile" : ""
					}`}
					style={{
						position: isMobile ? "static" : "absolute",
						left: 0,
						top: 0,
						zIndex: 3,
						width: isMobile ? "100%" : showFilters ? "20%" : 0,
						minWidth: isMobile ? undefined : showFilters ? "200px" : 0,
						maxWidth: isMobile ? undefined : showFilters ? "300px" : 0,
						background: isMobile ? undefined : "white",
						boxShadow:
							showFilters && !isMobile
								? "2px 0 8px rgba(0,0,0,0.08)"
								: "none",
						transition: "all 0.5s cubic-bezier(.5,.5,.5,.5)",
						overflow: "hidden",
						display: showFilters || isMobile ? "block" : "none",
					}}>
					<div
						className="filters-wrapper p-3 bg-light rounded shadow-sm mb-4 rf-searchfilters"
						id="rf-searchfilters">
						<Accordion
							defaultActiveKey={[
								"subject",
								"main_category",
								"delivery_method",
							]}
							alwaysOpen>
							<Accordion.Item eventKey="subject">
								<Accordion.Header>Subject</Accordion.Header>
								<Accordion.Body>
									<fieldset className="rf-facetlist">
										<ul className="rf-facetlist-list">
											{subjectOptions.map((opt) => (
												<li
													className="rf-facetlist-item"
													key={opt.value}>
													<input
														type="checkbox"
														id={`subject-${opt.value}`}
														checked={subjectGroup.includes(
															opt.value
														)}
														onChange={(e) => {
															if (e.target.checked) {
																setSubjectGroup([
																	...subjectGroup,
																	opt.value,
																]);
															} else {
																setSubjectGroup(
																	subjectGroup.filter(
																		(id) => id !== opt.value
																	)
																);
															}
														}}
													/>
													<label htmlFor={`subject-${opt.value}`}>
														{opt.label}
													</label>
												</li>
											))}
										</ul>
									</fieldset>
								</Accordion.Body>
							</Accordion.Item>
							<Accordion.Item eventKey="main_category">
								<Accordion.Header>Main Category</Accordion.Header>
								<Accordion.Body>
									<fieldset className="rf-facetlist">
										<ul className="rf-facetlist-list">
											{groupOptions.MAIN_CATEGORY.map((opt) => (
												<li
													className="rf-facetlist-item"
													key={opt.value}>
													<input
														type="checkbox"
														id={`maincat-${opt.value}`}
														checked={mainCategory.includes(
															opt.value
														)}
														onChange={(e) => {
															if (e.target.checked) {
																setMainCategory([
																	...mainCategory,
																	opt.value,
																]);
															} else {
																setMainCategory(
																	mainCategory.filter(
																		(id) => id !== opt.value
																	)
																);
															}
														}}
													/>
													<label htmlFor={`maincat-${opt.value}`}>
														{opt.label}
													</label>
												</li>
											))}
										</ul>
									</fieldset>
								</Accordion.Body>
							</Accordion.Item>
							<Accordion.Item eventKey="delivery_method">
								<Accordion.Header>Mode of Delivery</Accordion.Header>
								<Accordion.Body>
									<fieldset className="rf-facetlist">
										<ul className="rf-facetlist-list">
											{groupOptions.DELIVERY_METHOD.map((opt) => (
												<li
													className="rf-facetlist-item"
													key={opt.value}>
													<input
														type="checkbox"
														id={`delivery-${opt.value}`}
														checked={deliveryMethod.includes(
															opt.value
														)}
														onChange={(e) => {
															if (e.target.checked) {
																setDeliveryMethod([
																	...deliveryMethod,
																	opt.value,
																]);
															} else {
																setDeliveryMethod(
																	deliveryMethod.filter(
																		(id) => id !== opt.value
																	)
																);
															}
														}}
													/>
													<label htmlFor={`delivery-${opt.value}`}>
														{opt.label}
													</label>
												</li>
											))}
										</ul>
									</fieldset>
								</Accordion.Body>
							</Accordion.Item>
						</Accordion>
					</div>
				</Col>
				
				{/* Product Cards Panel */}
				<Col
					xs={12}
					md={11}
					lg={11}
					className={`product-cards-panel${
						showFilters && !isMobile ? " with-filter" : " full-width"
					}${isMobile ? " mobile" : ""}`}
					style={{
						marginLeft:
							showFilters && !isMobile ? (isMobile ? 0 : "20%") : 0,
						width: showFilters && !isMobile ? "80%" : "100%",
						transition: "all 0.5s cubic-bezier(.5,.5,.5,.5)",
						minWidth: 0,
						position: isMobile ? "static" : "relative",
						zIndex: 2,
						minHeight: isMobile ? undefined : "100vh",
					}}>
					{filteredProducts.length === 0 ? (
						<Alert variant="info" className="mt-3">
							No products available based on selected filters.
						</Alert>
					) : (
						<Row xs={1} md={3} lg={3} xl={4} className="g-4">
							{filteredProducts.map((product) => (
								<ProductCard
									key={product.essp_id || product.id || product.product_id}
									product={product}
									onAddToCart={handleAddToCart}
									allEsspIds={filteredProducts
										.filter((p) => p.type === "Markings")
										.map((p) => p.essp_id || p.id || p.product_id)}
									bulkDeadlines={bulkDeadlines}
								/>
							))}
						</Row>
					)}
				</Col>
			</Row>
		</Container>
	);
};

export default ProductList;
