import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TextField, Alert, CircularProgress, Box, InputAdornment, useTheme } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import searchService from '../services/searchService';
import {
    setSearchQuery as setSearchQueryAction,
    setSearchFilterProductIds,
    selectSearchQuery
} from '../store/slices/filtersSlice';
import '../styles/search_box.css';

const SearchBox = ({
    onSearchResults,
    onShowMatchingProducts,
    placeholder = "Search for products, subjects, categories...",
    autoFocus = false
}) => {
    const theme = useTheme();
    // Redux hooks for search query only
    const dispatch = useDispatch();
    const searchQuery = useSelector(selectSearchQuery);

    // Local UI state only (not filter data)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchResults, setSearchResults] = useState(null);

    const searchInputRef = useRef(null);
    const debounceRef = useRef(null);

    // Auto focus if requested
    useEffect(() => {
        if (autoFocus && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [autoFocus]);

    // Issue #1 Fix: Reload search results when modal opens with persisted query
    useEffect(() => {
        if (searchQuery && searchQuery.length >= 3) {
            performSearch(searchQuery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    // Debounced search function
    const performSearch = async (query) => {
        try {
            setLoading(true);
            setError('');

            // Issue #3 Fix: Don't search for empty or short queries (< 3 characters)
            if (!query || query.length < 3) {
                setSearchResults(null);
                // Issue #2 Fix: Clear search filter when query is cleared
                dispatch(setSearchFilterProductIds([]));
                if (onSearchResults) {
                    onSearchResults(null, query);
                }
                setLoading(false);
                return; // Exit early - no API call
            }

            // Perform actual search (only for queries >= 3 chars)
            const results = await searchService.fuzzySearch(query);
            setSearchResults(results);

            // Issue #2 Fix: Extract product IDs and dispatch to Redux for products page filtering
            // Use product_id (Product table ID) not id/essp_id (ExamSessionSubjectProduct ID)
            if (results && results.suggested_products && Array.isArray(results.suggested_products)) {
                const productIds = results.suggested_products
                    .map(product => product.product_id)
                    .filter(id => id !== undefined && id !== null);
                dispatch(setSearchFilterProductIds(productIds));
            } else {
                // No valid results, clear the filter
                dispatch(setSearchFilterProductIds([]));
            }

            if (onSearchResults) {
                onSearchResults(results, query);
            }
        } catch (err) {
            console.error('Search error:', err);
            setError('Search failed. Please try again.');

            // Provide fallback empty results instead of null
            const fallbackResults = {
                suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
                suggested_products: [],
                search_info: { query: query || '', type: 'fallback' },
                total_count: 0
            };
            setSearchResults(fallbackResults);

            // Issue #2 Fix: Clear search filter on error
            dispatch(setSearchFilterProductIds([]));

            if (onSearchResults) {
                onSearchResults(fallbackResults, query);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        const query = e.target.value;
        // T020: Dispatch to Redux instead of local state
        dispatch(setSearchQueryAction(query));

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Debounce search (300ms)
        debounceRef.current = setTimeout(() => {
            performSearch(query);
        }, 300);
    };

    const handleShowMatchingProducts = () => {
        if (onShowMatchingProducts) {
            // Issue #2 Fix: Pass product IDs from search results
            const productIds = searchResults?.suggested_products?.map(p => p.id || p.essp_id) || [];
            onShowMatchingProducts(productIds);
        }
    };

    // Handle Enter key press to navigate to products page
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Only navigate if there are search results with products
            if (searchResults && searchResults.suggested_products && searchResults.suggested_products.length > 0) {
                handleShowMatchingProducts();
            }
            // If no results, do nothing (user will see "No results found" message in modal)
        }
    };

    return (
       <Box
          className="search-box-container"
          sx={{
             paddingLeft: theme.liftkit?.spacing?.lg || 3,
             paddingRight: theme.liftkit?.spacing?.lg || 3,
          }}
       >
          {/* Search Input */}
          <Box>
             <TextField
                inputRef={searchInputRef}
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                fullWidth
                variant="outlined"
                size="small"
                color="white"
                sx={{
                   borderRadius: "50px",
                   "& .MuiOutlinedInput-root": {
                      borderRadius: "50px",
                      backgroundColor: "white",
                   },
                }}
                slotProps={{
                   startAdornment: (
                      <InputAdornment position="start">
                         <SearchIcon />
                      </InputAdornment>
                   ),
                   endAdornment: loading && (
                      <InputAdornment position="end">
                         <CircularProgress size={20} />
                      </InputAdornment>
                   ),
                }}
                className="search-input"
             />
          </Box>
          {/* Error Display */}
          {error && (
             <Alert severity="error" sx={{ mb: 3 }}>
                {error}
             </Alert>
          )}
       </Box>
    );
};

export default SearchBox; 