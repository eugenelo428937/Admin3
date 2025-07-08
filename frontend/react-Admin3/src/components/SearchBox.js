import React, { useState, useEffect, useRef } from 'react';
import { Form, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { Search, Filter, X } from 'react-bootstrap-icons';
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
        <div className="search-box-container">
            {/* Search Input */}
            <Form.Group className="mb-3">
                <div className="search-input-wrapper">
                    <Search className="search-icon" />
                    <Form.Control
                        ref={searchInputRef}
                        type="text"
                        placeholder={placeholder}
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onKeyDown={handleKeyDown}
                        className="search-input"
                    />
                    {loading && (
                        <Spinner 
                            animation="border" 
                            size="sm" 
                            className="search-spinner"
                        />
                    )}
                </div>
            </Form.Group>

            {/* Selected Filters Display */}
            {getTotalFilterCount() > 0 && (
                <div className="selected-filters mb-3">
                    <div className="d-flex align-items-center mb-2">
                        <Filter className="me-2" />
                        <strong>Selected Filters ({getTotalFilterCount()})</strong>
                        <Button 
                            variant="link" 
                            size="sm" 
                            onClick={clearAllFilters}
                            className="ms-2 p-0"
                        >
                            Clear All
                        </Button>
                    </div>
                    <div>
                        {selectedFilters.subjects.map(item => 
                            <Badge key={`selected-subject-${item.id}`} bg="info" className="me-2 mb-1">
                                {item.code || item.description} <X onClick={() => removeFilter('subjects', item.id)} style={{cursor: 'pointer'}} />
                            </Badge>
                        )}
                        {selectedFilters.product_groups.map(item => 
                            <Badge key={`selected-group-${item.id}`} bg="success" className="me-2 mb-1">
                                {item.name} <X onClick={() => removeFilter('product_groups', item.id)} style={{cursor: 'pointer'}} />
                            </Badge>
                        )}
                        {selectedFilters.variations.map(item => 
                            <Badge key={`selected-variation-${item.id}`} bg="warning" className="me-2 mb-1">
                                {item.name} <X onClick={() => removeFilter('variations', item.id)} style={{cursor: 'pointer'}} />
                            </Badge>
                        )}
                        {selectedFilters.products.map(item => 
                            <Badge key={`selected-product-${item.id}`} bg="secondary" className="me-2 mb-1">
                                {item.shortname || item.product_short_name || item.name} <X onClick={() => removeFilter('products', item.id)} style={{cursor: 'pointer'}} />
                            </Badge>
                        )}
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <Alert variant="danger" className="mb-3">
                    {error}
                </Alert>
            )}
        </div>
    );
};

export default SearchBox; 