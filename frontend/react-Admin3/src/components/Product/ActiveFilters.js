/**
 * ActiveFilters Component
 *
 * Displays active filters as removable pills/chips.
 * Provides visual feedback for current filter state and easy filter removal.
 * Integrates with Redux store for filter management.
 *
 * **Filter Types Supported:**
 * - Array filters: Subjects, Categories, Product Types, Products, Modes of Delivery
 * - Navbar filters (Story 1.8):
 *   - tutorial_format: Single-value filter ('online', 'in_person', 'hybrid')
 *   - distance_learning: Boolean filter
 *   - tutorial: Boolean filter
 *
 * **Redux Integration:**
 * - Dispatches removal actions:
 *   - setTutorialFormat(null) - clears tutorial format
 *   - setDistanceLearning(false) - clears distance learning
 *   - setTutorial(false) - clears tutorial filter
 * - Reads state from: state.filters.tutorial_format, distance_learning, tutorial
 * - Depends on Story 1.2 Redux state structure
 *
 * **FILTER_CONFIG:**
 * - tutorial_format: Uses getDisplayValue() to map values to labels (Online/In-Person/Hybrid)
 * - distance_learning, tutorial: Display constant labels (not value-dependent)
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
    removeSubjectFilter,
    removeCategoryFilter,
    removeProductTypeFilter,
    removeProductFilter,
    removeModeOfDeliveryFilter,
    setTutorialFormat,
    setDistanceLearning,
    setTutorial,
    clearAllFilters
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
    product_types: {
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
    modes_of_delivery: {
        label: 'Product Type',
        pluralLabel: 'Product Types',
        removeAction: removeModeOfDeliveryFilter,
        color: 'warning'
    },
    // Navbar filters (Story 1.8)
    tutorial_format: {
        label: 'Tutorial Format',
        getDisplayValue: (value) => {
            const formatLabels = {
                online: 'Online',
                in_person: 'In-Person',
                hybrid: 'Hybrid',
            };
            return formatLabels[value] || value;
        },
        removeAction: setTutorialFormat,
        removeValue: null,
        color: 'secondary'
    },
    distance_learning: {
        label: 'Distance Learning',
        getDisplayValue: () => 'Distance Learning',
        removeAction: setDistanceLearning,
        removeValue: false,
        color: 'secondary'
    },
    tutorial: {
        label: 'Tutorial Products',
        getDisplayValue: () => 'Tutorial Products',
        removeAction: setTutorial,
        removeValue: false,
        color: 'secondary'
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

    // Navbar filter state (Story 1.8)
    const tutorialFormat = useSelector(state => state.filters.tutorial_format);
    const distanceLearning = useSelector(state => state.filters.distance_learning);
    const tutorial = useSelector(state => state.filters.tutorial);

    /**
     * Handle removing a specific filter value
     */
    const handleRemoveFilter = useCallback((filterType, value) => {
        const config = FILTER_CONFIG[filterType];
        if (config) {
            // Navbar filters use removeValue, array filters use the passed value
            const valueToRemove = config.removeValue !== undefined ? config.removeValue : value;
            dispatch(config.removeAction(valueToRemove));
        }
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

        // Handle navbar filters (Story 1.8) - single values, not arrays
        if (tutorialFormat && chips.length < maxChipsToShow) {
            const config = FILTER_CONFIG.tutorial_format;
            chips.push({
                key: 'tutorial_format',
                filterType: 'tutorial_format',
                value: tutorialFormat,
                label: config.getDisplayValue(tutorialFormat),
                typeLabel: config.label,
                color: config.color,
                fullLabel: `${config.label}: ${config.getDisplayValue(tutorialFormat)}`
            });
        }

        if (distanceLearning && chips.length < maxChipsToShow) {
            const config = FILTER_CONFIG.distance_learning;
            chips.push({
                key: 'distance_learning',
                filterType: 'distance_learning',
                value: distanceLearning,
                label: config.getDisplayValue(),
                typeLabel: config.label,
                color: config.color,
                fullLabel: config.label
            });
        }

        if (tutorial && chips.length < maxChipsToShow) {
            const config = FILTER_CONFIG.tutorial;
            chips.push({
                key: 'tutorial',
                filterType: 'tutorial',
                value: tutorial,
                label: config.getDisplayValue(),
                typeLabel: config.label,
                color: config.color,
                fullLabel: config.label
            });
        }

        return chips;
    }, [filters, filterCounts, maxChipsToShow, getDisplayLabel, tutorialFormat, distanceLearning, tutorial]);

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
            <Divider sx={{ mt: 1 }} />
        </Box>
    );
};

export default ActiveFilters;