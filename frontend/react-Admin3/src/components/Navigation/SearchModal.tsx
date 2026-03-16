import React from 'react';
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
import SearchBox from '../SearchBox.js';
import SearchResults from '../SearchResults.js';
import useSearchModalVM from './useSearchModalVM.ts';
import type { SearchModalProps } from '../../types/navigation';

const SearchModal: React.FC<SearchModalProps> = ({ open, onClose }) => {
  const vm = useSearchModalVM(open, onClose);

  return (
    <Dialog
      open={open}
      onClose={vm.handleCloseSearchModal}
      aria-labelledby="search-modal-title"
      aria-describedby="search-modal-description"
      maxWidth="lg"
      fullWidth
      className="search-modal"
      elevation={2 as any}
      disableEscapeKeyDown={false}
      keepMounted={false}>
      <DialogTitle
        id="search-modal-title"
        sx={{
          background: 'grey.300',
          color: 'text.secondary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingY: 2,
          paddingX: 3,
        }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
          onClick={vm.handleCloseSearchModal}
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
          onSearchResults={vm.handleSearchResults}
          onShowMatchingProducts={vm.handleShowMatchingProducts}
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
            searchResults={vm.searchResults}
            onShowMatchingProducts={vm.handleShowMatchingProducts}
            loading={vm.searchLoading}
            error={vm.searchError}
            maxSuggestions={5}
          />
        </Paper>
      </DialogContent>
    </Dialog>
  );
};

export default SearchModal;
