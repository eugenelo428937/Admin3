import React, { useMemo } from "react";
import { Card, CardContent, Container, Grid, useTheme, Chip, Button, Box, Typography, CircularProgress, Alert } from "@mui/material";
import { FilterList as FilterIcon, ArrowForward as ArrowRightIcon, Close as CloseIcon } from "@mui/icons-material";
import { useDispatch, useSelector } from 'react-redux';
import {
	toggleSubjectFilter,
	toggleProductTypeFilter,
	toggleProductFilter,
	removeSubjectFilter,
	removeProductTypeFilter,
	removeProductFilter,
	selectFilters,
	selectSearchQuery,
} from '../store/slices/filtersSlice';
import ProductCard from "./Product/ProductCard/MaterialProductCard";
import useProductCardHelpers from "../hooks/useProductCardHelpers";
import "../styles/search_results.css";
import { ThemeProvider } from "@mui/material/styles";

// T027: Updated to use Redux for filter state management
const SearchResults = ({
	searchResults,
	onShowMatchingProducts,
	maxSuggestions = 3,
	loading = false,
	error = null,
}) => {
	const dispatch = useDispatch();

	// T027: Read filter state from Redux instead of props
	const selectedFilters = useSelector(selectFilters);
	const searchQuery = useSelector(selectSearchQuery);
	const theme = useTheme();
	// Memoize top products calculation to prevent infinite re-renders
	const topProducts = useMemo(() => {
		return searchResults?.suggested_products?.length > 0
			? searchResults.suggested_products.slice(0, 3)
			: [];
	}, [searchResults?.suggested_products]);

	// T027: Filter products based on Redux filter state (stores codes/IDs as strings)
	const filteredProducts = useMemo(() => {
		if (!topProducts.length) return [];

		// If no filters are selected, return all products
		const hasActiveFilters =
			selectedFilters.subjects.length > 0 ||
			selectedFilters.product_types.length > 0 ||
			selectedFilters.products.length > 0;

		if (!hasActiveFilters) {
			return topProducts;
		}

		return topProducts.filter((product) => {
			// Check subject filter (Redux stores codes like 'CB1', 'CB2')
			if (selectedFilters.subjects.length > 0) {
				const matchesSubject = selectedFilters.subjects.some(
					(code) => product.subject_code === code
				);
				if (!matchesSubject) return false;
			}

			// Check product types filter (includes both product_groups and variations)
			// Redux stores product_types codes like '8', '9'
			if (selectedFilters.product_types.length > 0) {
				const matchesProductType = selectedFilters.product_types.some(
					(code) =>
						String(product.product_group_id) === code ||
						String(product.variation_id) === code
				);
				if (!matchesProductType) return false;
			}

			// Check specific product filter (Redux stores product IDs)
			if (selectedFilters.products.length > 0) {
				const matchesProduct = selectedFilters.products.some(
					(id) =>
						String(product.id) === id ||
						String(product.essp_id) === id ||
						String(product.product_id) === id
				);
				if (!matchesProduct) return false;
			}

			return true;
		});
	}, [topProducts, selectedFilters]);

	// Use the custom hook for product card functionality (must be called before any early returns)
	const { handleAddToCart, allEsspIds, bulkDeadlines } =
		useProductCardHelpers(filteredProducts);

	// Only show component when there's a search query
	// Don't show "popular filters" or default data
	if (!searchQuery || (!searchResults && !loading)) {
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

	// T027: Render filter badge with Redux dispatch
	const handleFilterClick = (filterType, item) => {
		const filterCode = item.code || item.id;

		switch (filterType) {
			case 'subjects':
				dispatch(toggleSubjectFilter(filterCode));
				break;
			case 'product_groups':
			case 'variations':
				dispatch(toggleProductTypeFilter(filterCode));
				break;
			case 'products':
				dispatch(toggleProductFilter(filterCode));
				break;
			default:
				console.warn(`Unknown filter type: ${filterType}`);
		}
	};

	const isFilterSelected = (filterType, item) => {
		const filterCode = item.code || item.id;

		switch (filterType) {
			case 'subjects':
				return selectedFilters.subjects.includes(filterCode);
			case 'product_groups':
			case 'variations':
				return selectedFilters.product_types.includes(filterCode);
			case 'products':
				return selectedFilters.products.includes(filterCode);
			default:
				return false;
		}
	};

	const renderFilterBadge = (filterType, item) => {
		const displayName = getDisplayName(item);
		const isSelected = isFilterSelected(filterType, item);

		return (
			<Chip
				key={`${filterType}-${item.id}`}
				label={displayName}
				color={isSelected ? "primary" : "default"}
				variant={isSelected ? "filled" : "outlined"}
				onClick={() => handleFilterClick(filterType, item)}
				onDelete={isSelected ? () => handleFilterClick(filterType, item) : undefined}
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

	// T027: Simplified - filters already in Redux, just call navigation callback
	const handleShowMatchingProducts = () => {
		onShowMatchingProducts();
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
										Suggested Filters
									</Typography>
								</Box>
								<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
									for "{searchQuery}"
								</Typography>

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

								{/* Active Filters Section - T027: Updated for Redux (stores codes/IDs) */}
								{(selectedFilters.subjects.length > 0 ||
									selectedFilters.product_types.length > 0 ||
									selectedFilters.products.length > 0) && (
									<Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
										<Typography variant="h6" className="filter-category-title">
											Active Filters
										</Typography>
										<Box className="filter-badges-container">
											{/* Subjects */}
											{selectedFilters.subjects.map((code) => (
												<Chip
													key={`active-subject-${code}`}
													label={code}
													color="success"
													onDelete={() => dispatch(removeSubjectFilter(code))}
													deleteIcon={<CloseIcon />}
													sx={{ mr: 2, mb: 2, cursor: "pointer" }}
													className="filter-badge selected"
												/>
											))}
											{/* Product Types */}
											{selectedFilters.product_types.map((code) => (
												<Chip
													key={`active-type-${code}`}
													label={code}
													color="success"
													onDelete={() => dispatch(removeProductTypeFilter(code))}
													deleteIcon={<CloseIcon />}
													sx={{ mr: 2, mb: 2, cursor: "pointer" }}
													className="filter-badge selected"
												/>
											))}
											{/* Products */}
											{selectedFilters.products.map((id) => (
												<Chip
													key={`active-product-${id}`}
													label={id}
													color="success"
													onDelete={() => dispatch(removeProductFilter(id))}
													deleteIcon={<CloseIcon />}
													sx={{ mr: 2, mb: 2, cursor: "pointer" }}
													className="filter-badge selected"
												/>
											))}
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
							/* No Results State - T027: Updated for Redux state structure */
							<Card sx={{ textAlign: 'center', py: 5 }}>
								<CardContent>
									<FilterIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 3 }} />
									<Typography variant="h5" color="text.secondary">
										{(selectedFilters.subjects.length > 0 ||
											selectedFilters.product_types.length > 0 ||
											selectedFilters.products.length > 0)
											? "No products match your filters"
											: searchQuery
											? "No results found"
											: "Start searching to see products"}
									</Typography>
									<Typography variant="body1" color="text.secondary">
										{(selectedFilters.subjects.length > 0 ||
											selectedFilters.product_types.length > 0 ||
											selectedFilters.products.length > 0)
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
