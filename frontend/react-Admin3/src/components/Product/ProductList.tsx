/**
 * ProductList Component - Refactored with MVVM
 *
 * Orchestrates FilterPanel, ActiveFilters, ProductGrid and other components.
 * Uses Redux for state management and dramatically reduces complexity from 1000+ lines to ~150 lines.
 * Maintains all existing functionality while providing cleaner architecture.
 */

import React from 'react';
import {
    Box,
    Container,
    Grid,
    Typography,
} from '@mui/material';

// Component imports
import FilterPanel from './FilterPanel';
import ActiveFilters from './ActiveFilters';
import ProductGrid from './ProductGrid';
import SearchBox from '../SearchBox.js';
import FilterDebugger from './FilterDebugger';
import RulesEngineInlineAlert from '../Common/RulesEngineInlineAlert';

// ViewModel
import useProductListVM from './useProductListVM';

const ProductList = React.memo(() => {
    const vm = useProductListVM();

    return (
        <Container maxWidth="xl" sx={{ py: 2 }}>
            {/* Header Section */}
            <Grid container spacing={1}>
                <Grid size={{ xs: 12, lg: 2 }}>
                    <Typography variant="h4" component="h1">
                        {vm.isSearchMode ? "Search Results" : "Products"}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, lg: 10 }}>
                    {/* Active Filters */}
                    <ActiveFilters showCount />
                </Grid>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {vm.isMobile && <FilterPanel showMobile />}
                </Box>
            </Grid>
            <Grid container spacing={2}>
                {/* Filter Panel - Desktop Sidebar */}
                {!vm.isMobile && (
                    <Grid size={{ xs: 12, md: 3 }}>
                        <FilterPanel key="desktop-filter-panel" isSearchMode={vm.isSearchMode} />
                    </Grid>
                )}

                {/* Main Content */}
                <Grid size={{ xs: 12, md: 9 }}>
                    <Box sx={{ mb: 0 }}>
                        {/* Search Box */}
                        {/* <SearchBox
                            onSearch={vm.handleSearch}
                            initialValue={vm.searchQuery}
                            placeholder="Search products..."
                        /> */}

                        {/* Search Mode Alert */}
                        {/* {vm.isSearchMode && (
                            <Alert
                                severity="info"
                                sx={{ mt: 2, mb: 2 }}
                                action={
                                    <Button
                                        color="inherit"
                                        size="small"
                                        onClick={vm.clearSearch}>
                                        Clear Search
                                    </Button>
                                }>
                                <strong>Search Results</strong>
                                {vm.searchQuery && (
                                    <span style={{ marginLeft: 8 }}>
                                        for "{vm.searchQuery}"
                                    </span>
                                )}
                                {vm.pagination?.total_count && (
                                    <span style={{ marginLeft: 8 }}>
                                        ({vm.pagination.total_count} products found)
                                    </span>
                                )}
                            </Alert>
                        )} */}

                        {/* Rules Engine Messages (Delivery Information, etc.) */}
                        <RulesEngineInlineAlert
                            messages={vm.rulesMessages as any}
                            loading={vm.rulesLoading}
                            loadingMessage="Loading delivery information..."
                        />

                        {/* Debug Information (Development Only) */}
                        {/* {import.meta.env?.DEV && (
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
                        products={vm.products}
                        loading={vm.isLoading || vm.searchLoading}
                        error={vm.error || vm.searchError}
                        pagination={vm.pagination}
                        onLoadMore={vm.handleLoadMore}
                        onAddToCart={vm.handleAddToCart}
                        allEsspIds={vm.allEsspIds}
                        bulkDeadlines={vm.bulkDeadlines}
                        vatCalculations={vm.vatCalculations}
                        showProductCount
                        showLoadMoreButton
                        emptyStateMessage={
                            vm.isSearchMode
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
