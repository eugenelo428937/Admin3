import React, { useState, useEffect, useRef } from 'react';
import { TextField, Chip, Button, Alert, CircularProgress, Box, IconButton, InputAdornment } from '@mui/material';
import { Search as SearchIcon, FilterList as FilterIcon, Close as CloseIcon } from '@mui/icons-material';
import searchService from '../services/searchService';
import '../styles/search_box.css';

const SearchBox = ({ 
    onSearchResults, 
    onShowMatchingProducts,
    placeholder = "Search for products, subjects, categories...",
    autoFocus = false 
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilters, setSelectedFilters] = useState({
        subjects: [],
        product_groups: [],
        variations: [],
        products: []
    });
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

    // Load default data on component mount
    useEffect(() => {
        performSearch(''); // This will trigger getDefaultSearchData
    }, []); // Empty dependency array means this runs only once on mount

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
        setSearchQuery(query);
        
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
        const isSelected = isFilterSelected(filterType, item);
        
        if (isSelected) {
            // Remove filter
            removeFilter(filterType, item.id);
        } else {
            // Add filter
            setSelectedFilters(prev => ({
                ...prev,
                [filterType]: [...prev[filterType], item]
            }));
        }
    };

    const isFilterSelected = (filterType, item) => {
        return selectedFilters[filterType].some(selected => selected.id === item.id);
    };

    const removeFilter = (filterType, itemId) => {
        setSelectedFilters(prev => ({
            ...prev,
            [filterType]: prev[filterType].filter(item => item.id !== itemId)
        }));
    };

    const clearAllFilters = () => {
        setSelectedFilters({
            subjects: [],
            product_groups: [],
            variations: [],
            products: []
        });
    };

    const handleShowMatchingProducts = () => {
        if (onShowMatchingProducts) {
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

    // Get total filter count
    const getTotalFilterCount = () => {
        return Object.values(selectedFilters).reduce((total, filters) => total + filters.length, 0);
    };

    return (
			<Box className="search-box-container m-top__md">
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
							{selectedFilters.subjects.map((item) => (
								<Chip
									key={`selected-subject-${item.id}`}
									label={item.code || item.description}
									color="info"
									onDelete={() => removeFilter("subjects", item.id)}
									deleteIcon={<CloseIcon />}
									sx={{ mr: 2, mb: 1 }}
								/>
							))}
							{selectedFilters.product_groups.map((item) => (
								<Chip
									key={`selected-group-${item.id}`}
									label={item.name}
									color="success"
									onDelete={() => removeFilter("product_groups", item.id)}
									deleteIcon={<CloseIcon />}
									sx={{ mr: 2, mb: 1 }}
								/>
							))}
							{selectedFilters.variations.map((item) => (
								<Chip
									key={`selected-variation-${item.id}`}
									label={item.name}
									color="warning"
									onDelete={() => removeFilter("variations", item.id)}
									deleteIcon={<CloseIcon />}
									sx={{ mr: 2, mb: 1 }}
								/>
							))}
							{selectedFilters.products.map((item) => (
								<Chip
									key={`selected-product-${item.id}`}
									label={item.shortname || item.product_short_name || item.name}
									color="default"
									onDelete={() => removeFilter("products", item.id)}
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