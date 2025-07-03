import config from "../config";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Typography } from "@mui/material";
import {
	Container,
	Row,
	Col,
	Form,
	Alert,
	Button,
	Spinner,
} from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useVAT } from "../contexts/VATContext";
import productService from "../services/productService";
import subjectService from "../services/subjectService";
import "../styles/product_list.css";
import ProductCard from "./ProductCard";
import VATToggle from "./VATToggle";
import Select from "react-select";
import { FilterCircle } from "react-bootstrap-icons";
import Accordion from "react-bootstrap/Accordion";

const ProductList = React.memo(() => {
	const navigate = useNavigate();
	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);
	const subjectFilter = queryParams.get("subject_code") || queryParams.get("subject");
	const categoryFilter = queryParams.get("main_category") || queryParams.get("category");
	const groupFilter = queryParams.get("group");
	const productFilter = queryParams.get("product");

	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState(null);
	const [bulkDeadlines, setBulkDeadlines] = useState({});
	const [mainCategory, setMainCategory] = useState([]);
	const [subjectGroup, setSubjectGroup] = useState([]);
	const [deliveryMethod, setDeliveryMethod] = useState([]);
	const [groupFilters, setGroupFilters] = useState({
		MAIN_CATEGORY: [],
		DELIVERY_METHOD: [],
	});
	const [groupOptions, setGroupOptions] = useState({
		MAIN_CATEGORY: [],
		DELIVERY_METHOD: [],
	});
	const [subjectOptions, setSubjectOptions] = useState([]);
	const [showFilters, setShowFilters] = useState(true);
	const [isMobile, setIsMobile] = useState(false);
	const [navbarGroupFilter, setNavbarGroupFilter] = useState(null);
	const [navbarProductFilter, setNavbarProductFilter] = useState(null);

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [hasNextPage, setHasNextPage] = useState(false);
	const [totalProducts, setTotalProducts] = useState(0);
	const PAGE_SIZE = config.pageSize;

	const { addToCart } = useCart();
	const { showVATInclusive } = useVAT();

	// Memoize expensive calculations
	const allEsspIds = useMemo(() => {
		const markingProducts = products.filter((p) => p.type === "Markings");
		return markingProducts.map((p) => p.essp_id || p.id || p.product_id);
	}, [products]);

	// Note: Subject handling moved to subjects fetch useEffect to handle code to ID conversion

	useEffect(() => {
		if (categoryFilter) {
			setMainCategory([categoryFilter]);
		} else {
			setMainCategory([]); // Reset when no category in URL
		}
	}, [categoryFilter]);

	// Handle navbar group filter
	useEffect(() => {
		if (groupFilter) {
			setNavbarGroupFilter(groupFilter);
			// Clear other filters when group filter is applied
			setMainCategory([]);
			setSubjectGroup([]);
			setDeliveryMethod([]);
		} else {
			setNavbarGroupFilter(null);
		}
	}, [groupFilter]);

	// Handle navbar product filter
	useEffect(() => {
		if (productFilter) {
			setNavbarProductFilter(productFilter);
			// Clear other filters when product filter is applied
			setMainCategory([]);
			setSubjectGroup([]);
			setDeliveryMethod([]);
			setNavbarGroupFilter(null);
		} else {
			setNavbarProductFilter(null);
		}
	}, [productFilter]);

	// Reset category filter when it changes from navbar (subject handled in subjects fetch useEffect)
	useEffect(() => {
		setMainCategory(categoryFilter ? [categoryFilter] : []);
		setDeliveryMethod([]);
	}, [categoryFilter]);

	// Function to fetch products with pagination
	const fetchProducts = useCallback(
		async (page = 1, resetProducts = true) => {
			if (page === 1) {
				setLoading(true);
			} else {
				setLoadingMore(true);
			}
			setError(null);

			const params = new URLSearchParams();
			
			// Add navbar filters if present
			if (navbarGroupFilter) {
				params.append("group", navbarGroupFilter);
			}
			if (navbarProductFilter) {
				params.append("product", navbarProductFilter);
			}
			
			// Add regular filters (only if navbar filters are not active)
			if (!navbarGroupFilter && !navbarProductFilter) {
				mainCategory.forEach((id) => params.append("main_category", id));
				deliveryMethod.forEach((id) => params.append("delivery_method", id));
				subjectGroup.forEach((id) => params.append("subject", id));
			}

			console.debug(
				"Product filter params:",
				params.toString(),
				"Page:",
				page
			);

			try {
				const data = await productService.getAvailableProducts(
					params,
					page,
					PAGE_SIZE
				);

				// Handle paginated response
				const newProducts = data.products || data.results || [];
				const pagination = data.pagination || {};

				if (resetProducts || page === 1) {
					setProducts(newProducts);
				} else {
					setProducts((prev) => [...prev, ...newProducts]);
				}

				// Update pagination state
				setHasNextPage(pagination.has_next || false);
				setTotalProducts(pagination.count || newProducts.length);
				setCurrentPage(page);
			} catch (err) {
				setError("Failed to load products");
			} finally {
				setLoading(false);
				setLoadingMore(false);
			}
		},
		[mainCategory, subjectGroup, deliveryMethod, navbarGroupFilter, navbarProductFilter, PAGE_SIZE]
	);

	// Load more products function
	const loadMoreProducts = useCallback(() => {
		if (hasNextPage && !loadingMore) {
			fetchProducts(currentPage + 1, false);
		}
	}, [hasNextPage, loadingMore, currentPage, fetchProducts]);

	// Reset and fetch products when filters change
	useEffect(() => {
		setCurrentPage(1);
		fetchProducts(1, true);
	}, [mainCategory, subjectGroup, deliveryMethod, navbarGroupFilter, navbarProductFilter]);

	// Fetch all subjects for the Subject filter
	useEffect(() => {
		subjectService.getAll().then((subjects) => {
			setSubjectOptions(
				(subjects || []).map((s) => ({
					value: s.id,
					label: s.name || s.code,
				}))
			);
			
			// If we have a subject_code from URL, convert it to subject ID
			if (subjectFilter && typeof subjectFilter === 'string' && isNaN(parseInt(subjectFilter))) {
				const foundSubject = subjects.find(s => s.code === subjectFilter);
				if (foundSubject) {
					console.log(`Converting subject_code ${subjectFilter} to ID ${foundSubject.id}`);
					setSubjectGroup([foundSubject.id]);
				}
			}
		});
	}, [subjectFilter]);

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
							.filter((g) => g && g.id !== undefined && g.name)
							.map((g) => ({ value: g.id, label: g.name }))
					);
				}
				if (f.filter_type === "DELIVERY_METHOD") {
					filterMap.DELIVERY_METHOD.push(...f.groups);
					optionMap.DELIVERY_METHOD.push(
						...f.groups
							.filter((g) => g && g.id !== undefined && g.name)
							.map((g) => ({ value: g.id, label: g.name }))
					);
				}
			});
			setGroupFilters(filterMap);
			setGroupOptions(optionMap);
		});
	}, []);

	// Fetch bulk deadlines whenever products change
	useEffect(() => {
		if (allEsspIds.length > 0) {
			productService
				.getBulkMarkingDeadlines(allEsspIds)
				.then((deadlines) => {
					setBulkDeadlines(deadlines);
				});
		} else {
			setBulkDeadlines({});
		}
	}, [allEsspIds]);

	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth <= 991); // Bootstrap lg breakpoint
			if (window.innerWidth > 991) setShowFilters(true);
		};
		window.addEventListener("resize", handleResize);
		handleResize();
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const handleMainCategoryChange = (selected) =>
		setMainCategory(selected ? selected.map((opt) => opt.value) : []);
	const handleSubjectGroupChange = (selected) =>
		setSubjectGroup(selected ? selected.map((opt) => opt.value) : []);
	const handleDeliveryMethodChange = (selected) =>
		setDeliveryMethod(selected ? selected.map((opt) => opt.value) : []);
	const handleAddToCart = (product, priceInfo) => {
		addToCart(product, priceInfo);
	};
	const handleFilterToggle = () => setShowFilters((prev) => !prev);

	if (loading) return <div>Loading products...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<Container fluid className="product-list-container px-xl-5 px-lg-4 px-md-3 px-sm-2 px-xs-1">
			<div className="d-flex justify-content-between align-items-center my-3 mt-4">
				<div>
					<Typography variant="h4" className="mb-0">
						Product List
					</Typography>
					{navbarGroupFilter && (
						<div className="text-muted small">
							Filtered by: <strong>{navbarGroupFilter}</strong>
						</div>
					)}
					{navbarProductFilter && (
						<div className="text-muted small">
							Showing specific product
						</div>
					)}
				</div>
				<VATToggle />
			</div>

			<div className="d-flex align-items-center mb-3">
				<button
					className="filter-toggle-btn"
					onClick={handleFilterToggle}
					aria-label="Toggle Filters"					
					style={{
						border: 0,
						backgroundColor: "var(--main-backgound-color)",						
					}}>
					<FilterCircle size={18} style={{ marginRight: 6 }} />
					<span>
						<Typography variant="button" color="text-primary">
							Filter
						</Typography>
					</span>
				</button>
				{(navbarGroupFilter || navbarProductFilter) && (
					<Button
						variant="outline-secondary"
						size="sm"
						className="ms-3"
						onClick={() => {
							navigate("/products");
						}}>
						Clear Filter
					</Button>
				)}
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
														className="me-1"
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
					{products.length === 0 && !loading ? (
						<Alert variant="info" className="mt-3">
							No products available based on selected filters.
						</Alert>
					) : (
						<>
							{/* Product count display */}
							<div className="d-flex justify-content-between align-items-center mb-3">
								<div className="text-muted">
									Showing {products.length} of {totalProducts} products
								</div>
								{hasNextPage && (
									<small className="text-muted">
										{PAGE_SIZE * (currentPage - 1) + products.length}{" "}
										loaded, more available
									</small>
								)}
							</div>

							<Row xs={1} md={3} lg={3} xl={4} className="g-4">
								{products.map((product) => (
									<Col key={
										product.essp_id ||
										product.id ||
										product.product_id
									}>
										<ProductCard
											product={product}
											onAddToCart={handleAddToCart}
											allEsspIds={allEsspIds}
											bulkDeadlines={bulkDeadlines}
										/>
									</Col>
								))}
							</Row>

							{/* Load More Button */}
							{hasNextPage && (
								<div className="text-center mt-4 mb-4">
									<Button
										variant="primary"
										size="lg"
										onClick={loadMoreProducts}
										disabled={loadingMore}
										className="d-flex align-items-center mx-auto">
										{loadingMore ? (
											<>
												<Spinner
													as="span"
													animation="border"
													size="sm"
													role="status"
													className="me-2"
												/>
												Loading more products...
											</>
										) : (
											`Load More Products (${
												totalProducts - products.length
											} remaining)`
										)}
									</Button>
								</div>
							)}

							{/* End of products message */}
							{!hasNextPage && products.length > 0 && (
								<div className="text-center mt-4 mb-4">
									<div className="text-muted">
										<strong>End of products</strong> - All{" "}
										{products.length} products loaded
									</div>
								</div>
							)}
						</>
					)}
				</Col>
			</Row>
		</Container>
	);
});

export default ProductList;
