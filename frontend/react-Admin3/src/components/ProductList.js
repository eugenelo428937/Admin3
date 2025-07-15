import config from "../config";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Typography } from "@mui/material";
import {
	Container,
	Row,
	Col,
	Alert,
	Button,
	Spinner,
} from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useVAT } from "../contexts/VATContext";
import productService from "../services/productService";
import searchService from "../services/searchService";
import useProductCardHelpers from "../hooks/useProductCardHelpers";
import "../styles/product_list.css";
import ProductCard from "./ProductCard";
import VATToggle from "./VATToggle";
import SearchBox from "./SearchBox";
import AdvancedFilterPanel from "./AdvancedFilterPanel";
import FilterDebugger from "./FilterDebugger";

const ProductList = React.memo(() => {
	const navigate = useNavigate();
	const location = useLocation();
	
	// Memoize URL parameters to prevent unnecessary re-renders
	const urlParams = useMemo(() => {
		console.log('📋 [ProductList] Parsing URL:', location.search);
		const queryParams = new URLSearchParams(location.search);
		
		const params = {
			subjectFilter: queryParams.get("subject_code") || queryParams.get("subject"),
			categoryFilter: queryParams.get("main_category") || queryParams.get("category"),
			groupFilter: queryParams.get("group"),
			productFilter: queryParams.get("product"),
			tutorialFormatFilter: queryParams.get("tutorial_format"),
			variationFilter: queryParams.get("variation"),
			distanceLearningFilter: queryParams.get("distance_learning"),
			tutorialFilter: queryParams.get("tutorial"),
			searchQuery: queryParams.get("q"),
			searchSubjects: queryParams.getAll("subjects"),
			searchGroups: queryParams.getAll("groups"),
			searchVariations: queryParams.getAll("variations"),
			searchProducts: queryParams.getAll("products")
		};
		
		// Detect search mode immediately
		const hasSearchParams = Boolean(params.searchQuery) || 
			params.searchSubjects.length > 0 || 
			params.searchGroups.length > 0 || 
			params.searchVariations.length > 0 || 
			params.searchProducts.length > 0;
		
		params.isSearchMode = hasSearchParams;
		
		console.log('📋 [ProductList] Parsed URL parameters:', params);
		console.log('📋 [ProductList] Search mode detected:', hasSearchParams);
		console.log('📋 [ProductList] URL search string:', location.search);
		console.log('📋 [ProductList] searchQuery value:', JSON.stringify(params.searchQuery));
		
		return params;
	}, [location.search]);
	
	// Extract memoized parameters
	const {
		subjectFilter, categoryFilter, groupFilter, productFilter,
		tutorialFormatFilter, variationFilter, distanceLearningFilter, tutorialFilter,
		searchQuery, searchSubjects, searchGroups, searchVariations, searchProducts,
		isSearchMode: detectedSearchMode
	} = urlParams;

	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState(null);
	const [navbarGroupFilter, setNavbarGroupFilter] = useState(null);
	const [navbarProductFilter, setNavbarProductFilter] = useState(null);
	
	// New navbar filter states
	const [navbarTutorialFormatFilter, setNavbarTutorialFormatFilter] = useState(null);
	const [navbarVariationFilter, setNavbarVariationFilter] = useState(null);
	const [navbarDistanceLearningFilter, setNavbarDistanceLearningFilter] = useState(null);
	const [navbarTutorialFilter, setNavbarTutorialFilter] = useState(null);

	// Use detected search mode directly (no state needed)
	const isSearchMode = detectedSearchMode;
	const [searchResults, setSearchResults] = useState(null);

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [hasNextPage, setHasNextPage] = useState(false);
	const [totalProducts, setTotalProducts] = useState(0);
	const PAGE_SIZE = config.pageSize;

	const { showVATInclusive } = useVAT();

	// Use the custom hook for product card functionality
	const { handleAddToCart, allEsspIds, bulkDeadlines } = useProductCardHelpers(products);

	// Filter panel state
	const [panelFilters, setPanelFilters] = useState({});

	// Handle filter panel changes with debouncing
	const handleFiltersChange = useCallback((filters) => {
		console.log('🔍 [ProductList] Filter panel changed:', filters);
		
		// Only update if filters actually changed
		setPanelFilters(prevFilters => {
			const filtersChanged = JSON.stringify(prevFilters) !== JSON.stringify(filters);
			if (filtersChanged) {
				console.log('🔍 [ProductList] Filters actually changed, updating state');
				return filters;
			}
			console.log('🔍 [ProductList] Filters unchanged, skipping update');
			return prevFilters;
		});
	}, []);



	// Handle navbar group filter
	useEffect(() => {
		if (groupFilter) {
			setNavbarGroupFilter(groupFilter);
		} else {
			setNavbarGroupFilter(null);
		}
	}, [groupFilter]);

	// Handle navbar product filter
	useEffect(() => {
		if (productFilter) {
			setNavbarProductFilter(productFilter);
			setNavbarGroupFilter(null);
		} else {
			setNavbarProductFilter(null);
		}
	}, [productFilter]);

	// Handle navbar tutorial format filter
	useEffect(() => {
		if (tutorialFormatFilter) {
			setNavbarTutorialFormatFilter(tutorialFormatFilter);
			setNavbarGroupFilter(null);
			setNavbarProductFilter(null);
		} else {
			setNavbarTutorialFormatFilter(null);
		}
	}, [tutorialFormatFilter]);

	// Handle navbar variation filter
	useEffect(() => {
		if (variationFilter) {
			setNavbarVariationFilter(variationFilter);
			setNavbarGroupFilter(null);
			setNavbarProductFilter(null);
		} else {
			setNavbarVariationFilter(null);
		}
	}, [variationFilter]);

	// Handle navbar distance learning filter
	useEffect(() => {
		if (distanceLearningFilter) {
			setNavbarDistanceLearningFilter(distanceLearningFilter);
			setNavbarGroupFilter(null);
			setNavbarProductFilter(null);
		} else {
			setNavbarDistanceLearningFilter(null);
		}
	}, [distanceLearningFilter]);

	// Handle navbar tutorial filter
	useEffect(() => {
		if (tutorialFilter) {
			setNavbarTutorialFilter(tutorialFilter);
			setNavbarGroupFilter(null);
			setNavbarProductFilter(null);
		} else {
			setNavbarTutorialFilter(null);
		}
	}, [tutorialFilter]);





	// Function to fetch products with pagination
	const fetchProducts = useCallback(
		async (page = 1, resetProducts = true) => {
			if (page === 1) {
				setLoading(true);
			} else {
				setLoadingMore(true);
			}
			setError(null);

			try {
				// Check if we're in search mode
				if (isSearchMode) {
					console.log('🔍 SEARCH MODE: Using search endpoint with params:', {
						searchQuery, searchSubjects, searchGroups, searchVariations, searchProducts
					});
					
					// Use search endpoint
					const searchParams = {
						page: page,
						page_size: PAGE_SIZE
					};

					if (searchQuery) searchParams.q = searchQuery;
					if (searchSubjects.length > 0) searchParams.subjects = searchSubjects;
					if (searchGroups.length > 0) searchParams.groups = searchGroups;
					if (searchVariations.length > 0) searchParams.variations = searchVariations;
					if (searchProducts.length > 0) searchParams.products = searchProducts;

					console.log('🔍 [ProductList] FINAL SEARCH PARAMS being sent to backend:', JSON.stringify(searchParams, null, 2));
					console.log('🔍 [ProductList] searchQuery value check:', {
						searchQuery,
						isEmpty: !searchQuery,
						typeOf: typeof searchQuery,
						length: searchQuery?.length
					});

					const response = await searchService.advancedSearch(searchParams);
					
					console.log('🔍 SEARCH RESPONSE:', {
						count: response.count,
						resultsLength: response.results?.length,
						sampleResult: response.results?.[0]
					});
					
					if (resetProducts) {
						console.log('🔍 [ProductList] Setting products to search results:', response.results?.length, 'products');
						setProducts(response.results);
						setCurrentPage(1);
					} else {
						setProducts(prev => [...prev, ...response.results]);
						setCurrentPage(page);
					}

					setTotalProducts(response.count);
					setHasNextPage(response.has_next);
					setSearchResults(response);
				} else {
					console.log('📋 REGULAR MODE: Using combined products and bundles endpoint');
					console.log('📋 [ProductList] Regular mode navbar filters:', {
						navbarGroupFilter,
						navbarProductFilter
					});
					
					// Use combined products and bundles endpoint
					const params = new URLSearchParams();
					
					// Add navbar filters if present
					if (navbarGroupFilter) {
						params.append("group", navbarGroupFilter);
					}
					if (navbarProductFilter) {
						params.append("product", navbarProductFilter);
					}
					if (navbarTutorialFormatFilter) {
						params.append("tutorial_format", navbarTutorialFormatFilter);
					}
					if (navbarVariationFilter) {
						params.append("variation", navbarVariationFilter);
					}
					if (navbarDistanceLearningFilter) {
						params.append("distance_learning", navbarDistanceLearningFilter);
					}
					if (navbarTutorialFilter) {
						params.append("tutorial", navbarTutorialFilter);
					}
					
					// Add URL-based filters from navbar/direct navigation
					if (subjectFilter) {
						params.append("subject", subjectFilter);
					}
					if (categoryFilter) {
						params.append("main_category", categoryFilter);
					}
					if (groupFilter) {
						params.append("group", groupFilter);
					}
					if (productFilter) {
						params.append("product", productFilter);
					}
					if (tutorialFormatFilter) {
						params.append("tutorial_format", tutorialFormatFilter);
					}
					if (variationFilter) {
						params.append("variation", variationFilter);
					}
					if (distanceLearningFilter) {
						params.append("distance_learning", distanceLearningFilter);
					}
					if (tutorialFilter) {
						params.append("tutorial", tutorialFilter);
					}
					
					// Add panel filters (these will be combined with URL filters)
					if (panelFilters.subject && panelFilters.subject.length > 0) {
						panelFilters.subject.forEach(id => params.append("subject", id));
					}
					if (panelFilters.main_category && panelFilters.main_category.length > 0) {
						panelFilters.main_category.forEach(id => params.append("main_category", id));
					}
					if (panelFilters.delivery_method && panelFilters.delivery_method.length > 0) {
						panelFilters.delivery_method.forEach(id => params.append("delivery_method", id));
					}
					if (panelFilters.tutorial_format && panelFilters.tutorial_format.length > 0) {
						panelFilters.tutorial_format.forEach(format => params.append("tutorial_format", format));
					}
					if (panelFilters.variation && panelFilters.variation.length > 0) {
						panelFilters.variation.forEach(id => params.append("variation", id));
					}

					console.debug(
						"Product filter params:",
						params.toString(),
						"Page:",
						page
					);
					
					console.log('🔍 [ProductList] Combined filter params:', {
						navbarFilters: {
							navbarGroupFilter,
							navbarProductFilter,
							navbarTutorialFormatFilter,
							navbarVariationFilter,
							navbarDistanceLearningFilter,
							navbarTutorialFilter
						},
						urlFilters: {
							subjectFilter,
							categoryFilter,
							groupFilter,
							productFilter,
							tutorialFormatFilter,
							variationFilter,
							distanceLearningFilter,
							tutorialFilter
						},
						panelFilters,
						finalParams: params.toString()
					});

					const data = await productService.getProductsAndBundles(
						params,
						page,
						PAGE_SIZE
					);

					// Handle combined response
					const newItems = data.results || [];

					console.log('📋 [ProductList] Combined API response:', {
						itemsCount: newItems.length,
						productsCount: data.products_count,
						bundlesCount: data.bundles_count,
						sampleItem: newItems[0]
					});

					if (resetProducts || page === 1) {
						console.log('📋 [ProductList] Setting items to combined results:', newItems.length, 'items');
						setProducts(newItems);
					} else {
						setProducts((prev) => [...prev, ...newItems]);
					}

					// Update pagination state
					setHasNextPage(data.has_next || false);
					setTotalProducts(data.count || newItems.length);
					setCurrentPage(page);
				}
			} catch (err) {
				setError(isSearchMode ? "Search failed. Please try again." : "Failed to load products");
				console.error("Error fetching products:", err);
			} finally {
				setLoading(false);
				setLoadingMore(false);
			}
		},
		[isSearchMode, searchQuery, searchSubjects, searchGroups, searchVariations, searchProducts,
		 navbarGroupFilter, navbarProductFilter, navbarTutorialFormatFilter, navbarVariationFilter, 
		 navbarDistanceLearningFilter, navbarTutorialFilter, panelFilters, 
		 subjectFilter, categoryFilter, groupFilter, productFilter, tutorialFormatFilter, 
		 variationFilter, distanceLearningFilter, tutorialFilter, PAGE_SIZE]
	);

	// Load more products function
	const loadMoreProducts = useCallback(() => {
		if (hasNextPage && !loadingMore) {
			fetchProducts(currentPage + 1, false);
		}
	}, [hasNextPage, loadingMore, currentPage]);

	// Reset and fetch products when navbar filters or search parameters change
	useEffect(() => {
		console.log('⚡ [ProductList] useEffect triggered to fetch products');
		console.log('⚡ [ProductList] Current state:', {
			isSearchMode,
			searchQuery,
			searchSubjects,
			searchGroups,
			searchVariations,
			searchProducts
		});
		
		setCurrentPage(1);
		fetchProducts(1, true);
	}, [navbarGroupFilter, navbarProductFilter, navbarTutorialFormatFilter, navbarVariationFilter, 
		navbarDistanceLearningFilter, navbarTutorialFilter, isSearchMode, searchQuery, 
		searchSubjects, searchGroups, searchVariations, searchProducts, panelFilters,
		subjectFilter, categoryFilter, groupFilter, productFilter, tutorialFormatFilter, 
		variationFilter, distanceLearningFilter, tutorialFilter]);

	if (loading) return <div>Loading products...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<Container
			fluid
			className="product-list-container px-sm-2 px-xs-1">			

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

			{/* Filter Debugger - Development Only */}
			<FilterDebugger
				urlFilters={{
					subjectFilter,
					categoryFilter,
					groupFilter,
					productFilter,
					tutorialFormatFilter,
					variationFilter,
					distanceLearningFilter,
					tutorialFilter
				}}
				panelFilters={panelFilters}
				navbarFilters={{
					navbarGroupFilter,
					navbarProductFilter,
					navbarTutorialFormatFilter,
					navbarVariationFilter,
					navbarDistanceLearningFilter,
					navbarTutorialFilter
				}}
				finalParams={JSON.stringify(Object.fromEntries(new URLSearchParams(location.search)))}
			/>

			{/* Main content area with filter panel */}
			<div className="d-flex gap-3">
				{/* Filter Panel - Only show in non-search mode */}
				{!isSearchMode && (
					<div className="filter-panel-container">
						<AdvancedFilterPanel
							onFiltersChange={handleFiltersChange}
							categoryFilter={categoryFilter}
							subjectFilter={subjectFilter}
							isSearchMode={isSearchMode}
							initialFilters={panelFilters}
						/>
					</div>
				)}

				{/* Main content area */}
				<div className="flex-grow-1 main-content-area">
					{(navbarGroupFilter || navbarProductFilter) && !isSearchMode && (
						<div className="mb-3">
							<Button
								variant="outline-secondary"
								size="sm"
								onClick={() => {
									navigate("/products");
								}}>
								Clear Filter
							</Button>
						</div>
					)}
					{/* Search Results Header */}
					{isSearchMode && (
						<div className="mb-4">
							<Alert
								variant="info"
								className="d-flex justify-content-between align-items-center">
								<div>
									<strong>Search Results</strong>
									{searchQuery && (
										<span className="ms-2">for "{searchQuery}"</span>
									)}
									{searchResults && (
										<span className="ms-2">
											({searchResults.count} products found)
										</span>
									)}
								</div>
								<Button
									variant="outline-secondary"
									size="sm"
									onClick={() => navigate("/products")}>
									Clear Search
								</Button>
							</Alert>
						</div>
					)}
					{/* Product Cards */}
					<div className="product-cards-container">
						{products.length === 0 && !loading ? (
							<Alert variant="info" className="mt-3">
								No products or bundles available based on selected filters.
							</Alert>
						) : (
							<>
								{/* Product count display */}
								<div className="d-flex justify-content-between align-items-center mb-3">
									<div className="text-muted">
										Showing {products.length} of {totalProducts} items
										{!isSearchMode && (
											<span className="ms-2">
												(products & bundles)
											</span>
										)}
									</div>
									{hasNextPage && (
										<small className="text-muted">
											{PAGE_SIZE * (currentPage - 1) + products.length}{" "}
											loaded, more available
										</small>
									)}
								</div>

								<Row xs={1} md={2} lg={3} xl={4} className="g-4">
									{products.map((item) => (
										<Col
											key={
												item.essp_id ||
												item.id ||
												item.product_id ||
												`bundle-${item.id}`
											}>
											<ProductCard
												product={item}
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
					</div>
				</div>
			</div>
		</Container>
	);
});

export default ProductList;
