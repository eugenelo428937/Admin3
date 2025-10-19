import React, { useMemo } from "react";
import { Card, CardContent, Container, Grid, useTheme, Chip, Button, Box, Typography, CircularProgress, Alert } from "@mui/material";
import { FilterList as FilterIcon, ArrowForward as ArrowRightIcon, Close as CloseIcon } from "@mui/icons-material";
import ProductCard from "./Product/ProductCard/MaterialProductCard";
import useProductCardHelpers from "../hooks/useProductCardHelpers";
import "../styles/search_results.css";
import { ThemeProvider } from "@mui/material/styles";

const SearchResults = ({
	searchResults,
	searchQuery,
	selectedFilters,
	onFilterSelect,
	onFilterRemove,
	onShowMatchingProducts,
	isFilterSelected,
	maxSuggestions = 3,
	loading = false,
	error = null,
}) => {
	const theme = useTheme();
	// Memoize top products calculation to prevent infinite re-renders
	const topProducts = useMemo(() => {
		return searchResults?.suggested_products?.length > 0
			? searchResults.suggested_products.slice(0, 3)
			: [];
	}, [searchResults?.suggested_products]);

	// Filter products based on selected filters
	const filteredProducts = useMemo(() => {
		if (!topProducts.length) return [];

		// If no filters are selected, return all products
		const hasActiveFilters = Object.values(selectedFilters).some(
			(filterArray) => filterArray.length > 0
		);
		if (!hasActiveFilters) {
			return topProducts;
		}

		return topProducts.filter((product) => {
			// Check subject filter
			if (selectedFilters.subjects.length > 0) {
				const matchesSubject = selectedFilters.subjects.some(
					(filter) =>
						product.subject_code === filter.code ||
						product.subject_code === filter.id ||
						product.subject_name === filter.description ||
						product.subject_name === filter.name
				);
				if (!matchesSubject) return false;
			}

			// Check product group filter
			if (selectedFilters.product_groups.length > 0) {
				const matchesGroup = selectedFilters.product_groups.some(
					(filter) =>
						product.product_group_id === filter.id ||
						product.product_group_name === filter.name ||
						product.group_name === filter.name
				);
				if (!matchesGroup) return false;
			}

			// Check variation filter
			if (selectedFilters.variations.length > 0) {
				const matchesVariation = selectedFilters.variations.some(
					(filter) =>
						product.variation_id === filter.id ||
						product.variation_name === filter.name ||
						product.type === filter.name
				);
				if (!matchesVariation) return false;
			}

			// Check specific product filter
			if (selectedFilters.products.length > 0) {
				const matchesProduct = selectedFilters.products.some(
					(filter) =>
						product.id === filter.id ||
						product.essp_id === filter.id ||
						product.product_id === filter.id ||
						product.product_name === filter.name ||
						product.shortname === filter.shortname
				);
				if (!matchesProduct) return false;
			}

			return true;
		});
	}, [topProducts, selectedFilters]);

	// Use the custom hook for product card functionality (must be called before any early returns)
	const { handleAddToCart, allEsspIds, bulkDeadlines } =
		useProductCardHelpers(filteredProducts);

	// Show component even if no search query (will show default data)
	// Only hide if there's an error and no data at all
	if (!searchResults && !loading && error) {
		return null;
	}

	// Handle different field names from different API responses
	const getDisplayName = (item) => {
		return (
			item.name ||
			item.description ||
			item.fullname ||
			item.shortname ||
			item.product_name ||
			item.product_short_name ||
			item.subject_description ||
			item.code
		);
	};

	// Render filter badge
	const renderFilterBadge = (filterType, item) => {
		const displayName = getDisplayName(item);
		const isSelected = isFilterSelected(filterType, item);

		return (
			<Chip
				key={`${filterType}-${item.id}`}
				label={displayName}
				color={isSelected ? "primary" : "default"}
				variant={isSelected ? "filled" : "outlined"}
				onClick={() => onFilterSelect(filterType, item)}
				onDelete={isSelected ? () => onFilterSelect(filterType, item) : undefined}
				deleteIcon={isSelected ? <CloseIcon /> : undefined}
				sx={{ mr: 2, mb: 2, cursor: "pointer" }}
				className={`filter-badge ${isSelected ? "selected" : ""}`}
			/>
		);
	};

	// Check if we have any suggestions to show
	const hasSuggestions =
		searchResults?.suggested_filters &&
		(searchResults.suggested_filters.subjects?.length > 0 ||
			searchResults.suggested_filters.product_groups?.length > 0 ||
			searchResults.suggested_filters.variations?.length > 0 ||
			searchResults.suggested_filters.products?.length > 0);

	// Helper function to ensure we always pass the correct search parameters
	const handleShowMatchingProducts = () => {
		// Use the provided searchQuery, but fallback to search_info if needed
		const queryToUse = searchQuery || searchResults?.search_info?.query || "";

		onShowMatchingProducts(searchResults, selectedFilters, queryToUse);
	};

	return (
		<Container className="search-results-container" maxWidth={false} sx={{ mb: 3 }}>
			{/* Error Display */}
			{error && (
				<Grid container sx={{ mb: 3 }}>
					<Grid>
						<Alert severity="error">
							{error}
						</Alert>
					</Grid>
				</Grid>
			)}

			{/* Loading State */}
			{loading && (
				<Grid container sx={{ mb: 3 }}>
					<Grid sx={{ textAlign: 'center' }}>
						<CircularProgress color="primary" />
						<Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
							Searching products...
						</Typography>
					</Grid>
				</Grid>
			)}

			{/* Two Column Layout */}
			{!loading && searchResults && (
				<Grid container spacing={2}>
					{/* Left Column: Filters */}
					<Grid size={{ lg: 2 }}>
						<Card className="suggestion-filters-card" sx={{ height: '100%' }}>
							<CardContent>
								<Box sx={{ display: 'flex', alignItems: 'center', mb: 3, pb: 3 }}>
									<FilterIcon color="primary" sx={{ mr: 2 }} />
									<Typography variant="h6" component="h6" sx={{ mb: 0 }}>
										{searchQuery
											? "Suggested Filters"
											: "Popular Filters"}
									</Typography>
								</Box>
								{searchQuery && (
									<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
										for "{searchQuery}"
									</Typography>
								)}

								{/* Subjects */}
								{searchResults?.suggested_filters?.subjects?.length >
									0 && (
									<Box sx={{ mb: 3 }}>
										<Typography variant="h6" className="filter-category-title">
											Subjects
										</Typography>
										<Box className="filter-badges-container">
											{searchResults?.suggested_filters?.subjects
												?.slice(0, maxSuggestions)
												?.map((item) =>
													renderFilterBadge("subjects", item)
												)}
										</Box>
									</Box>
								)}

								{/* Product Groups */}
								{searchResults?.suggested_filters?.product_groups
									?.length > 0 && (
									<Box sx={{ mb: 3 }}>
										<Typography variant="h6" className="filter-category-title">
											Categories
										</Typography>
										<Box className="filter-badges-container">
											{searchResults?.suggested_filters?.product_groups
												?.slice(0, maxSuggestions)
												?.map((item) =>
													renderFilterBadge("product_groups", item)
												)}
										</Box>
									</Box>
								)}

								{/* Variations */}
								{searchResults?.suggested_filters?.variations?.length >
									0 && (
									<Box sx={{ mb: 3 }}>
										<Typography variant="h6" className="filter-category-title">
											Product Types
										</Typography>
										<Box className="filter-badges-container">
											{searchResults?.suggested_filters?.variations
												?.slice(0, maxSuggestions)
												?.map((item) =>
													renderFilterBadge("variations", item)
												)}
										</Box>
									</Box>
								)}

								{/* Product Suggestions */}
								{searchResults?.suggested_filters?.products?.length >
									0 && (
									<Box sx={{ mb: 3 }}>
										<Typography variant="h6" className="filter-category-title">
											Products
										</Typography>
										<Box className="filter-badges-container">
											{searchResults?.suggested_filters?.products
												?.slice(0, maxSuggestions)
												?.map((item) =>
													renderFilterBadge("products", item)
												)}
										</Box>
									</Box>
								)}

								{/* Active Filters Section */}
								{Object.values(selectedFilters).some(
									(filterArray) => filterArray.length > 0
								) && (
									<Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
										<Typography variant="h6" className="filter-category-title">
											Active Filters
										</Typography>
										<Box className="filter-badges-container">
											{/* Show all selected filters */}
											{Object.entries(selectedFilters).map(
												([filterType, filters]) =>
													filters.map((filter) => (
														<Chip
															key={`active-${filterType}-${filter.id}`}
															label={getDisplayName(filter)}
															color="success"
															onDelete={() => onFilterRemove(filterType, filter)}
															deleteIcon={<CloseIcon />}
															sx={{ mr: 2, mb: 2, cursor: "pointer" }}
															className="filter-badge selected"
														/>
													))
											)}
										</Box>
										<Typography variant="caption" color="text.secondary">
											Showing {filteredProducts.length} of{" "}
											{topProducts.length} products
										</Typography>
									</Box>
								)}
							</CardContent>
						</Card>
					</Grid>

					{/* Right Column: Products */}
					<Grid size={{ lg: 10 }}>
						{filteredProducts.length > 0 ? (
							<Card className="top-products-card">
								<CardContent>
									<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
										<Box sx={{ display: 'flex', alignItems: 'center' }}>
											<Typography variant="h5" component="h5" sx={{ mb: 0 }}>
												{searchQuery
													? "Top Matching Products"
													: "Popular Products"}
											</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
												({filteredProducts.length} of{" "}
												{searchResults?.total_count || 0}{" "}
												{searchQuery ? "results" : "products"})
											</Typography>
										</Box>
										{searchQuery && (
											<Button
												variant="contained"
												size="small"
												onClick={handleShowMatchingProducts}
												endIcon={<ArrowRightIcon />}
												sx={{ display: 'flex', alignItems: 'center' }}>
												View All Results
											</Button>
										)}
									</Box>

									<Grid container spacing={0}>
										{filteredProducts.map((product, index) => (
											<Grid
												size={{ xl: 3, lg: 4, md: 6, sm: 12 }}
												key={product.id || product.essp_id || index}
												sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
												<ProductCard
													product={{
														...product,
														// Ensure compatibility with ProductCard expectations
														id: product.id || product.essp_id,
														essp_id:
															product.essp_id || product.id,
														product_name:
															product.product_name ||
															product.shortname ||
															product.fullname,
														subject_code: product.subject_code,
														subject_name:
															product.subject_name ||
															product.subject_description,
														type: product.type || "Material", // Default to Material if no type
													}}
													onAddToCart={handleAddToCart}
													allEsspIds={allEsspIds}
													bulkDeadlines={bulkDeadlines}
												/>
											</Grid>
										))}
									</Grid>

									{/* Show All Results Button */}
									{searchQuery && (
										<Box sx={{ textAlign: 'center', mt: 3 }}>
											<Button
												variant="contained"
												size="large"
												onClick={handleShowMatchingProducts}
												endIcon={<ArrowRightIcon />}
												sx={{ display: 'flex', alignItems: 'center', mx: 'auto', px: 4, py: 2 }}>
												Show All Matching Products
											</Button>
											<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
												Found {filteredProducts.length} of{" "}
												{searchResults?.total_count || 0} products
												matching "{searchQuery}"
											</Typography>
										</Box>
									)}
								</CardContent>
							</Card>
						) : (
							/* No Results State */
							<Card sx={{ textAlign: 'center', py: 5 }}>
								<CardContent>
									<FilterIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 3 }} />
									<Typography variant="h5" color="text.secondary">
										{Object.values(selectedFilters).some(
											(filterArray) => filterArray.length > 0
										)
											? "No products match your filters"
											: searchQuery
											? "No results found"
											: "Start searching to see products"}
									</Typography>
									<Typography variant="body1" color="text.secondary">
										{Object.values(selectedFilters).some(
											(filterArray) => filterArray.length > 0
										)
											? `Try removing some filters or search for different terms. ${topProducts.length} products available before filtering.`
											: searchQuery
											? `No products found for "${searchQuery}". Try different keywords or check your spelling.`
											: "Enter keywords in the search box above to find products, subjects, and categories."}
									</Typography>
								</CardContent>
							</Card>
						)}
					</Grid>
				</Grid>
			)}
		</Container>
	);
};

export default SearchResults;
