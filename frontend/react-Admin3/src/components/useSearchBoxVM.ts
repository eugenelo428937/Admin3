import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import searchService from '../services/searchService';
import {
    setSearchQuery as setSearchQueryAction,
    selectSearchQuery,
} from '../store/slices/filtersSlice.js';

interface SearchResults {
    suggested_filters: {
        subjects: any[];
        product_groups: any[];
        variations: any[];
        products: any[];
    };
    suggested_products: any[];
    search_info: { query: string; type: string };
    total_count: number;
}

export interface SearchBoxVM {
    theme: Theme;
    searchQuery: string;
    loading: boolean;
    error: string;
    searchResults: SearchResults | null;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleShowMatchingProducts: () => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface SearchBoxVMProps {
    onSearchResults?: (results: SearchResults | null, query: string) => void;
    onShowMatchingProducts?: () => void;
    autoFocus?: boolean;
}

const useSearchBoxVM = ({
    onSearchResults,
    onShowMatchingProducts,
    autoFocus = false,
}: SearchBoxVMProps): SearchBoxVM => {
    const theme = useTheme();
    const dispatch = useDispatch();
    const searchQuery = useSelector(selectSearchQuery) as string;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (autoFocus && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [autoFocus]);

    const performSearch = useCallback(async (query: string) => {
        try {
            setLoading(true);
            setError('');

            if (!query || query.length < 3) {
                setSearchResults(null);
                if (onSearchResults) onSearchResults(null, query);
                setLoading(false);
                return;
            }

            const results = await searchService.fuzzySearch(query);
            setSearchResults(results);
            if (onSearchResults) onSearchResults(results, query);
        } catch (err) {
            console.error('Search error:', err);
            setError('Search failed. Please try again.');

            const fallbackResults: SearchResults = {
                suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
                suggested_products: [],
                search_info: { query: query || '', type: 'fallback' },
                total_count: 0,
            };
            setSearchResults(fallbackResults);
            if (onSearchResults) onSearchResults(fallbackResults, query);
        } finally {
            setLoading(false);
        }
    }, [onSearchResults]);

    // Reload search results when component mounts with persisted query
    useEffect(() => {
        if (searchQuery && searchQuery.length >= 3) {
            performSearch(searchQuery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        dispatch(setSearchQueryAction(query));

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            performSearch(query);
        }, 300);
    };

    const handleShowMatchingProducts = () => {
        if (onShowMatchingProducts) onShowMatchingProducts();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchResults?.suggested_products?.length > 0) {
                handleShowMatchingProducts();
            }
        }
    };

    return {
        theme,
        searchQuery,
        loading,
        error,
        searchResults,
        searchInputRef,
        handleSearchChange,
        handleShowMatchingProducts,
        handleKeyDown,
    };
};

export default useSearchBoxVM;
