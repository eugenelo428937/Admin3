/**
 * ActiveFilters Component
 * 
 * Displays active filters as removable pills/chips.
 * Provides visual feedback for current filter state and easy filter removal.
 * Integrates with Redux store for filter management.
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
    removeSubjectFilter,
    removeCategoryFilter,
    removeProductTypeFilter,
    removeProductFilter,
    removeModeOfDeliveryFilter,
    clearAllFilters,
    clearFilterType
} from '../../store/slices/filtersSlice';

/**
 * Filter type configuration for display names and actions
 */
const FILTER_CONFIG = {
    subjects: {
        label: 'Subject',
        pluralLabel: 'Subjects',
        removeAction: removeSubjectFilter,
        color: 'primary'
    },
    categories: {
        label: 'Category',
        pluralLabel: 'Categories', 
        removeAction: removeCategoryFilter,
        color: 'secondary'
    },
    productTypes: {
        label: 'Product Type',
        pluralLabel: 'Product Types',
        removeAction: removeProductTypeFilter,
        color: 'info'
    },
    products: {
        label: 'Product',
        pluralLabel: 'Products',
        removeAction: removeProductFilter,
        color: 'success'
    },
    modesOfDelivery: {
        label: 'Delivery',
        pluralLabel: 'Delivery Modes',
        removeAction: removeModeOfDeliveryFilter,
        color: 'warning'
    }
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

    /**
     * Handle removing a specific filter value
     */
    const handleRemoveFilter = useCallback((filterType, value) => {
        const config = FILTER_CONFIG[filterType];
        if (config) {
            dispatch(config.removeAction(value));
        }
    }, [dispatch]);

    /**
     * Handle clearing all filters
     */
    const handleClearAll = useCallback(() => {
        dispatch(clearAllFilters());
    }, [dispatch]);

    /**
     * Handle clearing a specific filter type
     */
    const handleClearFilterType = useCallback((filterType) => {
        dispatch(clearFilterType(filterType));
    }, [dispatch]);

    /**
     * Get display label for a filter value
     */
    const getDisplayLabel = useCallback((filterType, value, counts) => {
        // Try to get a human-readable label from counts data
        if (counts && counts[filterType] && typeof counts[filterType][value] === 'object') {
            return counts[filterType][value].label || value;
        }
        
        // For subjects, try to get shortname or use the code
        if (filterType === 'subjects' && counts && counts.subjects && counts.subjects[value]) {
            return value; // Subject codes are usually already human readable
        }
        
        // Default to the value itself
        return value;
    }, []);

    /**
     * Generate array of active filter chips
     */
    const activeFilterChips = useMemo(() => {
        const chips = [];
        
        Object.entries(filters).forEach(([filterType, values]) => {
            if (Array.isArray(values) && values.length > 0) {
                const config = FILTER_CONFIG[filterType];
                if (!config) return;
                
                values.forEach((value, index) => {
                    // Limit number of chips shown
                    if (chips.length >= maxChipsToShow) return;
                    
                    const displayLabel = getDisplayLabel(filterType, value, filterCounts);
                    const chipKey = `${filterType}-${value}-${index}`;
                    
                    chips.push({
                        key: chipKey,
                        filterType,
                        value,
                        label: displayLabel,
                        typeLabel: config.label,
                        color: config.color,
                        fullLabel: `${config.label}: ${displayLabel}`
                    });
                });
            }
        });
        
        return chips;
    }, [filters, filterCounts, maxChipsToShow, getDisplayLabel]);

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
        <Box sx={{ mb: 2 }}>
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
                        label={isMobile ? chip.label : chip.fullLabel}
                        onDelete={() => handleRemoveFilter(chip.filterType, chip.value)}
                        deleteIcon={<ClearIcon />}
                        color={chip.color}
                        variant="outlined"
                        size={isMobile ? "small" : "medium"}
                        sx={{
                            maxWidth: isMobile ? 120 : 200,
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
            <Divider sx={{ mt: 2 }} />
        </Box>
    );
};

export default ActiveFilters;