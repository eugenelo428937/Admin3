/**
 * ActiveFilters Component
 *
 * Displays active filters as removable pills/chips.
 * Provides visual feedback for current filter state and easy filter removal.
 * Integrates with Redux store for filter management.
 *
 * **Filter Types Supported:**
 * - Array filters: Subjects, Categories, Product Types, Products, Modes of Delivery
 *
 * @component
 * @example
 * // Basic usage
 * <ActiveFilters />
 *
 * // With custom variants
 * <ActiveFilters variant="compact" showClearAll={true} />
 */

import React, { useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Box,
    Chip,
    Typography,
    Button,
    Stack,
    Divider,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    Clear as ClearIcon,
    FilterList as FilterListIcon
} from '@mui/icons-material';
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

/**
 * Map filter types to their Redux removal actions
 * NOTE: FilterRegistry provides metadata (labels, colors), but Redux actions must be hardcoded
 */
const FILTER_REMOVAL_ACTIONS = {
    subjects: removeSubjectFilter,
    categories: removeCategoryFilter,
    product_types: removeProductTypeFilter,
    products: removeProductFilter,
    modes_of_delivery: removeModeOfDeliveryFilter,
};

const ActiveFilters = ({ 
    showCount = true,
    showClearAll = true,
    maxChipsToShow = 10,
    variant = 'default' // 'default' | 'compact' | 'minimal'
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const dispatch = useDispatch();
    
    // Redux state
    const filters = useSelector(selectFilters);
    const filterCounts = useSelector(selectFilterCounts);
    const activeFilterCount = useSelector(selectActiveFilterCount);
    const searchQuery = useSelector(selectSearchQuery);

    /**
     * Handle removing a specific filter value
     */
    const handleRemoveFilter = useCallback((filterType, value) => {
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
    const getDisplayLabel = useCallback((filterType, value, counts) => {
        // Debug logging for products filter
        if (filterType === 'products') {
            console.log('[ActiveFilters] Getting display label for product:', {
                value,
                counts,
                productsCount: counts?.products,
                fullCounts: counts
            });
        }

        // Try to get a human-readable label from counts data
        if (counts && counts[filterType] && counts[filterType][value]) {
            const filterData = counts[filterType][value];

            // Handle the new backend structure: { count: number, name: string, display_name?: string }
            if (typeof filterData === 'object' && filterData !== null) {
                // Prioritize display_name over name for better UI presentation
                return filterData.display_name || filterData.name || filterData.label || value;
            }
        }

        // Fallback: just return the value as-is
        // This handles cases where filter was set but counts haven't loaded yet
        return value;
    }, []);

    /**
     * Generate array of active filter chips using FilterRegistry
     */
    const activeFilterChips = useMemo(() => {
        const chips = [];

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
                isSearchQuery: true // Special flag for search query
            });
        }

        // Iterate through all registered filters (sorted by order)
        const registeredFilters = FilterRegistry.getAll();

        registeredFilters.forEach((config) => {
            const filterType = config.type;
            const values = filters[filterType];

            // Skip searchQuery (already handled above) and non-array values
            if (filterType === 'searchQuery' || !Array.isArray(values) || values.length === 0) {
                return;
            }

            values.forEach((value, index) => {
                // Limit number of chips shown
                if (chips.length >= maxChipsToShow) return;

                // Use FilterRegistry's getDisplayValue or fallback to getDisplayLabel
                const displayLabel = config.getDisplayValue
                    ? config.getDisplayValue(value, filterCounts[filterType])
                    : getDisplayLabel(filterType, value, filterCounts);

                const chipKey = `${filterType}-${value}-${index}`;

                chips.push({
                    key: chipKey,
                    filterType,
                    value,
                    label: `${config.label}: ${displayLabel}`, // Full format for chip display
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
    const remainingChipsCount = useMemo(() => {
        const totalChips = Object.values(filters).reduce((total, values) => {
            return total + (Array.isArray(values) ? values.length : 0);
        }, 0);
        
        return Math.max(0, totalChips - maxChipsToShow);
    }, [filters, maxChipsToShow]);

    // Don't render if no active filters
    if (activeFilterCount === 0) {
        return null;
    }

    /**
     * Render compact variant
     */
    if (variant === 'compact') {
        return (
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                flexWrap: 'wrap'
            }}>
                <FilterListIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                    {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
                </Typography>
                {showClearAll && (
                    <Button
                        size="small"
                        startIcon={<ClearIcon />}
                        onClick={handleClearAll}
                        sx={{ minWidth: 'auto', ml: 1 }}
                    >
                        Clear
                    </Button>
                )}
            </Box>
        );
    }

    /**
     * Render minimal variant (just chip count)
     */
    if (variant === 'minimal') {
        return (
            <Chip
                icon={<FilterListIcon />}
                label={`${activeFilterCount} active`}
                onClick={showClearAll ? handleClearAll : undefined}
                onDelete={showClearAll ? handleClearAll : undefined}
                size="small"
                variant="outlined"
                deleteIcon={<ClearIcon />}
            />
        );
    }

    /**
     * Render default variant (full chip display)
     */
    return (
        <Box sx={{ mb: 0 }}>
            {/* Header */}
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: 1
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterListIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                        {showCount && `${activeFilterCount} `}
                        Active Filter{activeFilterCount > 1 ? 's' : ''}
                    </Typography>
                </Box>
                
                {showClearAll && activeFilterCount > 0 && (
                    <Button
                        size="small"
                        startIcon={<ClearIcon />}
                        onClick={handleClearAll}
                        color="error"
                        sx={{ minWidth: 'auto' }}
                    >
                        Clear All
                    </Button>
                )}
            </Box>

            {/* Filter Chips */}
            <Stack 
                direction="row" 
                spacing={1} 
                sx={{ 
                    flexWrap: 'wrap',
                    gap: 1,
                    '& > *': {
                        marginBottom: 1
                    }
                }}
            >
                {activeFilterChips.map((chip) => (
                    <Chip
                        key={chip.key}
                        label={chip.label}
                        onDelete={chip.isSearchQuery ? handleClearSearchQuery : () => handleRemoveFilter(chip.filterType, chip.value)}
                        deleteIcon={<ClearIcon />}
                        color={chip.color}
                        variant="outlined"
                        size={isMobile ? "small" : "medium"}
                        sx={{
                            maxWidth: isMobile ? 120 : 300,
                            '& .MuiChip-label': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }
                        }}
                    />
                ))}
                
                {/* Show remaining count if we've hit the limit */}
                {remainingChipsCount > 0 && (
                    <Chip
                        label={`+${remainingChipsCount} more`}
                        variant="outlined"
                        size="small"
                        sx={{ 
                            color: 'text.secondary',
                            borderColor: 'text.secondary'
                        }}
                    />
                )}
            </Stack>

            {/* Optional divider */}
            <Divider sx={{ mt: 1 }} />
        </Box>
    );
};

export default ActiveFilters;