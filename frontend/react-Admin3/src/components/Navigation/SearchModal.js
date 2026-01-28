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

  // Only UI state (search results display)
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
  const handleCloseSearchModal = useCallback(() => {
    onClose();
    // Reset UI state after a brief delay to avoid visual glitches
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
  const handleSearchResults = (results) => {
    setSearchResults(results);
    setSearchError(null);
  };

  // Navigate to products page (product IDs already set by SearchBox.performSearch)
  const handleShowMatchingProducts = () => {
    // Product IDs are already in Redux (set by SearchBox.performSearch)
    // Just close modal and navigate - don't overwrite the IDs

    // Close modal and navigate to products page
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
          background: 'grey.300',
          color: 'text.secondary',
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
          onClick={handleCloseSearchModal}
          aria-label="close"
          sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          backgroundColor: 'grey.100',
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
            backgroundColor: 'transparent',
          }}
          className="search-results-container">
          <SearchResults
            searchResults={searchResults}
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