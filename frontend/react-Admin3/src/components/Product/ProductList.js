/**
 * ProductList Component - Refactored
 * 
 * Orchestrates FilterPanel, ActiveFilters, ProductGrid and other components.
 * Uses Redux for state management and dramatically reduces complexity from 1000+ lines to ~150 lines.
 * Maintains all existing functionality while providing cleaner architecture.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Grid,
    Typography,
    Alert,
    Button,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { useCart } from '../../contexts/CartContext';
import useProductsSearch from '../../hooks/useProductsSearch';
import useProductCardHelpers from '../../hooks/useProductCardHelpers';
import { rulesEngineHelpers } from '../../utils/rulesEngineUtils';
import rulesEngineService from '../../services/rulesEngineService';

// Redux imports
import {
    selectFilters,
    selectSearchQuery,
    selectCurrentPage,
    selectIsLoading,
    selectError,
    setSearchQuery,
    setMultipleFilters,
    setSubjects,
    setCategories,
    setProductTypes,
    setProducts,
    setModesOfDelivery,
    setTutorialFormat,
    setDistanceLearning,
    setTutorial,
    resetFilters,
    setCurrentPage,
    clearError
} from '../../store/slices/filtersSlice';
import { parseUrlToFilters } from '../../store/middleware/urlSyncMiddleware';

// Component imports
import FilterPanel from './FilterPanel';
import ActiveFilters from './ActiveFilters';
import ProductGrid from './ProductGrid';
import SearchBox from '../SearchBox';
import FilterDebugger from './FilterDebugger';

// Styles
import "../../styles/product_list.css";

const ProductList = React.memo(() => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    // Context hooks
    const { addToCart, cartData } = useCart();
    
    // Redux state
    const filters = useSelector(selectFilters);
    const searchQuery = useSelector(selectSearchQuery);
    const currentPage = useSelector(selectCurrentPage);
    const isLoading = useSelector(selectIsLoading);
    const error = useSelector(selectError);
    
    // Custom hooks
    const {
        products,
        filterCounts,
        pagination,
        isLoading: searchLoading,
        error: searchError,
        search,
        refresh
    } = useProductsSearch({ autoSearch: true });
    
    const { handleAddToCart: helperAddToCart, allEsspIds, bulkDeadlines } = useProductCardHelpers(products);

    // Rules engine state for delivery messages
    const [rulesMessages, setRulesMessages] = useState([]);
    const [rulesLoading, setRulesLoading] = useState(false);

    /**
     * Restore filters from URL on component mount (Story 1.6)
     * Uses parseUrlToFilters() to convert URL params → Redux state
     */
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const filtersFromUrl = parseUrlToFilters(searchParams);

        // Dispatch each filter type to Redux
        if (filtersFromUrl.subjects && filtersFromUrl.subjects.length > 0) {
            dispatch(setSubjects(filtersFromUrl.subjects));
        }
        if (filtersFromUrl.categories && filtersFromUrl.categories.length > 0) {
            dispatch(setCategories(filtersFromUrl.categories));
        }
        if (filtersFromUrl.product_types && filtersFromUrl.product_types.length > 0) {
            dispatch(setProductTypes(filtersFromUrl.product_types));
        }
        if (filtersFromUrl.products && filtersFromUrl.products.length > 0) {
            dispatch(setProducts(filtersFromUrl.products));
        }
        if (filtersFromUrl.modes_of_delivery && filtersFromUrl.modes_of_delivery.length > 0) {
            dispatch(setModesOfDelivery(filtersFromUrl.modes_of_delivery));
        }
        if (filtersFromUrl.tutorial_format) {
            dispatch(setTutorialFormat(filtersFromUrl.tutorial_format));
        }
        if (filtersFromUrl.distance_learning) {
            dispatch(setDistanceLearning(filtersFromUrl.distance_learning));
        }
        if (filtersFromUrl.tutorial) {
            dispatch(setTutorial(filtersFromUrl.tutorial));
        }
        if (filtersFromUrl.searchQuery) {
            dispatch(setSearchQuery(filtersFromUrl.searchQuery));
        }
    }, []); // Run once on mount

    /**
     * Listen to browser back/forward navigation (Story 1.1 - Browser History)
     * When user clicks back/forward, update Redux state from URL
     */
    useEffect(() => {
        const handlePopState = () => {
            console.log('🔙 [POPSTATE] Browser back/forward detected');
            console.log('🔙 [POPSTATE] Current URL:', window.location.href);

            // Parse URL and update Redux state
            const searchParams = new URLSearchParams(window.location.search);
            const filtersFromUrl = parseUrlToFilters(searchParams);

            console.log('🔙 [POPSTATE] Filters from URL:', filtersFromUrl);

            // Clear existing filters first to ensure clean state
            dispatch(resetFilters());

            // Dispatch each filter type to Redux
            if (filtersFromUrl.subjects && filtersFromUrl.subjects.length > 0) {
                dispatch(setSubjects(filtersFromUrl.subjects));
            }
            if (filtersFromUrl.categories && filtersFromUrl.categories.length > 0) {
                dispatch(setCategories(filtersFromUrl.categories));
            }
            if (filtersFromUrl.product_types && filtersFromUrl.product_types.length > 0) {
                dispatch(setProductTypes(filtersFromUrl.product_types));
            }
            if (filtersFromUrl.products && filtersFromUrl.products.length > 0) {
                dispatch(setProducts(filtersFromUrl.products));
            }
            if (filtersFromUrl.modes_of_delivery && filtersFromUrl.modes_of_delivery.length > 0) {
                dispatch(setModesOfDelivery(filtersFromUrl.modes_of_delivery));
            }
            if (filtersFromUrl.tutorial_format) {
                dispatch(setTutorialFormat(filtersFromUrl.tutorial_format));
            }
            if (filtersFromUrl.distance_learning) {
                dispatch(setDistanceLearning(filtersFromUrl.distance_learning));
            }
            if (filtersFromUrl.tutorial) {
                dispatch(setTutorial(filtersFromUrl.tutorial));
            }
            if (filtersFromUrl.searchQuery) {
                dispatch(setSearchQuery(filtersFromUrl.searchQuery));
            }

            console.log('🔙 [POPSTATE] Redux state updated, products should reload now');
        };

        // Listen to popstate event (browser back/forward)
        window.addEventListener('popstate', handlePopState);
        console.log('🔙 [POPSTATE] Listener registered');

        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [dispatch]);

    /**
     * Determine if we're in search mode
     */
    const isSearchMode = useMemo(() => {
        return Boolean(searchQuery);
    }, [searchQuery]);

    /**
     * Handle search functionality
     */
    const handleSearch = React.useCallback((query) => {
        dispatch(setSearchQuery(query));
        dispatch(setCurrentPage(1)); // Reset to first page on search
        // URL sync middleware will automatically update the URL with search_query parameter
    }, [dispatch]);

    /**
     * Handle add to cart
     */
    const handleAddToCart = React.useCallback(async (product, selectedVariation = null) => {
        try {
            await addToCart(product, selectedVariation);
        } catch (error) {
            console.error('Failed to add product to cart:', error);
        }
    }, [addToCart]);

    /**
     * Handle load more products (pagination)
     */
    const handleLoadMore = React.useCallback(() => {
        if (pagination?.has_next && !isLoading && !searchLoading) {
            dispatch(setCurrentPage(currentPage + 1));
        }
    }, [pagination, isLoading, searchLoading, currentPage, dispatch]);

    /**
     * Clear search and return to products listing
     */
    const clearSearch = React.useCallback(() => {
        dispatch(setSearchQuery(''));
        dispatch(resetFilters());
        navigate('/products', { replace: true });
    }, [dispatch, navigate]);

    /**
     * Clear any errors on component mount
     */
    useEffect(() => {
        dispatch(clearError());
    }, [dispatch]);

    /**
     * Execute product_list_mount rules when component mounts
     */
    useEffect(() => {
        const executeRules = async () => {
            setRulesLoading(true);
            setRulesMessages([]); // Clear previous messages

            try {

                // Create context for product list
                const context = {
                    page: {
                        name: 'product_list',
                        path: '/products'
                    },
                    products: {
                        count: products?.length || 0
                    }
                };

                // Execute rules directly using the rulesEngineService
                const result = await rulesEngineService.executeRules(
                    rulesEngineService.ENTRY_POINTS.PRODUCT_LIST_MOUNT,
                    context
                );

                if (result.success && result.messages?.length > 0) {
                    // Process messages for display - filter out modal messages for inline display
                    const inlineMessages = result.messages
                        .filter(msg => msg.display_type !== 'modal')
                        .map(msg => ({
                            ...msg,
                            // Normalize message structure for consistent display
                            title: msg.title || msg.content?.title || 'Notice',
                            message: msg.content?.message || msg.content || 'No content',
                            variant: msg.message_type || msg.content?.variant || 'info',
                            dismissible: msg.content?.dismissible !== false
                        }));

                    setRulesMessages(inlineMessages);
                }

                // Handle any processing errors
                if (!result.success && result.error) {
                    console.error('🚨 Rules processing error:', result.error);
                    if (process.env.NODE_ENV === 'development') {
                        // Show error in development
                        setRulesMessages([{
                            title: 'Development Error',
                            message: `Rules engine error: ${result.error}`,
                            variant: 'error',
                            dismissible: true
                        }]);
                    }
                }
            } catch (err) {
                console.error('Error executing product_list_mount rules:', err);

                // Handle schema validation errors specifically
                if (err.name === 'SchemaValidationError') {
                    console.error('🚨 Schema validation failed for rules engine:', err.details);
                    console.error('🔍 Schema errors:', err.schemaErrors);
                    // For development, show schema validation errors to help debugging
                    if (process.env.NODE_ENV === 'development') {
                        setRulesMessages([{
                            title: 'Development Error',
                            message: `Schema validation failed - ${err.details}`,
                            variant: 'error',
                            dismissible: true
                        }]);
                    }
                }
                // Don't show other rule engine errors to user - shouldn't block product list
            } finally {
                setRulesLoading(false);
            }
        };

        executeRules();
    }, [products]); // Re-run when products change to update context

    return (
			<Container maxWidth="xl" sx={{ py: 2 }}>
				{/* Header Section */}
				<Grid container spacing={1}>
					<Grid size={{ xs: 12, lg: 2 }}>
						<Typography variant="h4" component="h1">
							{isSearchMode ? "Search Results" : "Products"}
						</Typography>
					</Grid>
					<Grid size={{ xs: 12, lg: 10 }}>
						{/* Active Filters */}
						<ActiveFilters showCount />
					</Grid>

					<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
						{isMobile && <FilterPanel showMobile />}
					</Box>
				</Grid>
				<Grid container spacing={3}>
					{/* Filter Panel - Desktop Sidebar */}
					{!isMobile && (
						<Grid size={{ xs: 12, lg: 2 }}>
							<FilterPanel isSearchMode={isSearchMode} />
						</Grid>
					)}

					{/* Main Content */}
					<Grid size={{ xs: 12, lg: 10 }}>
						<Box sx={{ mb: 0 }}>
							{/* Search Box */}
							{/* <SearchBox
								onSearch={handleSearch}
								initialValue={searchQuery}
								placeholder="Search products..."
							/> */}

							{/* Search Mode Alert */}
							{/* {isSearchMode && (
								<Alert
									severity="info"
									sx={{ mt: 2, mb: 2 }}
									action={
										<Button
											color="inherit"
											size="small"
											onClick={clearSearch}>
											Clear Search
										</Button>
									}>
									<strong>Search Results</strong>
									{searchQuery && (
										<span style={{ marginLeft: 8 }}>
											for "{searchQuery}"
										</span>
									)}
									{pagination?.total_count && (
										<span style={{ marginLeft: 8 }}>
											({pagination.total_count} products found)
										</span>
									)}
								</Alert>
							)} */}

							{/* Rules Engine Messages (Delivery Information, etc.) */}
							{rulesLoading && (
								<Alert severity="info" sx={{ mt: 2, mb: 2 }}>
									<i
										className="bi bi-hourglass-split"
										style={{ marginRight: 8 }}></i>
									Loading delivery information...
								</Alert>
							)}

							{!rulesLoading &&
								rulesMessages.map((message, index) => {
									const variant =
										message.variant === "warning"
											? "warning"
											: message.variant === "error"
											? "error"
											: message.variant === "info"
											? "info"
											: "info";

									return (
										<Alert
											key={`rules-message-${
												message.template_id || index
											}`}
											severity={variant}
											sx={{ mt: 2, mb: 2 }}
											data-testid="product-list-delivery-message">
											<strong>{message.title}</strong>
											<div
												style={{ marginTop: 4 }}
												dangerouslySetInnerHTML={{
													__html:
														message.message ||
														"No message content",
												}}
											/>
										</Alert>
									);
								})}

							{/* Debug Information (Development Only) */}
							{/* {process.env.NODE_ENV === 'development' && (
                            <FilterDebugger 
                                filters={filters}
                                searchQuery={searchQuery}
                                products={products}
                                isLoading={isLoading}
                            />
                        )} */}
						</Box>

						{/* Product Grid */}
						<ProductGrid
							products={products}
							loading={isLoading || searchLoading}
							error={error || searchError}
							pagination={pagination}
							onLoadMore={handleLoadMore}
							onAddToCart={handleAddToCart}
							allEsspIds={allEsspIds}
							bulkDeadlines={bulkDeadlines}
							vatCalculations={cartData?.vat_calculations}
							showProductCount
							showLoadMoreButton
							emptyStateMessage={
								isSearchMode
									? "No products found for your search criteria."
									: "No products available based on selected filters."
							}
						/>
					</Grid>
				</Grid>
			</Container>
		);
});

ProductList.displayName = 'ProductList';

export default ProductList;