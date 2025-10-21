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
import { useSelector } from 'react-redux';
import {
  selectFilters,
  selectSearchQuery,
} from '../../store/slices/filtersSlice';
import SearchBox from '../SearchBox';
import SearchResults from '../SearchResults';

const SearchModal = ({ open, onClose }) => {
  const navigate = useNavigate();

  // T024: Read filter state from Redux instead of local state
  const filters = useSelector(selectFilters);
  const searchQuery = useSelector(selectSearchQuery);

  // T023: Only UI state remains local (not filter data)
  const [searchResults, setSearchResults] = useState(null);
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

  // Handle closing the search modal
  // T023: Don't clear Redux filter state - filters persist across modal lifecycle
  const handleCloseSearchModal = useCallback(() => {
    onClose();
    // Reset only UI state after a brief delay to avoid visual glitches
    setTimeout(() => {
      setSearchResults(null);
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
  // T023: Don't track searchQuery locally - it's already in Redux via SearchBox
  const handleSearchResults = (results) => {
    setSearchResults(results);
    setSearchError(null);
  };

  // T025: Filter management logic removed
  // SearchBox now manages all filter state via Redux
  // No need for handleFilterSelect, isFilterSelected, handleFilterRemove

  // T026: Simplified navigation - filters already in Redux from SearchBox
  const handleShowMatchingProducts = () => {
    // Close modal and navigate to products page
    // Filters are already in Redux (updated by SearchBox)
    // URL sync middleware automatically updates URL
    handleCloseSearchModal();
    navigate('/products');
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
        
        <SearchBox
          onSearchResults={handleSearchResults}
          onShowMatchingProducts={handleShowMatchingProducts}
          autoFocus={true}
          placeholder="Search for products, subjects, categories..."
        />
        
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
            selectedFilters={filters}
            onShowMatchingProducts={handleShowMatchingProducts}
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