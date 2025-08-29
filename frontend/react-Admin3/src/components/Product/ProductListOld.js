import config from "../../config";
import React, {
	useState,
	useEffect,
	useMemo,
	useCallback,
	useRef,
} from "react";
import { Typography, Box, Chip } from "@mui/material";
import { Container, Row, Col, Alert, Button, Spinner } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";
import { useVAT } from "../../contexts/VATContext";
import productService from "../../services/productService";
import searchService from "../../services/searchService";
import subjectService from "../../services/subjectService";
import useProductCardHelpers from "../../hooks/useProductCardHelpers";
import { useProductListRules } from "../../hooks/useRulesEngine";
import "../../styles/product_list.css";
import ProductCardWithRules from "./ProductCard/ProductCardWithRules";
import VATToggle from "../VATToggle";
import SearchBox from "../SearchBox";
import AdvancedFilterPanel from "./AdvancedFilterPanel";
import FilterDebugger from "./FilterDebugger";

const ProductList = React.memo(() => {
	const navigate = useNavigate();
	const location = useLocation();

	// Parse URL parameters - memoized to prevent infinite loops
	const urlParams = useMemo(() => {
		const queryParams = new URLSearchParams(location.search);
		
		// Parse additional subject parameters
		const additionalSubjects = [];
		for (let i = 1; i <= 10; i++) {
			const additionalSubject = queryParams.get(`subject_${i}`);
			if (additionalSubject) {
				additionalSubjects.push(additionalSubject);
			}
		}
		
		const params = {
			subjectFilter:
				queryParams.get("subject_code") || queryParams.get("subject"),
			additionalSubjects: additionalSubjects,
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
			Boolean(params.searchQuery) ||
			params.searchSubjects.length > 0 ||
			params.searchGroups.length > 0 ||
			params.searchVariations.length > 0 ||
			params.searchProducts.length > 0;

		params.isSearchMode = hasSearchParams;
		
		return params;
	}, [location.search]); // Only recalculate when URL changes

	// Extract URL parameters
	const {
		subjectFilter,
		additionalSubjects,
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


	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState(null);

	// Use detected search mode directly (no state needed)
	const isSearchMode = detectedSearchMode;
	const [searchResults, setSearchResults] = useState(null);

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [hasNextPage, setHasNextPage] = useState(false);
	const [totalProducts, setTotalProducts] = useState(0);
	const PAGE_SIZE = config.pageSize || 20;


	const { showVATInclusive } = useVAT();

	// Rules Engine Integration - memoize context to prevent infinite loops
	const productListContext = useMemo(() => ({
		search_mode: isSearchMode,
		search_query: searchQuery,
		subject_filter: subjectFilter,
		category_filter: categoryFilter,
		total_products: totalProducts,
		current_page: currentPage
	}), [isSearchMode, searchQuery, subjectFilter, categoryFilter, totalProducts, currentPage]);
	
	const { 
		rulesResult: productListRulesResult, 
		loading: productListRulesLoading, 
		rulesCount: productListRulesCount 
	} = useProductListRules(productListContext);

	// Use the custom hook for product card functionality
	const { handleAddToCart, allEsspIds, bulkDeadlines } =
		useProductCardHelpers(products);

	// Lookup data for filter names
	const [subjects, setSubjects] = useState([]);
	const [filterConfig, setFilterConfig] = useState({});
	const [productDisplayNames, setProductDisplayNames] = useState({}); // Cache for display names in active filters

	// Filter panel state
	const [panelFilters, setPanelFilters] = useState({});

	// Initialize panel filters with additional subjects from URL
	useEffect(() => {
		// Only proceed if we have subjects loaded and additional subjects from URL
		if (subjects && subjects.length > 0 && additionalSubjects && additionalSubjects.length > 0) {
			console.log('🔧 Initializing panel filters with additional subjects:', additionalSubjects);
			
			// Convert subject codes/IDs to the format expected by the filter panel
			const subjectIds = [];
			
			additionalSubjects.forEach(subjectCodeOrId => {
				// Try to find subject by code first, then by ID
				let subject = subjects.find(s => s.code === subjectCodeOrId);
				if (!subject) {
					subject = subjects.find(s => s.id === parseInt(subjectCodeOrId));
				}
				
				if (subject) {
					subjectIds.push(subject.id);
					console.log(`🔧 Mapped ${subjectCodeOrId} to subject ID ${subject.id} (${subject.name})`);
				} else {
					console.warn(`🔧 Could not find subject for: ${subjectCodeOrId}`);
				}
			});
			
			if (subjectIds.length > 0) {
				setPanelFilters(prev => ({
					...prev,
					SUBJECT_FILTER: subjectIds
				}));
				console.log('🔧 Updated panel filters with subject IDs:', subjectIds);
			}
		}
	}, [additionalSubjects, subjects]); // Re-run when additionalSubjects or subjects change

	// Ref to prevent duplicate API calls
	const fetchingRef = useRef(false);
	const lastFetchParamsRef = useRef("");

	// FilterDebugger collapsed state
	const [filterDebugExpanded, setFilterDebugExpanded] = useState(false);

	// Load lookup data for filter names
	useEffect(() => {
		const loadLookupData = async () => {
			try {
				const [subjectsData, filterConfigData] = await Promise.all([
					subjectService.getAll(),
					productService.getFilterConfiguration()
				]);
				setSubjects(subjectsData);
				setFilterConfig(filterConfigData);
			} catch (error) {
				console.error('Error loading lookup data:', error);
			}
		};
		
		loadLookupData();
	}, []);

	// Extract product name from loaded products when they're available
	useEffect(() => {
		if (productFilter && products.length > 0 && !productDisplayNames[productFilter]) {
			console.log(`Looking for product name for ID ${productFilter} in ${products.length} products`);
			
			// Navigation product IDs are different from API product IDs
			// Let's map known navigation IDs to their display names
			const navigationProductNames = {
				'75': 'Core Reading',
				'76': 'Course Notes',
				'77': 'Mock Exam Marking',
				'78': 'Revision Questions',
				'79': 'Tutorials',
				// Add more mappings as needed
			};
			
			// First, check if we have a predefined mapping for this navigation ID
			if (navigationProductNames[productFilter]) {
				const productName = navigationProductNames[productFilter];
				console.log(`Using predefined mapping for product ${productFilter}: ${productName}`);
				setProductDisplayNames(prev => ({
					...prev,
					[productFilter]: productName
				}));
				return;
			}
			
			// Fallback: try to find by exact ID match in the actual products
			let matchingProduct = products.find(p => p.id === parseInt(productFilter));
			console.log('Found matching product by ID:', matchingProduct);
			
			// If not found by ID, try to extract from product results
			if (!matchingProduct && products.length > 0) {
				// Check if we have a consistent product name in the results
				const uniqueProductNames = [...new Set(products.map(p => p.name || p.title || p.product_name).filter(Boolean))];
				console.log('Available unique product names:', uniqueProductNames);
				
				// If there's only one unique product name, use it
				if (uniqueProductNames.length === 1) {
					const productName = uniqueProductNames[0];
					console.log('Using single product name from results:', productName);
					setProductDisplayNames(prev => ({
						...prev,
						[productFilter]: productName
					}));
					return;
				}
				
				// If multiple product names, try to find one that looks like an individual product
				// Look for names that aren't bundles (don't contain "Bundle" or "Pack")
				const individualProducts = uniqueProductNames.filter(name => 
					!name.includes('Bundle') && !name.includes('Pack') && !name.includes('&')
				);
				console.log('Individual product names (filtered out bundles):', individualProducts);
				
				if (individualProducts.length === 1) {
					const productName = individualProducts[0];
					console.log('Using individual product name:', productName);
					setProductDisplayNames(prev => ({
						...prev,
						[productFilter]: productName
					}));
					return;
				}
			}
			
			if (matchingProduct) {
				const extractedName = matchingProduct.name || matchingProduct.title || matchingProduct.product_name;
				console.log('Extracted product name:', extractedName);
				if (extractedName) {
					setProductDisplayNames(prev => ({
						...prev,
						[productFilter]: extractedName
					}));
				}
			} else {
				console.log('No matching product found. Available product IDs:', products.map(p => p.id));
				console.log('Sample product structure:', products[0]);
				console.log(`No display name found for product ${productFilter}, using fallback`);
				// Fallback to show the product ID if we can't determine the name
				setProductDisplayNames(prev => ({
					...prev,
					[productFilter]: `Product ${productFilter}`
				}));
			}
		}
	}, [productFilter, products, productDisplayNames]);

	// Clear product display name cache when navigating between non-subject links
	useEffect(() => {
		// Only clear cache when non-subject filters change (preserve subject cache)
		console.log('Navigation filters changed:', {
			categoryFilter, 
			groupFilter, 
			productFilter, 
			tutorialFormatFilter, 
			variationFilter, 
			distanceLearningFilter, 
			tutorialFilter
		});
		console.log('Current productDisplayNames cache:', productDisplayNames);
		console.log('Navigation detected - clearing product display cache (preserving subjects)');
		
		setProductDisplayNames(prev => {
			const newCache = {};
			// Keep only subject-related cached names
			Object.keys(prev).forEach(key => {
				// If this cached entry corresponds to a subject ID, preserve it
				// Only check subjects if they're properly loaded to avoid initialization errors
				const isSubjectCache = subjects && subjects.length > 0 && subjects.some(s => s.id === parseInt(key) || s.code === key);
				if (isSubjectCache) {
					newCache[key] = prev[key];
					console.log(`Preserving subject cache for key: ${key}`);
				} else {
					console.log(`Clearing cache for key: ${key}`);
				}
			});
			console.log('New cache after clearing:', newCache);
			return newCache;
		});
	}, [categoryFilter, groupFilter, productFilter, tutorialFormatFilter, variationFilter, distanceLearningFilter, tutorialFilter]); // Removed subjects dependency

	// Handle filter panel changes - now only receives panel-only filters
	const handleFiltersChange = useCallback((filters) => {
		setPanelFilters(filters);
		
		// For subject filters, also update URL to maintain persistence across navigation
		if (filters.SUBJECT_FILTER && filters.SUBJECT_FILTER.length > 0 && subjects && subjects.length > 0) {
			const currentParams = new URLSearchParams(location.search);
			
			// Convert subject IDs to codes for URL
			const subjectCodes = filters.SUBJECT_FILTER.map(subjectId => {
				const subject = subjects.find(s => s.id === subjectId);
				return subject ? subject.code : subjectId;
			});
			
			// Add additional subject codes to URL (preserve existing URL subject)
			// Only add subjects that aren't already in the URL
			const existingUrlSubject = currentParams.get('subject_code') || currentParams.get('subject');
			const newSubjects = subjectCodes.filter(code => code !== existingUrlSubject);
			
			if (newSubjects.length > 0) {
				// Add the additional subjects as comma-separated values or multiple params
				// For simplicity, let's add them one by one with different param names
				newSubjects.forEach((code, index) => {
					currentParams.set(`subject_${index + 1}`, code);
				});
				
				console.log('Adding additional subjects to URL:', newSubjects);
				navigate(`/products?${currentParams.toString()}`, { replace: true });
			}
		} else if (!filters.SUBJECT_FILTER || filters.SUBJECT_FILTER.length === 0) {
			// Clear additional subject parameters when no panel subjects are selected
			const currentParams = new URLSearchParams(location.search);
			let hasChanges = false;
			
			// Remove any additional subject parameters
			for (let i = 1; i <= 10; i++) { // Check up to 10 additional subjects
				if (currentParams.has(`subject_${i}`)) {
					currentParams.delete(`subject_${i}`);
					hasChanges = true;
				}
			}
			
			if (hasChanges) {
				console.log('Removing additional subjects from URL');
				navigate(`/products?${currentParams.toString()}`, { replace: true });
			}
		}
	}, [navigate, location.search, subjects]);

	// Helper function to get display name for filter values
	const getFilterDisplayName = useCallback((filterType, value) => {
		// Handle subjects - only if subjects are loaded
		if (filterType === 'subject' && subjects && subjects.length > 0) {
			const subject = subjects.find(s => s.code === value || s.id === parseInt(value));
			return subject ? `${subject.code} - ${subject.description}` : value;
		}
		
		// Handle filter config options (includes products, groups, etc.)
		if (filterConfig[filterType]?.options) {
			const option = filterConfig[filterType].options.find(opt => 
				opt.id === value || opt.id === parseInt(value) || opt.code === value
			);
			return option ? (option.label || option.name) : value;
		}
		
		// For other URL-based filters, try to get a better display name using the correct config keys
		const urlToConfigKeyMap = {
			'subject': 'SUBJECT_FILTER',
			'group': 'PRODUCT_CATEGORY',
			'product': 'PRODUCT_TYPE',
			'tutorial_format': 'tutorial_format',
			'variation': 'variation',
			'distance_learning': 'DELIVERY_MODE',
			'tutorial': 'tutorial'
		};
		
		const configKey = urlToConfigKeyMap[filterType] || filterType;
		const filterOptions = filterConfig[configKey]?.options || [];
		const option = filterOptions.find(opt => 
			opt.id === value || opt.id === parseInt(value)
		);
		
		if (option) {
			return option.label || option.name;
		}
		
		// Fallback display names if option not found
		switch (filterType) {
			case 'group':
				return value; // Remove "Group" prefix, just show the name
			case 'category':
				return `Category ${value}`;
			case 'product':
				return productDisplayNames[value] || `Product ${value}`;
			case 'tutorial_format':
				return `Tutorial Format ${value}`;
			case 'variation':
				return `Variation ${value}`;
			case 'distance_learning':
				return 'Distance Learning';
			case 'tutorial':
				return 'Tutorial';
			default:
				return `${filterType}: ${value}`;
		}
	}, [subjects, filterConfig, productDisplayNames]);

	// Clear all filters function
	const handleClearAllFilters = useCallback(() => {
		// Clear panel filters
		setPanelFilters({});
		// Navigate to clean products page
		navigate("/products", { replace: true });
	}, [navigate]);

	// Function to fetch products with pagination
	const fetchProducts = useCallback(
		async (page = 1, resetProducts = true) => {
			// Create a unique key for current parameters to prevent duplicate calls
			const paramsKey = JSON.stringify({
				page,
				resetProducts,
				subjectFilter,
				groupFilter,
				isSearchMode,
				searchQuery,
				panelFilters,
			});

			// Check if we're already fetching with the same parameters
			if (fetchingRef.current && lastFetchParamsRef.current === paramsKey) {
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

					// Add URL-based filters from navbar/direct navigation
					if (subjectFilter && subjectFilter.trim()) {
						params.append("subject", subjectFilter.trim());
					}
					
					// Add additional subjects from panel filters
					if (additionalSubjects && additionalSubjects.length > 0) {
						additionalSubjects.forEach(subject => {
							if (subject.trim()) {
								params.append("subject", subject.trim());
							}
						});
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
			panelFilters,
			subjectFilter,
			additionalSubjects,
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

	// Helper function to check if two values represent the same filter (handles subject code-to-ID conversion)
	const isSameFilterValue = useCallback((filterType, value1, value2) => {
		// Direct comparison
		if (value1 === value2 || value1 === value2.toString() || value2 === value1.toString()) {
			return true;
		}
		
		// For subjects, compare codes to IDs - only if subjects are loaded
		if (filterType === 'subject' && subjects && subjects.length > 0) {
			const subject = subjects.find(s => s.code === value1 || s.id === parseInt(value1));
			if (subject) {
				return subject.code === value2 || subject.id === parseInt(value2);
			}
		}
		
		return false;
	}, [subjects]);

	// Get active filters for display - unified approach using URL parameters and panel filters
	const getActiveFilters = useMemo(() => {
		const activeFilters = [];

		// Create a map of URL filters for easier processing
		const urlFilterMap = {
			subject: subjectFilter,
			group: groupFilter,
			product: productFilter,
			tutorial_format: tutorialFormatFilter,
			variation: variationFilter,
			distance_learning: distanceLearningFilter,
			tutorial: tutorialFilter,
			category: categoryFilter
		};

		// Add URL-based filters
		Object.entries(urlFilterMap).forEach(([filterType, filterValue]) => {
			if (filterValue) {
				const iconMap = {
					subject: "graduation-cap",
					group: "tag",
					product: "package",
					tutorial_format: "school",
					variation: "tune",
					distance_learning: "computer",
					tutorial: "class",
					category: "folder"
				};

				activeFilters.push({
					type: filterType,
					value: filterValue,
					label: getFilterDisplayName(filterType, filterValue),
					icon: iconMap[filterType] || "filter",
					color: "default",
				});
			}
		});

		// Add panel filters (avoid duplicates by checking if URL filter already exists)
		Object.entries(panelFilters).forEach(([filterType, values]) => {
			if (values && values.length > 0) {
				values.forEach((value) => {
					// Check for duplicates - don't add panel filter if URL filter already exists for same type/value
					const urlFilterExists = activeFilters.some(filter => 
						filter.type === filterType && isSameFilterValue(filterType, filter.value, value)
					);
					
					if (!urlFilterExists) {
						activeFilters.push({
							type: filterType,
							value: value,
							label: getFilterDisplayName(filterType, value),
							icon: "filter",
							color: "default",
						});
					}
				});
			}
		});

		return activeFilters;
	}, [
		subjectFilter, 
		groupFilter, 
		productFilter, 
		tutorialFormatFilter, 
		variationFilter, 
		distanceLearningFilter, 
		tutorialFilter, 
		categoryFilter, 
		panelFilters,
		getFilterDisplayName,
		isSameFilterValue
	]);

	if (loading) return <div>Loading products...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<Container fluid className="product-list-container m-top__lg">
			<header className="product-header text-start d-flex flex-column flex-md-row justify-content-start justify-content-md-between align-items-start m-bottom__md ">
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
							
							finalParams={JSON.stringify(
								Object.fromEntries(new URLSearchParams(location.search))
							)}
						/>
					)}
				</div>
			)}

			{/* Main content area with filter panel */}
			<div className="d-flex gap-3 flex-column flex-lg-row align-items-start">
				<Box className="d-flex flex-column">
					{(groupFilter ||
						productFilter ||
						subjectFilter ||
						Object.keys(panelFilters).length > 0) &&
						!isSearchMode && (
							<div className="mb-3 text-start">
								<Button
									variant="outline-secondary"
									size="sm"
									onClick={handleClearAllFilters}>
									Clear All Filters
								</Button>
							</div>
						)}
					{/* Filter Panel - Only show in non-search mode */}
					{!isSearchMode && (
						<aside className="filter-panel-container">
							<AdvancedFilterPanel
								onFiltersChange={handleFiltersChange}
								categoryFilter={categoryFilter}
								isSearchMode={isSearchMode}
								initialFilters={panelFilters}
								urlFilters={{
									subject: subjectFilter,
									group: groupFilter,
									product: productFilter,
									tutorial_format: tutorialFormatFilter,
									variation: variationFilter,
									distance_learning: distanceLearningFilter,
									tutorial: tutorialFilter,
								}}
								subjects={subjects}
								filterConfig={filterConfig}
							/>
						</aside>
					)}
				</Box>
				{/* Main content area */}
				<main className="flex-grow-1 main-content-area">
					{/* Active Filters Display */}
					{getActiveFilters.length > 0 && !isSearchMode && (
						<div className="mb-4">
							<div className="d-flex align-items-center mb-2">
								<Typography
									variant="subtitle2"
									color="text.secondary"
									className="me-2">
									Active Filters ({getActiveFilters.length})
								</Typography>
								<Button
									variant="outline-secondary"
									size="sm"
									onClick={handleClearAllFilters}>
									Clear All
								</Button>
							</div>
							<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
								{getActiveFilters.map((filter, index) => (
									<Chip
										key={`${filter.type}-${filter.value}-${index}`}
										label={filter.label}
										size="small"
										color="primary"
										variant="outlined"
										onDelete={() => {
											// Handle filter removal based on filter type
											if (
												filter.type === "subject" ||
												filter.type === "category" ||
												filter.type === "group" ||
												filter.type === "product" ||
												filter.type === "tutorial_format" ||
												filter.type === "variation" ||
												filter.type === "distance_learning" ||
												filter.type === "tutorial"
											) {
												// For URL-based filters, navigate to clean URL
												const newParams = new URLSearchParams(
													location.search
												);
												const paramMap = {
													subject: "subject_code",
													category: "main_category",
													group: "group",
													product: "product",
													tutorial_format: "tutorial_format",
													variation: "variation",
													distance_learning: "distance_learning",
													tutorial: "tutorial",
												};
												const paramName =
													paramMap[filter.type] || filter.type;
												newParams.delete(paramName);
												newParams.delete(filter.type);
												navigate(
													`/products?${newParams.toString()}`,
													{ replace: true }
												);
											} else {
												// For panel filters, update panelFilters state
												setPanelFilters((prev) => {
													const newFilters = { ...prev };
													if (newFilters[filter.type]) {
														newFilters[filter.type] = newFilters[
															filter.type
														].filter((v) => v !== filter.value);
														if (
															newFilters[filter.type].length ===
															0
														) {
															delete newFilters[filter.type];
														}
													}
													return newFilters;
												});
											}
										}}
									/>
								))}
							</Box>
						</div>
					)}
					{/* Rules Engine Debug Panel */}
					<div
						style={{
							padding: "10px",
							backgroundColor: "#f8f9fa",
							border: "1px solid #dee2e6",
							borderRadius: "4px",
							fontSize: "12px",
							color: "#495057",
							marginBottom: "10px",
						}}>
						<strong>🔧 Rules Engine Debug:</strong> Entry Point:
						product_list_mount | Rules Fetched:{" "}
						{productListRulesCount || 0} | Loading:{" "}
						{productListRulesLoading ? "Yes" : "No"} | Search Mode:{" "}
						{isSearchMode ? "Yes" : "No"} | Total Products:{" "}
						{totalProducts}
					</div>
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
									Showing {products.length} of {totalProducts} items
									products-meta
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
										<ProductCardWithRules
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
		</Container>
	);
});

export default ProductList;
