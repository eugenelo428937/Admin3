import React, { useMemo } from "react";
import { Card, CardContent, Container, Grid, Button, Box, Typography, CircularProgress, Alert } from "@mui/material";
import {
   Search as SearchIcon,
   ArrowForward as ArrowRightIcon,
} from "@mui/icons-material";
import { useSelector } from 'react-redux';
import {
	selectSearchQuery,
} from '../store/slices/filtersSlice';
import ProductCard from "./Product/ProductCard/MaterialProductCard";
import useProductCardHelpers from "../hooks/useProductCardHelpers";
import "../styles/search_results.css";


// Simplified SearchResults - no filter selection, search results only
const SearchResults = ({
	searchResults,
	onShowMatchingProducts,
	maxSuggestions = 3,
	loading = false,
	error = null,
}) => {
	// Read search query from Redux
	const searchQuery = useSelector(selectSearchQuery);
	// Memoize top products calculation
	const topProducts = useMemo(() => {
		return searchResults?.suggested_products?.length > 0
			? searchResults.suggested_products.slice(0, 3)
			: [];
	}, [searchResults?.suggested_products]);

	// Use the custom hook for product card functionality (must be called before any early returns)
	const { handleAddToCart, allEsspIds, bulkDeadlines } =
		useProductCardHelpers(topProducts);

	// Only show component when there's a search query
	// Don't show "popular filters" or default data
	if (!searchQuery || (!searchResults && !loading)) {
		return null;
	}

	return (
      <Container
         className="search-results-container"
         maxWidth={false}
         sx={{ mb: 3 }}
      >
         {/* Error Display */}
         {error && (
            <Grid container sx={{ mb: 3 }}>
               <Grid>
                  <Alert severity="error">{error}</Alert>
               </Grid>
            </Grid>
         )}

         {/* Loading State */}
         {loading && (
            <Grid container sx={{ mb: 3 }}>
               <Grid sx={{ textAlign: "center" }}>
                  <CircularProgress color="primary" />
                  <Typography
                     variant="body2"
                     color="text.secondary"
                     sx={{ mt: 2 }}
                  >
                     Searching products...
                  </Typography>
               </Grid>
            </Grid>
         )}

         {/* Products Display */}
         {!loading && searchResults && (
            <Grid container spacing={2}>
               {/* Products Column */}
               <Grid size={{ lg: 12 }}>
                  {topProducts.length > 0 ? (
                     <Card className="top-products-card">
                        <CardContent>
                           <Box
                              sx={{
                                 display: "flex",
                                 alignItems: "center",
                                 justifyContent: "space-between",
                                 mb: 3,
                              }}
                           >
                              <Box
                                 sx={{ display: "flex", alignItems: "center" }}
                              >                                 
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ ml: 2 }}
                                 >
                                    ({topProducts.length} of{" "}
                                    {searchResults?.total_count || 0}{" "}
                                    {searchQuery ? "results" : "products"})
                                 </Typography>
                              </Box>
                              {searchQuery && (
                                 <Button
                                    variant="contained"
                                    size="small"
                                    onClick={onShowMatchingProducts}
                                    endIcon={<ArrowRightIcon />}
                                    sx={{
                                       display: "flex",
                                       alignItems: "center",
                                    }}
                                 >
                                    View All Results
                                 </Button>
                              )}
                           </Box>

                           <Grid container spacing={0}>
                              {topProducts.map((product, index) => (
                                 <Grid
                                    size={{ xl: 3, lg: 4, md: 6, sm: 12 }}
                                    key={product.id || product.essp_id || index}
                                    sx={{
                                       display: "flex",
                                       alignItems: "center",
                                       justifyContent: "center",
                                       flexWrap: "wrap",
                                    }}
                                 >
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
                              <Box sx={{ textAlign: "center", mt: 3 }}>
                                 <Button
                                    variant="contained"
                                    size="large"
                                    onClick={onShowMatchingProducts}
                                    endIcon={<ArrowRightIcon />}
                                    sx={{
                                       display: "flex",
                                       alignItems: "center",
                                       mx: "auto",
                                       px: 4,
                                       py: 2,
                                    }}
                                 >
                                    Show All Matching Products
                                 </Button>
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block", mt: 2 }}
                                 >
                                    Found {topProducts.length} of{" "}
                                    {searchResults?.total_count || 0} products
                                    matching "{searchQuery}"
                                 </Typography>
                              </Box>
                           )}
                        </CardContent>
                     </Card>
                  ) : (
                     /* No Results State */
                     <Card sx={{ textAlign: "center", py: 5 }}>
                        <CardContent>
                           <SearchIcon
                              sx={{
                                 fontSize: 48,
                                 color: "text.secondary",
                                 mb: 3,
                              }}
                           />
                           <Typography variant="h5" color="text.secondary">
                              {searchQuery ? "No results found" : "Start searching to see products"}
                           </Typography>
                           <Typography variant="body1" color="text.secondary">
                              {searchQuery
                                 ? `No products found for "${searchQuery}". Try different keywords or check your spelling.`
                                 : "Enter keywords in the search box above to find products."}
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
