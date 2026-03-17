/**
 * FilterPanel ViewModel
 *
 * Encapsulates all Redux state, dispatch actions, local state,
 * and derived data for the FilterPanel component.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMediaQuery, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import {
    selectFilters,
    selectFilterCounts,
    selectValidationErrors,
    toggleSubjectFilter,
    toggleCategoryFilter,
    toggleProductTypeFilter,
    toggleProductFilter,
    toggleModeOfDeliveryFilter,
    clearAllFilters,
    clearFilterType,
    clearValidationErrors
} from '../../store/slices/filtersSlice.js';
import { FilterRegistry } from '../../store/filters/filterRegistry.js';
import type {
    FilterPanelProps,
    FilterState,
    FilterCountsMap,
    ValidationError,
    FilterCountData,
} from '../../types/browse/browse.types';

// ─── Deep equality helper ───────────────────────────────────────

const deepEqual = (obj1: unknown, obj2: unknown): boolean => {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;

    const keys1 = Object.keys(obj1 as Record<string, unknown>);
    const keys2 = Object.keys(obj2 as Record<string, unknown>);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!deepEqual((obj1 as Record<string, unknown>)[key], (obj2 as Record<string, unknown>)[key])) return false;
    }

    return true;
};

// ─── Scrollable filter styling configuration ────────────────────

export const SCROLLABLE_FILTER_STYLES = {
    MAX_HEIGHT_DESKTOP: '50vh',
    MAX_HEIGHT_MOBILE: '40vh',
    OVERFLOW_Y: 'auto' as const,
    SCROLL_BEHAVIOR: {
        behavior: 'smooth' as ScrollBehavior,
        block: 'nearest' as ScrollLogicalPosition,
        inline: 'nearest' as ScrollLogicalPosition,
    }
};

// ─── Expanded Panels State ──────────────────────────────────────

export interface ExpandedPanelsState {
    subjects: boolean;
    categories: boolean;
    product_types: boolean;
    products: boolean;
    modes_of_delivery: boolean;
    [key: string]: boolean;
}

// ─── Filter Section Data ────────────────────────────────────────

export interface FilterSectionData {
    title: string;
    filterType: string;
    options: Record<string, FilterCountData | number>;
    counts: Record<string, FilterCountData | number>;
    activeValues: string[];
    hasActiveFilters: boolean;
}

// ─── Filter Config from Registry ────────────────────────────────

export interface FilterConfig {
    type: string;
    label: string;
    pluralLabel: string;
    color: string;
    [key: string]: unknown;
}

// ─── ViewModel Interface ────────────────────────────────────────

export interface FilterPanelVM {
    // State
    isMobile: boolean;
    isLoading: boolean;
    error: string | null;
    filters: Record<string, string[]>;
    filterCounts: FilterCountsMap;
    validationErrors: ValidationError[];
    expandedPanels: ExpandedPanelsState;
    drawerOpen: boolean;
    totalActiveFilters: number;
    registeredFilters: FilterConfig[];

    // Actions
    handlePanelChange: (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
    handleFilterChange: (filterType: string, value: string) => void;
    handleClearAllFilters: () => void;
    handleClearFilterType: (filterType: string) => void;
    handleDismissValidationErrors: () => void;
    setDrawerOpen: (open: boolean) => void;

    // Filter section data helpers
    getFilterSectionData: (filterType: string, title: string) => FilterSectionData;
}

// ─── Root State (minimal) ───────────────────────────────────────

interface RootState {
    filters: FilterState;
}

// ─── Hook ───────────────────────────────────────────────────────

const useFilterPanelVM = (props: FilterPanelProps): FilterPanelVM => {
    const theme: Theme = useTheme();
    const isMobile: boolean = useMediaQuery(theme.breakpoints.down('md'));
    const dispatch = useDispatch();

    // Redux state - use deep equality check to prevent unnecessary re-renders
    const filters = useSelector(selectFilters, deepEqual) as Record<string, string[]>;
    const filterCounts = useSelector(selectFilterCounts, deepEqual) as FilterCountsMap;
    const validationErrors = useSelector(selectValidationErrors) as ValidationError[];
    const isLoading = useSelector((state: RootState) => state.filters.isLoading) as boolean;
    const error = useSelector((state: RootState) => state.filters.error) as string | null;

    // Local state - persist expanded panels across remounts (React.StrictMode issue)
    const [expandedPanels, setExpandedPanels] = useState<ExpandedPanelsState>(() => {
        // Try to restore from sessionStorage
        try {
            const saved = sessionStorage.getItem('filterPanelExpandedState');
            if (saved) {
                return JSON.parse(saved) as ExpandedPanelsState;
            }
        } catch (e) {
            console.warn('Failed to restore filter panel state:', e);
        }
        // Default state
        return {
            subjects: true,
            categories: false,
            product_types: false,
            products: false,
            modes_of_delivery: false
        };
    });
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

    // Persist expanded panels state to sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem('filterPanelExpandedState', JSON.stringify(expandedPanels));
        } catch (e) {
            console.warn('Failed to save filter panel state:', e);
        }
    }, [expandedPanels]);

    /**
     * Handle accordion panel expansion
     */
    const handlePanelChange = useCallback((panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpandedPanels(prev => ({
            ...prev,
            [panel]: isExpanded
        }));
    }, []);

    /**
     * Handle filter selection
     */
    const handleFilterChange = useCallback((filterType: string, value: string) => {
        switch (filterType) {
            case 'subjects':
                dispatch(toggleSubjectFilter(value));
                break;
            case 'categories':
                dispatch(toggleCategoryFilter(value));
                break;
            case 'product_types':
                dispatch(toggleProductTypeFilter(value));
                break;
            case 'products':
                dispatch(toggleProductFilter(value));
                break;
            case 'modes_of_delivery':
                dispatch(toggleModeOfDeliveryFilter(value));
                break;
            default:
                break;
        }
    }, [dispatch]);

    /**
     * Clear all filters
     */
    const handleClearAllFilters = useCallback(() => {
        dispatch(clearAllFilters());
    }, [dispatch]);

    /**
     * Clear specific filter type
     */
    const handleClearFilterType = useCallback((filterType: string) => {
        dispatch(clearFilterType(filterType));
    }, [dispatch]);

    /**
     * Dismiss validation errors
     */
    const handleDismissValidationErrors = useCallback(() => {
        dispatch(clearValidationErrors());
    }, [dispatch]);

    /**
     * Calculate total active filter count
     */
    const totalActiveFilters = useMemo((): number => {
        return Object.values(filters).reduce((total: number, filterArray) => {
            return total + (Array.isArray(filterArray) ? filterArray.length : 0);
        }, 0);
    }, [filters]);

    /**
     * Get all registered filters from registry
     */
    const registeredFilters = useMemo((): FilterConfig[] => {
        return FilterRegistry.getAll() as FilterConfig[];
    }, []);

    /**
     * Get filter section data for a given filter type
     */
    const getFilterSectionData = useCallback((filterType: string, title: string): FilterSectionData => {
        const activeValues = (filters[filterType] || []) as string[];
        const options = (filterCounts[filterType] || {}) as Record<string, FilterCountData | number>;
        return {
            title,
            filterType,
            options,
            counts: options,
            activeValues,
            hasActiveFilters: activeValues.length > 0,
        };
    }, [filters, filterCounts]);

    return {
        isMobile,
        isLoading,
        error,
        filters,
        filterCounts,
        validationErrors,
        expandedPanels,
        drawerOpen,
        totalActiveFilters,
        registeredFilters,
        handlePanelChange,
        handleFilterChange,
        handleClearAllFilters,
        handleClearFilterType,
        handleDismissValidationErrors,
        setDrawerOpen,
        getFilterSectionData,
    };
};

export default useFilterPanelVM;
