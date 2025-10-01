/**
 * ProductGrid Component
 * 
 * Handles product display logic with loading states, empty states, and pagination.
 * Replaces the complex product rendering logic from the original ProductList component.
 * Integrates with Redux for loading states and provides clean separation of concerns.
 */

import React, { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
    Box,
    Grid,
    Typography,
    Button,
    CircularProgress,
    Alert,
    Skeleton,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import MaterialProductCard from './ProductCard/MaterialProductCard';

// Memoized ProductGrid to prevent unnecessary re-renders
const ProductGrid = React.memo(({
    products = [],
    loading = false,
    error = null,
    pagination = {
        page: 1,
        page_size: 20,
        total_count: 0,
        has_next: false,
        has_previous: false
    },
    onLoadMore = null,
    onAddToCart = null,
    allEsspIds = [],
    bulkDeadlines = {},
    showProductCount = true,
    showLoadMoreButton = true,
    gridSpacing = 3,
    minCardWidth = 300,
    emptyStateMessage = "No products available based on selected filters."
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));
    
    // Redux state for additional loading information
    const isSearchLoading = useSelector(state => state.filters?.isLoading);
    const searchError = useSelector(state => state.filters?.error);

    /**
     * Determine if we're currently loading
     */
    const isLoading = useMemo(() => {
        return loading || isSearchLoading;
    }, [loading, isSearchLoading]);

    /**
     * Determine current error state
     */
    const currentError = useMemo(() => {
        return error || searchError;
    }, [error, searchError]);

    /**
     * Calculate pagination display text
     */
    const paginationText = useMemo(() => {
        if (!products.length && !isLoading) {
            return 'No items to display';
        }
        
        const start = (pagination.page - 1) * pagination.page_size + 1;
        const end = Math.min(start + products.length - 1, pagination.total_count);
        const total = pagination.total_count;
        
        return `Showing ${start}${products.length > 1 ? `-${end}` : ''} of ${total} items`;
    }, [products.length, pagination, isLoading]);

    /**
     * Generate unique key for product items - Stable reference
     */
    const generateProductKey = React.useCallback((item) => {
        // Use stable ID generation without random values
        return item.essp_id ||
               item.id ||
               item.product_id ||
               `bundle-${item.id}` ||
               `item-${item.product_name}-${item.subject_code}`;
    }, []);

    /**
     * Handle load more button click
     */
    const handleLoadMore = useCallback(() => {
        if (onLoadMore && pagination.has_next && !isLoading) {
            onLoadMore();
        }
    }, [onLoadMore, pagination.has_next, isLoading]);

    /**
     * Render loading skeleton
     */
    const renderLoadingSkeleton = useCallback(() => {
        const skeletonCount = isMobile ? 2 : isTablet ? 4 : 6;
        
        return (
            <Grid container spacing={gridSpacing}>
                {Array.from({ length: skeletonCount }).map((_, index) => (
                    <Grid
                        key={`skeleton-${index}`}
                        size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                    >
                        <Box sx={{ p: 2 }}>
                            <Skeleton variant="rectangular" height={200} />
                            <Skeleton variant="text" height={40} sx={{ mt: 1 }} />
                            <Skeleton variant="text" height={20} />
                            <Skeleton variant="rectangular" height={40} sx={{ mt: 2 }} />
                        </Box>
                    </Grid>
                ))}
            </Grid>
        );
    }, [isMobile, isTablet, gridSpacing]);

    /**
     * Format error message for display
     */
    const formatErrorMessage = useCallback((error) => {
        if (!error) {
            return 'Failed to load products. Please try again.';
        }
        
        if (typeof error === 'string') {
            return error;
        }
        
        if (typeof error === 'object') {
            return error.message || 
                   error.error || 
                   error.details || 
                   JSON.stringify(error);
        }
        
        return String(error);
    }, []);

    /**
     * Render error state
     */
    const renderErrorState = useCallback(() => (
        <Alert 
            severity="error" 
            sx={{ mt: 2, mb: 2 }}
            action={
                <Button 
                    color="inherit" 
                    size="small" 
                    onClick={() => window.location.reload()}
                >
                    Retry
                </Button>
            }
        >
            {formatErrorMessage(currentError)}
        </Alert>
    ), [currentError, formatErrorMessage]);

    /**
     * Render empty state
     */
    const renderEmptyState = useCallback(() => (
        <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
            {emptyStateMessage}
        </Alert>
    ), [emptyStateMessage]);

    /**
     * Render products grid - Optimized with stable references
     */
    const renderProductsGrid = useMemo(() => {
        // Only recalculate when products array reference changes
        // Don't include callbacks in dependencies as they should be stable
        return (
            <Grid container spacing={gridSpacing}>
                {products.map((item) => {
                    const key = generateProductKey(item);
                    return (
                        <Grid
                            key={key}
                            size={{ xs: 12, sm: 6, md: 3, lg: 4 }}
                            sx={{
                                display: 'flex',
                                justifyContent: 'center'
                            }}
                        >
                            <Box
                                sx={{
                                    width: '100%',
                                    maxWidth: { xs: '100%', sm: minCardWidth },
                                    display: 'flex',
                                    justifyContent: 'center'
                                }}
                            >
                                <MaterialProductCard
                                    product={item}
                                    onAddToCart={onAddToCart}
                                    allEsspIds={allEsspIds}
                                    bulkDeadlines={bulkDeadlines}
                                />
                            </Box>
                        </Grid>
                    );
                })}
            </Grid>
        );
    }, [products, gridSpacing, minCardWidth]); // Reduced dependencies for better performance

    /**
     * Render load more section
     */
    const renderLoadMoreSection = useCallback(() => {
        if (!showLoadMoreButton || !pagination.has_next) {
            return null;
        }

        const remainingCount = pagination.total_count - products.length;

        return (
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                mt: 4, 
                mb: 2 
            }}>
                <Button
                    variant="contained"
                    size="large"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
                    sx={{ 
                        minWidth: 200,
                        py: 1.5
                    }}
                >
                    {isLoading ? (
                        'Loading more products...'
                    ) : (
                        <>
                            Load More Products
                            {remainingCount > 0 && (
                                <span style={{ marginLeft: 8 }}>
                                    ({remainingCount} remaining)
                                </span>
                            )}
                        </>
                    )}
                </Button>
            </Box>
        );
    }, [showLoadMoreButton, pagination, products.length, handleLoadMore, isLoading]);

    /**
     * Render product count section
     */
    const renderProductCountSection = useCallback(() => {
        if (!showProductCount) return null;

        return (
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 3,
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 1, md: 0 }
            }}>
                <Typography variant="body2" color="text.secondary">
                    {paginationText}
                </Typography>
                
                {pagination.has_next && (
                    <Typography variant="body2" color="text.secondary">
                        {products.length} loaded, more available
                    </Typography>
                )}
            </Box>
        );
    }, [showProductCount, paginationText, pagination.has_next, products.length]);

    // Main render logic
    return (
        <Box sx={{ width: '100%' }}>
            {/* Error State */}
            {currentError && renderErrorState()}

            {/* Loading State */}
            {isLoading && products.length === 0 && renderLoadingSkeleton()}

            {/* Empty State */}
            {!isLoading && products.length === 0 && !currentError && renderEmptyState()}

            {/* Products Display */}
            {products.length > 0 && (
                <>
                    {/* Product Count */}
                    {renderProductCountSection()}

                    {/* Products Grid */}
                    {renderProductsGrid}

                    {/* Load More Section */}
                    {renderLoadMoreSection()}
                </>
            )}
        </Box>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Only re-render if critical props have changed
    return (
        prevProps.loading === nextProps.loading &&
        prevProps.error === nextProps.error &&
        prevProps.products === nextProps.products &&
        prevProps.pagination?.has_next === nextProps.pagination?.has_next &&
        prevProps.pagination?.total_count === nextProps.pagination?.total_count &&
        prevProps.allEsspIds === nextProps.allEsspIds &&
        prevProps.bulkDeadlines === nextProps.bulkDeadlines
    );
});

ProductGrid.displayName = 'ProductGrid';

export default ProductGrid;