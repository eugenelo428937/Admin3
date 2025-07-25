import config from "../../config";
import React, {
	useState,
	useEffect,
	useMemo,
	useCallback,
	useRef,
} from "react";
import { Typography } from "@mui/material";
import { Container, Row, Col, Alert, Button, Spinner } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";
import { useVAT } from "../../contexts/VATContext";
import productService from "../../services/productService";
import searchService from "../../services/searchService";
import useProductCardHelpers from "../../hooks/useProductCardHelpers";
import "../../styles/product_list.css";
import ProductCard from "./ProductCard/ProductCard";
import VATToggle from "../VATToggle";
import SearchBox from "../SearchBox";
import AdvancedFilterPanel from "./AdvancedFilterPanel";
import FilterDebugger from "./FilterDebugger";

const ProductList = React.memo(() => {
	const navigate = useNavigate();
	const location = useLocation();

	// Parse URL parameters (no memoization to ensure fresh parsing on each URL change)
	const queryParams = new URLSearchParams(location.search);
	const urlParams = {
		subjectFilter:
			queryParams.get("subject_code") || queryParams.get("subject"),
		categoryFilter:
			queryParams.get("main_category") || queryParams.get("category"),
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
		searchProducts: queryParams.getAll("products"),
	};

	// Detect search mode
	const hasSearchParams =
		Boolean(urlParams.searchQuery) ||
		urlParams.searchSubjects.length > 0 ||
		urlParams.searchGroups.length > 0 ||
		urlParams.searchVariations.length > 0 ||
		urlParams.searchProducts.length > 0;

	urlParams.isSearchMode = hasSearchParams;

	// Extract URL parameters
	const {
		subjectFilter,
		categoryFilter,
		groupFilter,
		productFilter,
		tutorialFormatFilter,
		variationFilter,
		distanceLearningFilter,
		tutorialFilter,
		searchQuery,
		searchSubjects,
		searchGroups,
		searchVariations,
		searchProducts,
		isSearchMode: detectedSearchMode,
	} = urlParams;

	// Debug: Only log when URL changes
	useEffect(() => {
		if (process.env.NODE_ENV === "development") {
			console.log("🔄 [ProductList] URL changed:", {
				url: location.search,
				subjectFilter,
				isSearchMode: detectedSearchMode,
			});
		}
	}, [location.search, subjectFilter, detectedSearchMode]);

	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState(null);
	const [navbarGroupFilter, setNavbarGroupFilter] = useState(null);
	const [navbarProductFilter, setNavbarProductFilter] = useState(null);

	// New navbar filter states
	const [navbarTutorialFormatFilter, setNavbarTutorialFormatFilter] =
		useState(null);
	const [navbarVariationFilter, setNavbarVariationFilter] = useState(null);
	const [navbarDistanceLearningFilter, setNavbarDistanceLearningFilter] =
		useState(null);
	const [navbarTutorialFilter, setNavbarTutorialFilter] = useState(null);

	// Use detected search mode directly (no state needed)
	const isSearchMode = detectedSearchMode;
	const [searchResults, setSearchResults] = useState(null);

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [hasNextPage, setHasNextPage] = useState(false);
	const [totalProducts, setTotalProducts] = useState(0);
	const PAGE_SIZE = config.pageSize || 20;

	// Debug logging for page size
	if (process.env.NODE_ENV === "development") {
		console.log("🔧 [ProductList] PAGE_SIZE configured as:", PAGE_SIZE);
		console.log("🔧 [ProductList] config.pageSize value:", config.pageSize);
	}

	const { showVATInclusive } = useVAT();

	// Use the custom hook for product card functionality
	const { handleAddToCart, allEsspIds, bulkDeadlines } =
		useProductCardHelpers(products);

	// Filter panel state
	const [panelFilters, setPanelFilters] = useState({});

	// Ref to prevent duplicate API calls
	const fetchingRef = useRef(false);
	const lastFetchParamsRef = useRef("");

	// FilterDebugger collapsed state
	const [filterDebugExpanded, setFilterDebugExpanded] = useState(false);

	// Handle filter panel changes
	const handleFiltersChange = useCallback((filters) => {
		setPanelFilters(filters);
	}, []);

	// Clear all filters function
	const handleClearAllFilters = useCallback(() => {
		if (process.env.NODE_ENV === "development") {
			console.log("🧹 [ProductList] Clearing all filters");
		}
		// Clear panel filters
		setPanelFilters({});
		// Navigate to clean products page
		navigate("/products", { replace: true });
	}, [navigate]);

	// Simplified filter synchronization - URL is the single source of truth
	useEffect(() => {
		// Update navbar states to match URL parameters
		setNavbarGroupFilter(groupFilter);
		setNavbarProductFilter(productFilter);
		setNavbarTutorialFormatFilter(tutorialFormatFilter);
		setNavbarVariationFilter(variationFilter);
		setNavbarDistanceLearningFilter(distanceLearningFilter);
		setNavbarTutorialFilter(tutorialFilter);
	}, [
		groupFilter,
		productFilter,
		tutorialFormatFilter,
		variationFilter,
		distanceLearningFilter,
		tutorialFilter,
	]);

	// Function to fetch products with pagination
	const fetchProducts = useCallback(
		async (page = 1, resetProducts = true) => {
			// Create a unique key for current parameters to prevent duplicate calls
			const paramsKey = JSON.stringify({
				page,
				resetProducts,
				subjectFilter,
				navbarGroupFilter,
				isSearchMode,
				searchQuery,
				panelFilters,
			});

			// Check if we're already fetching with the same parameters
			if (fetchingRef.current && lastFetchParamsRef.current === paramsKey) {
				if (process.env.NODE_ENV === "development") {
					console.log("🚫 [ProductList] Preventing duplicate API call");
				}
				return;
			}

			fetchingRef.current = true;
			lastFetchParamsRef.current = paramsKey;

			if (page === 1) {
				setLoading(true);
			} else {
				setLoadingMore(true);
			}
			setError(null);

			try {
				// Check if we're in search mode
				if (isSearchMode) {
					// Use search endpoint
					const searchParams = {
						page: page,
						page_size: PAGE_SIZE,
					};

					if (searchQuery) searchParams.q = searchQuery;
					if (searchSubjects.length > 0)
						searchParams.subjects = searchSubjects;
					if (searchGroups.length > 0) searchParams.groups = searchGroups;
					if (searchVariations.length > 0)
						searchParams.variations = searchVariations;
					if (searchProducts.length > 0)
						searchParams.products = searchProducts;

					const response = await searchService.advancedSearch(
						searchParams
					);

					if (resetProducts) {
						setProducts(response.results);
						setCurrentPage(1);
					} else {
						setProducts((prev) => [...prev, ...response.results]);
						setCurrentPage(page);
					}

					setTotalProducts(response.count);
					setHasNextPage(response.has_next);
					setSearchResults(response);
				} else {
					// Use combined products and bundles endpoint
					const params = new URLSearchParams();

					// Check if we need to include marking vouchers
					let shouldIncludeMarkingVouchers = false;

					// Check for Marking group (id: 2) or Marking Vouchers group (id: 8)
					if (
						navbarGroupFilter === "2" ||
						navbarGroupFilter === 2 ||
						navbarGroupFilter === "8" ||
						navbarGroupFilter === 8 ||
						groupFilter === "2" ||
						groupFilter === 2 ||
						groupFilter === "8" ||
						groupFilter === 8 ||
						panelFilters.group?.includes("2") ||
						panelFilters.group?.includes(2) ||
						panelFilters.group?.includes("8") ||
						panelFilters.group?.includes(8)
					) {
						shouldIncludeMarkingVouchers = true;
					}

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
						params.append(
							"distance_learning",
							navbarDistanceLearningFilter
						);
					}
					if (navbarTutorialFilter) {
						params.append("tutorial", navbarTutorialFilter);
					}

					// Add URL-based filters from navbar/direct navigation
					if (subjectFilter && subjectFilter.trim()) {
						params.append("subject", subjectFilter.trim());
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

					// Add panel filters dynamically based on filter configurations
					// Each filter uses its configuration name directly as the parameter
					Object.keys(panelFilters).forEach((filterName) => {
						if (
							panelFilters[filterName] &&
							panelFilters[filterName].length > 0
						) {
							panelFilters[filterName].forEach((id) =>
								params.append(filterName, id)
							);
						}
					});

					// Debug logging in development only
					if (
						process.env.NODE_ENV === "development" &&
						params.toString()
					) {
						console.log(
							"📊 [ProductList] API Filters:",
							params.toString()
						);
					}

					let data;
					let markingVouchers = [];

					// Fetch products and bundles
					data = await productService.getProductsAndBundles(
						params,
						page,
						PAGE_SIZE
					);

					// Fetch marking vouchers if needed
					if (shouldIncludeMarkingVouchers && page === 1) {
						try {
							markingVouchers =
								await productService.getMarkingVouchers();
							// Add voucher type indicator
							markingVouchers = markingVouchers.map((voucher) => ({
								...voucher,
								type: "MarkingVoucher",
								is_voucher: true,
							}));
						} catch (error) {
							console.error("Error fetching marking vouchers:", error);
						}
					}

					// Handle combined response
					let newItems = data.results || [];

					// Add marking vouchers to the beginning of the list if we have them
					if (markingVouchers.length > 0) {
						newItems = [...markingVouchers, ...newItems];
					}

					if (resetProducts || page === 1) {
						setProducts(newItems);
					} else {
						setProducts((prev) => [...prev, ...newItems]);
					}

					// Update pagination state
					setHasNextPage(data.has_next || false);
					// Add vouchers count to total if we included them
					const totalCount =
						(data.count || 0) + (markingVouchers.length || 0);
					setTotalProducts(totalCount);
					setCurrentPage(page);
				}
			} catch (err) {
				setError(
					isSearchMode
						? "Search failed. Please try again."
						: "Failed to load products"
				);
				console.error("Error fetching products:", err);
			} finally {
				setLoading(false);
				setLoadingMore(false);
				fetchingRef.current = false;
			}
		},
		[
			isSearchMode,
			searchQuery,
			searchSubjects,
			searchGroups,
			searchVariations,
			searchProducts,
			navbarGroupFilter,
			navbarProductFilter,
			navbarTutorialFormatFilter,
			navbarVariationFilter,
			navbarDistanceLearningFilter,
			navbarTutorialFilter,
			panelFilters,
			subjectFilter,
			categoryFilter,
			groupFilter,
			productFilter,
			tutorialFormatFilter,
			variationFilter,
			distanceLearningFilter,
			tutorialFilter,
			PAGE_SIZE,
		]
	);

	// Load more products function
	const loadMoreProducts = useCallback(() => {
		if (hasNextPage && !loadingMore) {
			fetchProducts(currentPage + 1, false);
		}
	}, [hasNextPage, loadingMore, currentPage]);

	// Reset and fetch products when filters change (URL is the source of truth)
	useEffect(() => {
		setCurrentPage(1);
		fetchProducts(1, true);
	}, [location.search, panelFilters]); // Only depend on URL and panel filters

	// Get active filters for display
	const getActiveFilters = useMemo(() => {
		const activeFilters = [];

		if (subjectFilter) {
			activeFilters.push({
				type: "subject",
				value: subjectFilter,
				label: `Subject: ${subjectFilter}`,
				icon: "graduation-cap",
				color: "default",
			});
		}

		if (navbarGroupFilter) {
			activeFilters.push({
				type: "group",
				value: navbarGroupFilter,
				label: `Group: ${navbarGroupFilter}`,
				icon: "tag",
				color: "default",
			});
		}

		if (categoryFilter) {
			activeFilters.push({
				type: "category",
				value: categoryFilter,
				label: `Category: ${categoryFilter}`,
				icon: "folder",
				color: "default",
			});
		}

		// Add panel filters
		Object.entries(panelFilters).forEach(([filterType, values]) => {
			if (values && values.length > 0) {
				values.forEach((value) => {
					activeFilters.push({
						type: filterType,
						value: value,
						label: `${filterType}: ${value}`,
						icon: "filter",
						color: "default",
					});
				});
			}
		});

		return activeFilters;
	}, [subjectFilter, navbarGroupFilter, categoryFilter, panelFilters]);

	if (loading) return <div>Loading products...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<div fluid className="product-list-container">
			<header className="product-header text-start d-flex flex-column flex-md-row justify-content-start justify-content-md-between align-items-start m-bottom__xl ">
				<div className="header-left">
					<Typography variant="h3" className="header-title p-bottom__2xs">
						Products
					</Typography>
				</div>

				<div className="header-controls">
					{/* VAT Toggle */}
					<VATToggle />
				</div>
			</header>

			{/* Filter Debugger - Development Only - Collapsible */}
			{process.env.NODE_ENV === "development" && (
				<div className="filter-debugger-container d-none">
					<button
						className="filter-debugger-toggle body__bold"
						onClick={() => setFilterDebugExpanded(!filterDebugExpanded)}>
						<i
							className={`lucide lucide-chevron-${
								filterDebugExpanded ? "up" : "down"
							}`}></i>
						<span className="color-light__onsurface_lkv">
							Filter Debug ({getActiveFilters.length} active)
						</span>
					</button>
					{filterDebugExpanded && (
						<FilterDebugger
							urlFilters={{
								subjectFilter,
								categoryFilter,
								groupFilter,
								productFilter,
								tutorialFormatFilter,
								variationFilter,
								distanceLearningFilter,
								tutorialFilter,
							}}
							panelFilters={panelFilters}
							navbarFilters={{
								navbarGroupFilter,
								navbarProductFilter,
								navbarTutorialFormatFilter,
								navbarVariationFilter,
								navbarDistanceLearningFilter,
								navbarTutorialFilter,
							}}
							finalParams={JSON.stringify(
								Object.fromEntries(new URLSearchParams(location.search))
							)}
						/>
					)}
				</div>
			)}

			{/* Main content area with filter panel */}
			<div className="d-flex gap-3 flex-column flex-lg-row align-items-start">
				{/* Filter Panel - Only show in non-search mode */}
				{!isSearchMode && (
					<aside className="filter-panel-container">
						<AdvancedFilterPanel
							onFiltersChange={handleFiltersChange}
							categoryFilter={categoryFilter}
							subjectFilter={subjectFilter}
							isSearchMode={isSearchMode}
							initialFilters={panelFilters}
						/>
					</aside>
				)}

				{/* Main content area */}
				<main className="flex-grow-1 main-content-area">
					{(navbarGroupFilter ||
						navbarProductFilter ||
						subjectFilter ||
						Object.keys(panelFilters).length > 0) &&
						!isSearchMode && (
							<div className="mb-3">
								<Button
									variant="outline-secondary"
									size="sm"
									onClick={handleClearAllFilters}>
									Clear All Filters
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
					{products.length === 0 && !loading ? (
						<Alert variant="info" className="empty-state">
							No products or bundles available based on selected filters.
						</Alert>
					) : (
						<>
							{/* Product count display */}
							<div className="products-meta d-flex justify-content-md-between flex-column flex-md-row text-start ">
								<Typography variant="body2" className="text-muted">	
									Showing {products.length} of {totalProducts} items		products-meta							
								</Typography>
								{hasNextPage && (
									<Typography variant="body2" className="text-muted">	
										{PAGE_SIZE * (currentPage - 1) + products.length}{" "}
										loaded, more available
									</Typography>
								)}
							</div>

							{/* Product Grid */}
							<div className="products-container  justify-content-center">
								{products.map((item) => (
									<div
										key={
											item.essp_id ||
											item.id ||
											item.product_id ||
											`bundle-${item.id}`
										}
										className="product-card-wrapper justify-content-center">
										<ProductCard
											product={item}
											onAddToCart={handleAddToCart}
											allEsspIds={allEsspIds}
											bulkDeadlines={bulkDeadlines}
										/>
									</div>
								))}
							</div>

							{/* Load More Button */}
							{hasNextPage && (
								<div className="load-more-section">
									<Button
										variant="primary"
										size="lg"
										onClick={loadMoreProducts}
										disabled={loadingMore}
										className="load-more-btn">
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
											<>
												<i className="lucide lucide-refresh-cw"></i>
												Load More Products (
												{totalProducts - products.length} remaining)
											</>
										)}
									</Button>
								</div>
							)}

							{/* End of products message */}
							{!hasNextPage && products.length > 0 && (
								<div className="end-of-products">
									<div className="text-muted">
										<strong>End of products</strong> - All{" "}
										{products.length} products loaded
									</div>
								</div>
							)}
						</>
					)}
				</main>
			</div>
		</div>
	);
});

export default ProductList;
