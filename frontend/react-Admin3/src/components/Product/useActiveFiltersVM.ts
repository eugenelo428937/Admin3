/**
 * ActiveFilters ViewModel
 *
 * Encapsulates all Redux state, dispatch actions, and derived data
 * for the ActiveFilters component.
 */

import { useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme, useMediaQuery } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import {
    selectFilters,
    selectFilterCounts,
    selectActiveFilterCount,
    selectSearchQuery,
    removeSubjectFilter,
    removeCategoryFilter,
    removeProductTypeFilter,
    removeProductFilter,
    removeModeOfDeliveryFilter,
    setSearchQuery,
    setSearchFilterProductIds,
    clearAllFilters
} from '../../store/slices/filtersSlice';
import { FilterRegistry } from '../../store/filters/filterRegistry';
import type {
    ActiveFiltersProps,
    ActiveFilterChip,
    FilterCountsMap,
} from '../../types/browse/browse.types';

// ─── ViewModel Interface ────────────────────────────────────────

export interface ActiveFiltersVM {
    isMobile: boolean;
    activeFilterCount: number;
    activeFilterChips: ActiveFilterChip[];
    remainingChipsCount: number;
    handleRemoveFilter: (filterType: string, value: string) => void;
    handleClearSearchQuery: () => void;
    handleClearAll: () => void;
}

// ─── Filter Removal Actions Map ─────────────────────────────────

type FilterRemovalAction = (value: string) => { type: string; payload: string };

const FILTER_REMOVAL_ACTIONS: Record<string, FilterRemovalAction> = {
    subjects: removeSubjectFilter as FilterRemovalAction,
    categories: removeCategoryFilter as FilterRemovalAction,
    product_types: removeProductTypeFilter as FilterRemovalAction,
    products: removeProductFilter as FilterRemovalAction,
    modes_of_delivery: removeModeOfDeliveryFilter as FilterRemovalAction,
};

// ─── Hook ───────────────────────────────────────────────────────

const useActiveFiltersVM = (props: ActiveFiltersProps): ActiveFiltersVM => {
    const {
        maxChipsToShow = 10,
    } = props;

    const theme: Theme = useTheme();
    const isMobile: boolean = useMediaQuery(theme.breakpoints.down('sm'));
    const dispatch = useDispatch();

    // Redux state
    const filters = useSelector(selectFilters) as Record<string, string[] | string>;
    const filterCounts = useSelector(selectFilterCounts) as FilterCountsMap;
    const activeFilterCount = useSelector(selectActiveFilterCount) as number;
    const searchQuery = useSelector(selectSearchQuery) as string;

    /**
     * Handle removing a specific filter value
     */
    const handleRemoveFilter = useCallback((filterType: string, value: string) => {
        const removeAction = FILTER_REMOVAL_ACTIONS[filterType];
        if (removeAction) {
            dispatch(removeAction(value));
        }
    }, [dispatch]);

    /**
     * Handle clearing search query filter
     */
    const handleClearSearchQuery = useCallback(() => {
        dispatch(setSearchQuery(''));
        dispatch(setSearchFilterProductIds([]));
    }, [dispatch]);

    /**
     * Handle clearing all filters
     */
    const handleClearAll = useCallback(() => {
        dispatch(clearAllFilters());
    }, [dispatch]);

    /**
     * Get display label for a filter value
     */
    const getDisplayLabel = useCallback((filterType: string, value: string, counts: FilterCountsMap): string => {
        // Try to get a human-readable label from counts data
        if (counts && counts[filterType] && counts[filterType][value]) {
            const filterData = counts[filterType][value];

            // Handle the new backend structure: { count: number, name: string, display_name?: string }
            if (typeof filterData === 'object' && filterData !== null) {
                const fd = filterData as { display_name?: string; name?: string; label?: string };
                return fd.display_name || fd.name || fd.label || value;
            }
        }

        // Fallback: just return the value as-is
        return value;
    }, []);

    /**
     * Generate array of active filter chips using FilterRegistry
     */
    const activeFilterChips = useMemo((): ActiveFilterChip[] => {
        const chips: ActiveFilterChip[] = [];

        // Add search query chip first if present
        if (searchQuery && searchQuery.length >= 3) {
            const searchConfig = FilterRegistry.get('searchQuery');
            chips.push({
                key: 'search-query',
                filterType: 'searchQuery',
                value: searchQuery,
                label: `Search Results for "${searchQuery}"`,
                typeLabel: searchConfig?.label || 'Search',
                color: searchConfig?.color || 'info',
                fullLabel: `${searchConfig?.label || 'Search'}: ${searchQuery}`,
                isSearchQuery: true
            });
        }

        // Iterate through all registered filters (sorted by order)
        const registeredFilters = FilterRegistry.getAll();

        registeredFilters.forEach((config: any) => {
            const filterType: string = config.type;
            const values = filters[filterType];

            // Skip searchQuery (already handled above) and non-array values
            if (filterType === 'searchQuery' || !Array.isArray(values) || values.length === 0) {
                return;
            }

            values.forEach((value: string, index: number) => {
                // Limit number of chips shown
                if (chips.length >= maxChipsToShow) return;

                // Use FilterRegistry's getDisplayValue or fallback to getDisplayLabel
                const displayLabel: string = config.getDisplayValue
                    ? config.getDisplayValue(value, filterCounts[filterType])
                    : getDisplayLabel(filterType, value, filterCounts);

                const chipKey = `${filterType}-${value}-${index}`;

                chips.push({
                    key: chipKey,
                    filterType,
                    value,
                    label: `${config.label}: ${displayLabel}`,
                    typeLabel: config.label,
                    color: config.color,
                    fullLabel: `${config.label}: ${displayLabel}`
                });
            });
        });

        return chips;
    }, [filters, filterCounts, maxChipsToShow, getDisplayLabel, searchQuery]);

    /**
     * Calculate remaining chips count if we're limiting display
     */
    const remainingChipsCount = useMemo((): number => {
        const totalChips = Object.values(filters).reduce((total: number, values) => {
            return total + (Array.isArray(values) ? values.length : 0);
        }, 0);

        return Math.max(0, totalChips - maxChipsToShow);
    }, [filters, maxChipsToShow]);

    return {
        isMobile,
        activeFilterCount,
        activeFilterChips,
        remainingChipsCount,
        handleRemoveFilter,
        handleClearSearchQuery,
        handleClearAll,
    };
};

export default useActiveFiltersVM;
