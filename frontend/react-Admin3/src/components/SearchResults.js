import React, { useMemo } from "react";
import { Row, Col, Card, Badge, Button} from "react-bootstrap";
import{ Container } from "@mui/material";
import { Filter, ArrowRight, X } from "react-bootstrap-icons";
import ProductCard from "./Product/ProductCard/MaterialProductCard";
import useProductCardHelpers from "../hooks/useProductCardHelpers";
import "../styles/search_results.css";

const SearchResults = ({
	searchResults,
	searchQuery,
	selectedFilters,
	onFilterSelect,
	onFilterRemove,
	onShowMatchingProducts,
	isFilterSelected,
	maxSuggestions = 5,
	loading = false,
	error = null,
}) => {
	// Memoize top products calculation to prevent infinite re-renders
	const topProducts = useMemo(() => {
		return searchResults?.suggested_products?.length > 0
			? searchResults.suggested_products.slice(0, 5)
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
			<Badge
				key={`${filterType}-${item.id}`}
				bg={isSelected ? "primary" : "outline-secondary"}
				className={`me-2 mb-2 filter-badge ${isSelected ? "selected" : ""}`}
				onClick={() => onFilterSelect(filterType, item)}
				style={{ cursor: "pointer" }}>
				{displayName}
				{isSelected && <X className="ms-1" size={12} />}
			</Badge>
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
		<Container className="search-results-container mb-3" maxWidth={false}>
			{/* Error Display */}
			{error && (
				<Row className="mb-3">
					<Col>
						<div className="alert alert-danger" role="alert">
							{error}
						</div>
					</Col>
				</Row>
			)}

			{/* Loading State */}
			{loading && (
				<Row className="mb-3">
					<Col className="text-center">
						<div className="spinner-border text-primary" role="status">
							<span className="visually-hidden">Loading...</span>
						</div>
						<p className="mt-2 text-muted">Searching products...</p>
					</Col>
				</Row>
			)}

			{/* Two Column Layout */}
			{!loading && searchResults && (
				<Row className="w-100">
					{/* Left Column: Filters */}
					<Col lg={2} className="mb-4">
						<Card className="suggestion-filters-card h-100">
							<Card.Body>
								<div className="d-flex align-items-center mb-3">
									<Filter className="me-2 text-primary" />
									<h6 className="mb-0">
										{searchQuery
											? "Suggested Filters"
											: "Popular Filters"}
									</h6>
								</div>
								{searchQuery && (
									<small className="text-muted d-block mb-3">
										for "{searchQuery}"
									</small>
								)}

								{/* Subjects */}
								{searchResults?.suggested_filters?.subjects?.length >
									0 && (
									<div className="mb-3">
										<h6 className="filter-category-title">
											Subjects
										</h6>
										<div className="filter-badges-container">
											{searchResults?.suggested_filters?.subjects
												?.slice(0, maxSuggestions)
												?.map((item) =>
													renderFilterBadge("subjects", item)
												)}
										</div>
									</div>
								)}

								{/* Product Groups */}
								{searchResults?.suggested_filters?.product_groups
									?.length > 0 && (
									<div className="mb-3">
										<h6 className="filter-category-title">
											Categories
										</h6>
										<div className="filter-badges-container">
											{searchResults?.suggested_filters?.product_groups
												?.slice(0, maxSuggestions)
												?.map((item) =>
													renderFilterBadge("product_groups", item)
												)}
										</div>
									</div>
								)}

								{/* Variations */}
								{searchResults?.suggested_filters?.variations?.length >
									0 && (
									<div className="mb-3">
										<h6 className="filter-category-title">
											Product Types
										</h6>
										<div className="filter-badges-container">
											{searchResults?.suggested_filters?.variations
												?.slice(0, maxSuggestions)
												?.map((item) =>
													renderFilterBadge("variations", item)
												)}
										</div>
									</div>
								)}

								{/* Product Suggestions */}
								{searchResults?.suggested_filters?.products?.length >
									0 && (
									<div className="mb-3">
										<h6 className="filter-category-title">
											Products
										</h6>
										<div className="filter-badges-container">
											{searchResults?.suggested_filters?.products
												?.slice(0, maxSuggestions)
												?.map((item) =>
													renderFilterBadge("products", item)
												)}
										</div>
									</div>
								)}

								{/* Active Filters Section */}
								{Object.values(selectedFilters).some(filterArray => filterArray.length > 0) && (
									<div className="mt-4 pt-3 border-top">
										<h6 className="filter-category-title">Active Filters</h6>
										<div className="filter-badges-container">
											{/* Show all selected filters */}
											{Object.entries(selectedFilters).map(([filterType, filters]) =>
												filters.map(filter => (
													<Badge
														key={`active-${filterType}-${filter.id}`}
														bg="success"
														className="me-2 mb-2 filter-badge selected"
														onClick={() => onFilterRemove(filterType, filter)}
														style={{ cursor: "pointer" }}>
														{getDisplayName(filter)}
														<X className="ms-1" size={12} />
													</Badge>
												))
											)}
										</div>
										<small className="text-muted">
											Showing {filteredProducts.length} of {topProducts.length} products
										</small>
									</div>
								)}
							</Card.Body>
						</Card>
					</Col>

					{/* Right Column: Products */}
					<Col lg={10}>
						{filteredProducts.length > 0 ? (
							<Card className="top-products-card">
								<Card.Body>
									<div className="d-flex align-items-center justify-content-between mb-3">
										<div className="d-flex align-items-center">
											<h5 className="mb-0">
												{searchQuery
													? "Top Matching Products"
													: "Popular Products"}
											</h5>
											<small className="text-muted ms-2">
												({filteredProducts.length} of{" "}
												{searchResults?.total_count || 0}{" "}
												{searchQuery ? "results" : "products"})
											</small>
										</div>
										{searchQuery && (
											<Button
												variant="primary"
												size="sm"
												onClick={handleShowMatchingProducts}
												className="d-flex align-items-center">
												View All Results
												<ArrowRight className="ms-1" size={16} />
											</Button>
										)}
									</div>

									<Row>
										{filteredProducts.map((product, index) => (
											<Col
												key={product.id || product.essp_id || index}
												lg={6}
												xl={4}
												className="mb-3">
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
											</Col>
										))}
									</Row>

									{/* Show All Results Button */}
									{searchQuery && (
										<div className="text-center mt-3">
											<Button
												variant="primary"
												size="lg"
												onClick={handleShowMatchingProducts}
												className="d-flex align-items-center mx-auto px-4 py-2">
												Show All Matching Products
												<ArrowRight className="ms-2" size={20} />
											</Button>
											<small className="text-muted d-block mt-2">
												Found {filteredProducts.length} of{" "}
												{searchResults?.total_count || 0} products
												matching "{searchQuery}"
											</small>
										</div>
									)}
								</Card.Body>
							</Card>
						) : (
							/* No Results State */
							<Card className="text-center py-5">
								<Card.Body>
									<Filter size={48} className="text-muted mb-3" />
									<h5 className="text-muted">
										{Object.values(selectedFilters).some(filterArray => filterArray.length > 0)
											? "No products match your filters"
											: searchQuery
											? "No results found"
											: "Start searching to see products"}
									</h5>
									<p className="text-muted">
										{Object.values(selectedFilters).some(filterArray => filterArray.length > 0)
											? `Try removing some filters or search for different terms. ${topProducts.length} products available before filtering.`
											: searchQuery
											? `No products found for "${searchQuery}". Try different keywords or check your spelling.`
											: "Enter keywords in the search box above to find products, subjects, and categories."}
									</p>
								</Card.Body>
							</Card>
						)}
					</Col>
				</Row>
			)}
		</Container>
	);
};

export default SearchResults;
