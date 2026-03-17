import React from 'react';
import { TextField, Alert, CircularProgress, Box, InputAdornment } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { searchBoxContainerStyles, searchInputStyles } from '../theme/styles';
import useSearchBoxVM from './useSearchBoxVM';

interface SearchBoxProps {
    onSearchResults?: (results: any, query: string) => void;
    onShowMatchingProducts?: () => void;
    placeholder?: string;
    autoFocus?: boolean;
}

const SearchBox: React.FC<SearchBoxProps> = ({
    onSearchResults,
    onShowMatchingProducts,
    placeholder = 'Search for products, subjects, categories...',
    autoFocus = false,
}) => {
    const vm = useSearchBoxVM({ onSearchResults, onShowMatchingProducts, autoFocus });

    return (
        <Box
            sx={{
                ...searchBoxContainerStyles,
                paddingLeft: vm.theme.liftkit?.spacing?.lg || 3,
                paddingRight: vm.theme.liftkit?.spacing?.lg || 3,
            }}
        >
            <Box>
                <TextField
                    inputRef={vm.searchInputRef}
                    type="text"
                    placeholder={placeholder}
                    value={vm.searchQuery}
                    onChange={vm.handleSearchChange}
                    onKeyDown={vm.handleKeyDown}
                    fullWidth
                    variant="outlined"
                    size="small"
                    color="white"
                    sx={{
                        ...searchInputStyles,
                        marginTop: vm.theme.liftkit?.spacing?.lg || 3,
                    }}
                    slotProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                        endAdornment: vm.loading && (
                            <InputAdornment position="end">
                                <CircularProgress size={20} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>
            {vm.error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {vm.error}
                </Alert>
            )}
        </Box>
    );
};

export default SearchBox;
