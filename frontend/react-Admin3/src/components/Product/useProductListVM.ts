/**
 * ProductList ViewModel
 *
 * Encapsulates all Redux state, dispatch actions, context hooks,
 * service calls, and derived data for the ProductList component.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTheme, useMediaQuery } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useCart } from '../../contexts/CartContext';
import useProductsSearch from '../../hooks/useProductsSearch';
import useProductCardHelpers from '../../hooks/useProductCardHelpers';
import rulesEngineService from '../../services/rulesEngineService';

// Redux imports
import {
    selectFilters,
    selectSearchQuery,
    selectCurrentPage,
    selectIsLoading,
    selectError,
    setSearchQuery,
    setSubjects,
    setCategories,
    setProductTypes,
    setProducts,
    setModesOfDelivery,
    resetFilters,
    setCurrentPage,
    clearError
} from '../../store/slices/filtersSlice.js';
import { parseUrlToFilters } from '../../store/middleware/urlSyncMiddleware.js';

import type {
    BrowseProduct,
    SearchPagination,
    InlineRulesMessage,
    MarkingDeadline,
} from '../../types/browse/browse.types';

// ─── Type for parsed URL filters ────────────────────────────────

interface ParsedUrlFilters {
    subjects?: string[];
    categories?: string[];
    product_types?: string[];
    products?: string[];
    modes_of_delivery?: string[];
    searchQuery?: string;
    [key: string]: unknown;
}

// ─── ViewModel Interface ────────────────────────────────────────

export interface ProductListVM {
    // UI State
    isMobile: boolean;
    isSearchMode: boolean;

    // Data
    products: BrowseProduct[];
    pagination: SearchPagination;
    allEsspIds: number[];
    bulkDeadlines: Record<number | string, MarkingDeadline[]>;
    vatCalculations: any;

    // Loading / Error
    isLoading: boolean;
    searchLoading: boolean;
    error: string | null;
    searchError: string | null;

    // Rules Engine
    rulesMessages: InlineRulesMessage[];
    rulesLoading: boolean;

    // Filters
    searchQuery: string;

    // Handlers
    handleSearch: (query: string) => void;
    handleAddToCart: (product: BrowseProduct, selectedVariation?: any) => Promise<void>;
    handleLoadMore: () => void;
    clearSearch: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────

const useProductListVM = (): ProductListVM => {
    const theme: Theme = useTheme();
    const isMobile: boolean = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // Context hooks
    const { addToCart, cartData } = useCart();

    // Redux state
    const filters = useSelector(selectFilters);
    const searchQuery = useSelector(selectSearchQuery) as string;
    const currentPage = useSelector(selectCurrentPage) as number;
    const isLoading = useSelector(selectIsLoading) as boolean;
    const error = useSelector(selectError) as string | null;

    // Custom hooks - these return untyped JS objects, cast as needed
    const searchResult: any = useProductsSearch({ autoSearch: true });
    const products: BrowseProduct[] = searchResult.products ?? [];
    const pagination: SearchPagination = searchResult.pagination ?? {
        page: 1, page_size: 20, total_count: 0, has_next: false, has_previous: false
    };
    const searchLoading: boolean = searchResult.isLoading ?? false;
    const searchError: string | null = searchResult.error ?? null;

    const cardHelpers: any = useProductCardHelpers(products);
    const allEsspIds: number[] = cardHelpers.allEsspIds ?? [];
    const bulkDeadlines: Record<number | string, MarkingDeadline[]> = cardHelpers.bulkDeadlines ?? {};

    // Rules engine state for delivery messages
    const [rulesMessages, setRulesMessages] = useState<InlineRulesMessage[]>([]);
    const [rulesLoading, setRulesLoading] = useState<boolean>(false);

    /**
     * Restore filters from URL on component mount (Story 1.6)
     * Uses parseUrlToFilters() to convert URL params -> Redux state
     */
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const filtersFromUrl = parseUrlToFilters(searchParams) as ParsedUrlFilters;

        // Dispatch each filter type to Redux
        if (filtersFromUrl.subjects && filtersFromUrl.subjects.length > 0) {
            dispatch(setSubjects(filtersFromUrl.subjects));
        }
        if (filtersFromUrl.categories && filtersFromUrl.categories.length > 0) {
            dispatch(setCategories(filtersFromUrl.categories));
        }
        if (filtersFromUrl.product_types && filtersFromUrl.product_types.length > 0) {
            dispatch(setProductTypes(filtersFromUrl.product_types));
        }
        if (filtersFromUrl.products && filtersFromUrl.products.length > 0) {
            dispatch(setProducts(filtersFromUrl.products));
        }
        if (filtersFromUrl.modes_of_delivery && filtersFromUrl.modes_of_delivery.length > 0) {
            dispatch(setModesOfDelivery(filtersFromUrl.modes_of_delivery));
        }
        if (filtersFromUrl.searchQuery) {
            dispatch(setSearchQuery(filtersFromUrl.searchQuery));
        }
    }, []); // Run once on mount

    /**
     * Listen to browser back/forward navigation (Story 1.1 - Browser History)
     * When user clicks back/forward, update Redux state from URL
     */
    useEffect(() => {
        const handlePopState = () => {
            // Parse URL and update Redux state
            const searchParams = new URLSearchParams(window.location.search);
            const filtersFromUrl = parseUrlToFilters(searchParams) as ParsedUrlFilters;

            // Clear existing filters first to ensure clean state
            dispatch(resetFilters());

            // Dispatch each filter type to Redux
            if (filtersFromUrl.subjects && filtersFromUrl.subjects.length > 0) {
                dispatch(setSubjects(filtersFromUrl.subjects));
            }
            if (filtersFromUrl.categories && filtersFromUrl.categories.length > 0) {
                dispatch(setCategories(filtersFromUrl.categories));
            }
            if (filtersFromUrl.product_types && filtersFromUrl.product_types.length > 0) {
                dispatch(setProductTypes(filtersFromUrl.product_types));
            }
            if (filtersFromUrl.products && filtersFromUrl.products.length > 0) {
                dispatch(setProducts(filtersFromUrl.products));
            }
            if (filtersFromUrl.modes_of_delivery && filtersFromUrl.modes_of_delivery.length > 0) {
                dispatch(setModesOfDelivery(filtersFromUrl.modes_of_delivery));
            }
            if (filtersFromUrl.searchQuery) {
                dispatch(setSearchQuery(filtersFromUrl.searchQuery));
            }
        };

        // Listen to popstate event (browser back/forward)
        window.addEventListener('popstate', handlePopState);

        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [dispatch]);

    /**
     * Determine if we're in search mode
     */
    const isSearchMode = useMemo((): boolean => {
        return Boolean(searchQuery);
    }, [searchQuery]);

    /**
     * Handle search functionality
     */
    const handleSearch = useCallback((query: string) => {
        dispatch(setSearchQuery(query));
        dispatch(setCurrentPage(1)); // Reset to first page on search
    }, [dispatch]);

    /**
     * Handle add to cart
     */
    const handleAddToCart = useCallback(async (product: BrowseProduct, selectedVariation: any = null) => {
        try {
            await addToCart(product, selectedVariation);
        } catch (err) {
            console.error('Failed to add product to cart:', err);
        }
    }, [addToCart]);

    /**
     * Handle load more products (pagination)
     */
    const handleLoadMore = useCallback(() => {
        if (pagination?.has_next && !isLoading && !searchLoading) {
            dispatch(setCurrentPage(currentPage + 1));
        }
    }, [pagination, isLoading, searchLoading, currentPage, dispatch]);

    /**
     * Clear search and return to products listing
     */
    const clearSearch = useCallback(() => {
        dispatch(setSearchQuery(''));
        dispatch(resetFilters());
        navigate('/products', { replace: true });
    }, [dispatch, navigate]);

    /**
     * Clear any errors on component mount
     */
    useEffect(() => {
        dispatch(clearError());
    }, [dispatch]);

    /**
     * Execute product_list_mount rules when component mounts
     */
    useEffect(() => {
        const executeRules = async () => {
            setRulesLoading(true);
            setRulesMessages([]); // Clear previous messages

            try {
                // Create context for product list
                const context = {
                    page: {
                        name: 'product_list',
                        path: '/products'
                    },
                    products: {
                        count: products?.length || 0
                    }
                };

                // Execute rules directly using the rulesEngineService
                const result = await rulesEngineService.executeRules(
                    rulesEngineService.ENTRY_POINTS.PRODUCT_LIST_MOUNT,
                    context
                );

                if (result.success && result.messages?.length > 0) {
                    // Process messages for display - filter out modal messages for inline display
                    const inlineMessages: InlineRulesMessage[] = result.messages
                        .filter((msg: any) => msg.display_type !== 'modal')
                        .map((msg: any) => ({
                            ...msg,
                            // Normalize message structure for consistent display
                            title: msg.title || msg.content?.title || 'Notice',
                            message: msg.content?.message || msg.content || 'No content',
                            variant: msg.message_type || msg.content?.variant || 'info',
                            dismissible: msg.content?.dismissible !== false
                        }));

                    setRulesMessages(inlineMessages);
                }

                // Handle any processing errors
                if (!result.success && result.error) {
                    console.error('Rules processing error:', result.error);
                    if ((import.meta as any).env?.DEV) {
                        // Show error in development
                        setRulesMessages([{
                            title: 'Development Error',
                            message: `Rules engine error: ${result.error}`,
                            variant: 'error',
                            dismissible: true
                        }]);
                    }
                }
            } catch (err: any) {
                console.error('Error executing product_list_mount rules:', err);

                // Handle schema validation errors specifically
                if (err.name === 'SchemaValidationError') {
                    console.error('Schema validation failed for rules engine:', err.details);
                    console.error('Schema errors:', err.schemaErrors);
                    // For development, show schema validation errors to help debugging
                    if ((import.meta as any).env?.DEV) {
                        setRulesMessages([{
                            title: 'Development Error',
                            message: `Schema validation failed - ${err.details}`,
                            variant: 'error',
                            dismissible: true
                        }]);
                    }
                }
                // Don't show other rule engine errors to user - shouldn't block product list
            } finally {
                setRulesLoading(false);
            }
        };

        executeRules();
    }, [products]); // Re-run when products change to update context

    return {
        isMobile,
        isSearchMode,
        products,
        pagination,
        allEsspIds,
        bulkDeadlines,
        vatCalculations: cartData?.vat_calculations,
        isLoading,
        searchLoading,
        error,
        searchError,
        rulesMessages,
        rulesLoading,
        searchQuery,
        handleSearch,
        handleAddToCart,
        handleLoadMore,
        clearSearch,
    };
};

export default useProductListVM;
