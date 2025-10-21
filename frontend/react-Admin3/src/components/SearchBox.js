import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TextField, Chip, Button, Alert, CircularProgress, Box, IconButton, InputAdornment } from '@mui/material';
import { Search as SearchIcon, FilterList as FilterIcon, Close as CloseIcon } from '@mui/icons-material';
import searchService from '../services/searchService';
import {
    setSearchQuery as setSearchQueryAction,
    toggleSubjectFilter,
    toggleProductTypeFilter,
    toggleProductFilter,
    removeSubjectFilter,
    removeProductTypeFilter,
    removeProductFilter,
    clearAllFilters as clearAllFiltersAction,
    selectFilters,
    selectSearchQuery
} from '../store/slices/filtersSlice';
import '../styles/search_box.css';

const SearchBox = ({
    onSearchResults,
    onShowMatchingProducts,
    placeholder = "Search for products, subjects, categories...",
    autoFocus = false
}) => {
    // Redux hooks - T017, T018
    const dispatch = useDispatch();
    const filters = useSelector(selectFilters);
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

    // Debounced search function
    const performSearch = async (query) => {
        try {
            setLoading(true);
            setError('');
            
            let results;
            if (!query || query.length < 2) {
                // Get default data when no search query
                results = await searchService.getDefaultSearchData();
            } else {
                // Perform actual search
                results = await searchService.fuzzySearch(query);
            }
            
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

    const handleFilterSelect = (filterType, item) => {
        // T019: Dispatch Redux actions instead of local state updates
        const filterCode = item.code || item.id;

        // Map filter types to Redux actions
        switch (filterType) {
            case 'subjects':
                dispatch(toggleSubjectFilter(filterCode));
                break;
            case 'product_groups':
            case 'variations':
                // Both map to product_types in Redux
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
        // Read from Redux filters instead of local state
        const filterCode = item.code || item.id;

        switch (filterType) {
            case 'subjects':
                return filters.subjects.includes(filterCode);
            case 'product_groups':
            case 'variations':
                return filters.product_types.includes(filterCode);
            case 'products':
                return filters.products.includes(filterCode);
            default:
                return false;
        }
    };

    const removeFilter = (filterType, itemId) => {
        // T022: Dispatch Redux remove actions
        switch (filterType) {
            case 'subjects':
                dispatch(removeSubjectFilter(itemId));
                break;
            case 'product_groups':
            case 'variations':
                dispatch(removeProductTypeFilter(itemId));
                break;
            case 'products':
                dispatch(removeProductFilter(itemId));
                break;
            default:
                console.warn(`Unknown filter type: ${filterType}`);
        }
    };

    const clearAllFilters = () => {
        // T021: Dispatch Redux clearAllFilters action
        dispatch(clearAllFiltersAction());
    };

    const handleShowMatchingProducts = () => {
        if (onShowMatchingProducts) {
            // Note: selectedFilters now comes from Redux (filters)
            // Convert Redux filter state to expected format for callback
            const selectedFilters = {
                subjects: filters.subjects,
                product_groups: filters.product_types,
                variations: filters.product_types,
                products: filters.products
            };
            onShowMatchingProducts(searchResults, selectedFilters, searchQuery);
        }
    };

    // Handle Enter key press to navigate to products page
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleShowMatchingProducts();
        }
    };

    // Get total filter count from Redux state
    const getTotalFilterCount = () => {
        return filters.subjects.length +
               filters.product_types.length +
               filters.products.length;
    };

    return (
			<Box className="search-box-container">
				{/* Search Input */}
				<Box sx={{ mb: 3 }}>
					<TextField
						inputRef={searchInputRef}
						type="text"
						placeholder={placeholder}
						value={searchQuery}
						onChange={handleSearchChange}
						onKeyDown={handleKeyDown}
						fullWidth
						variant="outlined"
						size="medium"
						sx={{
							backgroundColor: 'white',
							borderRadius: '50px',
							'& .MuiOutlinedInput-root': {
								borderRadius: '50px',
							},
						}}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon />
								</InputAdornment>
							),
							endAdornment: loading && (
								<InputAdornment position="end">
									<CircularProgress size={20} />
								</InputAdornment>
							)
						}}
						className="search-input"
					/>
				</Box>

				{/* Selected Filters Display */}
				{getTotalFilterCount() > 0 && (
					<Box className="selected-filters" sx={{ mb: 3 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
							<FilterIcon sx={{ mr: 2 }} />
							<Box component="strong">Selected Filters ({getTotalFilterCount()})</Box>
							<Button
								variant="text"
								size="small"
								onClick={clearAllFilters}
								sx={{ ml: 2, p: 0 }}>
								Clear All
							</Button>
						</Box>
						<Box>
							{/* Note: Redux stores codes/IDs, not full objects */}
							{/* In future, we'll need to match codes to display objects from API */}
							{/* For now, display the codes directly */}
							{filters.subjects.map((code) => (
								<Chip
									key={`selected-subject-${code}`}
									label={code}
									color="info"
									onDelete={() => removeFilter("subjects", code)}
									deleteIcon={<CloseIcon />}
									sx={{ mr: 2, mb: 1 }}
								/>
							))}
							{filters.product_types.map((code) => (
								<Chip
									key={`selected-type-${code}`}
									label={code}
									color="success"
									onDelete={() => removeFilter("product_groups", code)}
									deleteIcon={<CloseIcon />}
									sx={{ mr: 2, mb: 1 }}
								/>
							))}
							{filters.products.map((code) => (
								<Chip
									key={`selected-product-${code}`}
									label={code}
									color="default"
									onDelete={() => removeFilter("products", code)}
									deleteIcon={<CloseIcon />}
									sx={{ mr: 2, mb: 1 }}
								/>
							))}
						</Box>
					</Box>
				)}

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