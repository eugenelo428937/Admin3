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
    resetFilters,
    setCurrentPage,
    clearError
} from '../../store/slices/filtersSlice';

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
    const { addToCart } = useCart();
    
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
     * Parse URL parameters on component mount and location changes
     */
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
        
        return {
            subjectFilter: queryParams.get("subject_code") || queryParams.get("subject"),
            additionalSubjects,
            categoryFilter: queryParams.get("main_category") || queryParams.get("category"),
            groupFilter: queryParams.get("group"),
            productFilter: queryParams.get("product"),
            variationFilter: queryParams.get("variation"),
            tutorialFormatFilter: queryParams.get("tutorial_format"),
            modeOfDeliveryFilter: queryParams.get("mode_of_delivery"),
            searchQuery: queryParams.get("q") || queryParams.get("search"),
        };
    }, [location.search]);

    /**
     * Determine if we're in search mode
     */
    const isSearchMode = useMemo(() => {
        return Boolean(urlParams.searchQuery || searchQuery);
    }, [urlParams.searchQuery, searchQuery]);

    /**
     * Apply URL parameters to Redux store on mount/location change
     */
    useEffect(() => {
        const filtersFromUrl = {};
        
        // Map URL parameters to Redux filters
        if (urlParams.subjectFilter) {
            filtersFromUrl.subjects = [urlParams.subjectFilter];
        }
        
        if (urlParams.additionalSubjects.length > 0) {
            filtersFromUrl.subjects = [
                ...(filtersFromUrl.subjects || []),
                ...urlParams.additionalSubjects
            ];
        }
        
        if (urlParams.categoryFilter) {
            filtersFromUrl.categories = [urlParams.categoryFilter];
        }
        
        if (urlParams.productFilter) {
            filtersFromUrl.products = [urlParams.productFilter];
        }
        
        if (urlParams.variationFilter) {
            filtersFromUrl.modes_of_delivery = [urlParams.variationFilter];
        }
        
        // Handle mode_of_delivery parameter from navbar clicks
        if (urlParams.modeOfDeliveryFilter) {
            filtersFromUrl.modes_of_delivery = [urlParams.modeOfDeliveryFilter];
        }
        
        // Handle tutorial_format parameter from navbar clicks
        // Note: tutorialFormatFilter is handled via URL parameter, not Redux state
        // This is intentionally separate from the Redux filters system
        
        // Apply filters if we have any
        if (Object.keys(filtersFromUrl).length > 0) {
            dispatch(setMultipleFilters(filtersFromUrl));
        }
        
        // Set search query if present
        if (urlParams.searchQuery && urlParams.searchQuery !== searchQuery) {
            dispatch(setSearchQuery(urlParams.searchQuery));
        }
    }, [dispatch, urlParams, searchQuery]);

    /**
     * Handle search functionality
     */
    const handleSearch = React.useCallback((query) => {
        dispatch(setSearchQuery(query));
        dispatch(setCurrentPage(1)); // Reset to first page on search
        
        // Update URL with search parameter
        const newParams = new URLSearchParams(location.search);
        if (query) {
            newParams.set('q', query);
        } else {
            newParams.delete('q');
        }
        navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
    }, [dispatch, navigate, location]);

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
                console.log('🔍 [ProductList] Executing product_list_mount rules...');

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

                console.log('📋 [ProductList] Rules engine result:', result);

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
				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						mb: 2,
						flexDirection: { xs: "column", sm: "row" },
						gap: 2,
					}}>
					<Typography variant="h4" component="h1">
						{isSearchMode ? "Search Results" : "Products"}
					</Typography>

					<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
						{isVATVisible && <VATToggle />}
						{isMobile && <FilterPanel showMobile />}
					</Box>
				</Box>
				<Grid container spacing={3}>
					{/* Filter Panel - Desktop Sidebar */}
					{!isMobile && (
						<Grid size={{ xs: 12, lg: 2 }}>
							<FilterPanel isSearchMode={isSearchMode} />
						</Grid>
					)}

					{/* Main Content */}
					<Grid size={{ xs: 12, lg: 10}}>
						<Box sx={{ mb: 3 }}>
							{/* Search Box */}
							<SearchBox
								onSearch={handleSearch}
								initialValue={searchQuery}
								placeholder="Search products..."
							/>

							{/* Search Mode Alert */}
							{isSearchMode && (
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
							)}

							{/* Active Filters */}
							<ActiveFilters showCount />

							{/* Rules Engine Messages (Delivery Information, etc.) */}
							{rulesLoading && (
								<Alert severity="info" sx={{ mt: 2, mb: 2 }}>
									<i className="bi bi-hourglass-split" style={{ marginRight: 8 }}></i>
									Loading delivery information...
								</Alert>
							)}

							{!rulesLoading && rulesMessages.map((message, index) => {
								const variant = message.variant === 'warning' ? 'warning' :
											message.variant === 'error' ? 'error' :
											message.variant === 'info' ? 'info' : 'info';

								return (
									<Alert
										key={`rules-message-${message.template_id || index}`}
										severity={variant}
										sx={{ mt: 2, mb: 2 }}
										data-testid="product-list-delivery-message"
									>
										<strong>{message.title}</strong>
										<div
											style={{ marginTop: 4 }}
											dangerouslySetInnerHTML={{
												__html: message.message || 'No message content'
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