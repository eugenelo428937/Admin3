import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TextField, Alert, CircularProgress, Box, InputAdornment, useTheme } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import searchService from '../services/searchService';
import {
    setSearchQuery as setSearchQueryAction,
    selectSearchQuery
} from '../store/slices/filtersSlice';
import { searchBoxContainerStyles, searchInputStyles } from '../theme/styles';

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
                if (onSearchResults) {
                    onSearchResults(null, query);
                }
                setLoading(false);
                return; // Exit early - no API call
            }

            // Perform actual search (only for queries >= 3 chars)
            // Note: Fuzzy search is ONLY for autocomplete/suggestions display
            // The unified search endpoint handles actual filtering with searchQuery parameter
            const results = await searchService.fuzzySearch(query);
            setSearchResults(results);

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
            // searchQuery is already stored in Redux
            // Unified search endpoint will handle the query
            onShowMatchingProducts();
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
          sx={{
             ...searchBoxContainerStyles,
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
                   ...searchInputStyles,
                   marginTop: theme.liftkit?.spacing?.lg || 3,
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