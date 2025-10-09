import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import SearchBox from '../SearchBox';
import SearchResults from '../SearchResults';

const SearchModal = ({ open, onClose }) => {
  const navigate = useNavigate();

  // State for search modal
  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    subjects: [],
    product_groups: [],
    variations: [],
    products: []
  });
  const [searchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Ensure body overflow is properly restored when modal closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        const currentOverflow = document.body.style.overflow;
        if (currentOverflow === 'hidden') {
          // Use combined overflow property for better MUI compatibility
          document.body.style.overflow = 'visible auto';
        }
        document.body.classList.remove('mui-fixed');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Handle closing the search modal and resetting state
  const handleCloseSearchModal = useCallback(() => {
    onClose();
    // Reset search state after a brief delay to avoid visual glitches
    setTimeout(() => {
      setSearchResults(null);
      setSearchQuery('');
      setSelectedFilters({
        subjects: [],
        product_groups: [],
        variations: [],
        products: []
      });
      setSearchError(null);
    }, 300);
  }, [onClose]);

  // Add keyboard shortcut for search modal (Escape key)
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Escape key to close search modal
      if (event.key === 'Escape' && open) {
        handleCloseSearchModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleCloseSearchModal]);

  // Handle search results from SearchBox
  const handleSearchResults = (results, query) => {
    setSearchResults(results);
    setSearchQuery(query || '');
    setSearchError(null);
  };

  // Handle filter selection from SearchResults
  const handleFilterSelect = (filterType, item) => {
    const isSelected = isFilterSelected(filterType, item);
    
    if (isSelected) {
      // Remove filter
      setSelectedFilters(prev => ({
        ...prev,
        [filterType]: prev[filterType].filter(selected => selected.id !== item.id)
      }));
    } else {
      // Add filter
      setSelectedFilters(prev => ({
        ...prev,
        [filterType]: [...prev[filterType], item]
      }));
    }
  };

  // Check if filter is selected
  const isFilterSelected = (filterType, item) => {
    return selectedFilters[filterType].some(selected => selected.id === item.id);
  };

  // Remove filter
  const handleFilterRemove = (filterType, itemId) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].filter(item => item.id !== itemId)
    }));
  };

  // Handle "Show Matching Products" button click from SearchResults
  const handleShowMatchingProducts = (results, filters, query) => {

    // Use current state if parameters are not provided
    const searchQueryToUse = query || searchQuery;
    const filtersToUse = filters || selectedFilters;
    
    const searchParams = new URLSearchParams();
    
    if (searchQueryToUse?.trim()) {
      searchParams.append('q', searchQueryToUse.trim());
    }
    
    // Add selected filters
    filtersToUse.subjects.forEach(subject => {
      searchParams.append('subjects', subject.code || subject.id);
    });
    
    filtersToUse.product_groups.forEach(group => {
      searchParams.append('groups', group.id);
    });
    
    filtersToUse.variations.forEach(variation => {
      searchParams.append('variations', variation.id);
    });
    
    filtersToUse.products.forEach(product => {
      searchParams.append('products', product.id);
    });

    const finalUrl = `/products?${searchParams.toString()}`;
    
    // Close the modal and navigate
    handleCloseSearchModal();
    navigate(finalUrl);
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseSearchModal}
      aria-labelledby="search-modal-title"
      aria-describedby="search-modal-description"
      maxWidth="lg"
      fullWidth
      className="search-modal"
      elevation={2}
      disableEscapeKeyDown={false}
      keepMounted={false}>
      <DialogTitle
        id="search-modal-title"
        sx={{
          background: "#dee2e6",
          color: "#495057",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingY: 2,
          paddingX: 3,
        }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <SearchIcon sx={{ marginRight: 1 }} />
          <Typography variant="h6" component="span">
            Search Products
          </Typography>
          <Typography
            variant="caption"
            component="span"
            sx={{ marginLeft: 2, opacity: 0.8 }}></Typography>
        </Box>
        <IconButton
          edge="end"
          color="#495057"
          onClick={handleCloseSearchModal}
          aria-label="close"
          sx={{ color: "#495057" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          backgroundColor: "#f8f9fa",
          padding: 3,
        }}>
        <Paper
          elevation={0}
          sx={{
            paddingTop: 4,
            alignItems: "center",
            marginBottom: 2,
            backgroundColor: "#E9ECEF00",
          }}
          className="search-box-container">
          <SearchBox
            onSearchResults={handleSearchResults}
            onShowMatchingProducts={handleShowMatchingProducts}
            autoFocus={true}
            placeholder="Search for products, subjects, categories..."
          />
        </Paper>
        <Paper
          elevation={0}
          sx={{
            paddingY: 0,
            marginLeft: 5,
            marginRight: 5,
            borderRadius: 2,
            backgroundColor: "#E9ECEF00",
          }}
          className="search-results-container">
          <SearchResults
            searchResults={searchResults}
            searchQuery={searchQuery}
            selectedFilters={selectedFilters}
            onFilterSelect={handleFilterSelect}
            onFilterRemove={handleFilterRemove}
            onShowMatchingProducts={handleShowMatchingProducts}
            isFilterSelected={isFilterSelected}
            loading={searchLoading}
            error={searchError}
            maxSuggestions={5}
          />
        </Paper>
      </DialogContent>
    </Dialog>
  );
};

export default SearchModal;