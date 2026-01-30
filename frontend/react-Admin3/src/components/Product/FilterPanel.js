/**
 * FilterPanel Component
 *
 * Handles checkbox and radio interface for product filtering with proper counts.
 * Integrates with Redux store and displays disjunctive facet counts.
 * Replaces complex filtering logic from the original ProductList component.
 *
 * **Features:**
 * - Array-based filters: Subjects, Categories, Product Types, Products, Modes of Delivery
 * - Scrollable filter groups with viewport-relative max-heights (50vh desktop, 40vh mobile)
 * - Keyboard accessibility with auto-scroll on focus
 * - WCAG 2.1 Level AA compliant with ARIA region landmarks
 * - Smooth scrolling with overflow: auto for long filter lists
 *
 * **Accessibility:**
 * - role="region" and aria-label on scrollable filter groups
 * - Keyboard navigation with Tab/Arrow keys
 * - Auto-scroll focused checkboxes into view
 * - Screen reader support for scrollable regions
 *
 * @component
 * @example
 * // In ProductList component
 * <FilterPanel />
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import {
    Box,
    Paper,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Button,
    IconButton,
    Drawer,
    useMediaQuery,
    useTheme,
    Badge,
    Skeleton,
    Alert,
    AlertTitle,
    Stack,
    Divider
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    FilterList as FilterListIcon,
    Clear as ClearIcon,
    Close as CloseIcon
} from '@mui/icons-material';
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
} from '../../store/slices/filtersSlice';
import { FilterRegistry } from '../../store/filters/filterRegistry';

// Deep equality check for objects (simple implementation)
const deepEqual = (obj1, obj2) => {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (let key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
};

/**
 * Scrollable filter styling configuration
 * Viewport-relative max-heights prevent long filter lists from overwhelming the interface
 * Desktop (≥900px): 50vh | Mobile (<900px): 40vh
 */
const SCROLLABLE_FILTER_STYLES = {
    MAX_HEIGHT_DESKTOP: '50vh',
    MAX_HEIGHT_MOBILE: '40vh',
    OVERFLOW_Y: 'auto',
    SCROLL_BEHAVIOR: {
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
    }
};

const FilterPanel = ({
    isSearchMode = false,
    showMobile = false
}) => {

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const dispatch = useDispatch();

    // Redux state - use deep equality check to prevent unnecessary re-renders
    // This prevents re-renders when filterCounts object reference changes but values are the same
    const filters = useSelector(selectFilters, deepEqual);
    const filterCounts = useSelector(selectFilterCounts, deepEqual);
    const validationErrors = useSelector(selectValidationErrors);
    const isLoading = useSelector(state => state.filters.isLoading);
    const error = useSelector(state => state.filters.error);

    // Local state - persist expanded panels across remounts (React.StrictMode issue)
    const [expandedPanels, setExpandedPanels] = useState(() => {
        // Try to restore from sessionStorage
        try {
            const saved = sessionStorage.getItem('filterPanelExpandedState');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to restore filter panel state:', e);
        }
        // Default state
        return {
            subjects: true,
            categories: false,
            product_types: false,  // Match Redux state key format
            products: false,
            modes_of_delivery: false  // Match Redux state key format
        };
    });
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Persist expanded panels state to sessionStorage
    React.useEffect(() => {
        try {
            sessionStorage.setItem('filterPanelExpandedState', JSON.stringify(expandedPanels));
        } catch (e) {
            console.warn('Failed to save filter panel state:', e);
        }
    }, [expandedPanels]);

    /**
     * Handle accordion panel expansion
     */
    const handlePanelChange = useCallback((panel) => (event, isExpanded) => {
        setExpandedPanels(prev => {
            const newState = {
                ...prev,
                [panel]: isExpanded
            };
            return newState;
        });
    }, []);

    /**
     * Handle filter selection
     */
    const handleFilterChange = useCallback((filterType, value) => {
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
    const handleClearFilterType = useCallback((filterType) => {
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
    const totalActiveFilters = useMemo(() => {
        return Object.values(filters).reduce((total, filterArray) => {
            return total + (Array.isArray(filterArray) ? filterArray.length : 0);
        }, 0);
    }, [filters]);

    /**
     * Render filter section with checkboxes
     */
    const renderFilterSection = useCallback((title, filterType, options, counts) => {
        const activeValues = filters[filterType] || [];
        const hasActiveFilters = activeValues.length > 0;
        
        if (isLoading) {
            return (
                <Box sx={{ p: 2 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="rectangular" width="100%" height={120} />
                </Box>
            );
        }

        if (!options || Object.keys(options).length === 0) {
            return null;
        }

        return (
            <Accordion 
                expanded={expandedPanels[filterType]} 
                onChange={handlePanelChange(filterType)}
                sx={{
                    '&:before': { display: 'none' },
                    boxShadow: 'none',
                    backgroundColor: 'transparent'
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                        minHeight: 48,
                        '&.Mui-expanded': {
                            minHeight: 48,
                        }
                    }}
                >
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        width: '100%',
                        mr: 1
                    }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                            {title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {hasActiveFilters && (
                                <Badge badgeContent={activeValues.length} color="primary" />
                            )}
                            {hasActiveFilters && (
                                <Box
                                    component="span"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClearFilterType(filterType);
                                    }}
                                    sx={{ 
                                        p: 0.5,
                                        cursor: 'pointer',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        '&:hover': {
                                            backgroundColor: 'action.hover'
                                        }
                                    }}
                                >
                                    <ClearIcon fontSize="small" />
                                </Box>
                            )}
                        </Box>
                    </Box>
                </AccordionSummary>
                <AccordionDetails
                    role="region"
                    aria-label={`${title} filter options, scrollable`}
                    sx={{
                        pt: 0,
                        maxHeight: isMobile
                            ? SCROLLABLE_FILTER_STYLES.MAX_HEIGHT_MOBILE
                            : SCROLLABLE_FILTER_STYLES.MAX_HEIGHT_DESKTOP,
                        overflowY: SCROLLABLE_FILTER_STYLES.OVERFLOW_Y,
                    }}
                >
                    <FormGroup>
                        {Object.entries(options).map(([value, filterData]) => {
                            // Handle new structure: filterData can be either a number (old) or object with {count, name} (new)
                            const count = typeof filterData === 'object' && filterData !== null
                                ? filterData.count
                                : filterData || 0;
                            const displayLabel = typeof filterData === 'object' && filterData !== null
                                ? (filterData.display_name || filterData.name || value)
                                : value;
                            const isChecked = activeValues.includes(value);

                            // FR-013: Hide zero-count options unless actively selected
                            if (count === 0 && !isChecked) {
                                return null;
                            }

                            return (
                                <FormControlLabel
                                    key={value}
                                    control={
                                        <Checkbox
                                            checked={isChecked}
                                            onChange={() => handleFilterChange(filterType, value)}
                                            onFocus={(e) => {
                                                e.target.scrollIntoView(SCROLLABLE_FILTER_STYLES.SCROLL_BEHAVIOR);
                                            }}
                                            size="small"
                                        />
                                    }
                                    label={
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <Typography variant="body2" sx={{ flex: 1 }}>
                                                {displayLabel}
                                            </Typography>
                                            {count > 0 && (
                                                <Typography 
                                                    variant="caption" 
                                                    color="text.secondary"
                                                    sx={{ ml: 1 }}
                                                >
                                                    ({count})
                                                </Typography>
                                            )}
                                        </Box>
                                    }
                                    sx={{ 
                                        margin: 0,
                                        '& .MuiFormControlLabel-label': {
                                            width: '100%'
                                        }
                                    }}
                                />
                            );
                        })}
                    </FormGroup>
                </AccordionDetails>
            </Accordion>
        );
    }, [filters, expandedPanels, isLoading, isMobile, handlePanelChange, handleFilterChange, handleClearFilterType]);

    /**
     * Filter panel content - uses FilterRegistry for dynamic rendering
     */
    const filterPanelContent = useMemo(() => {
        // Get all registered filters from registry
        const registeredFilters = FilterRegistry.getAll();

        return (
            <Box>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Validation Error Display (Story 1.12) */}
                {validationErrors && validationErrors.length > 0 && (
                    <Stack spacing={1} sx={{ mb: 2 }}>
                        {validationErrors.map((validationError, index) => (
                            <Alert
                                key={`${validationError.field}-${index}`}
                                severity={validationError.severity}
                                onClose={handleDismissValidationErrors}
                                sx={{
                                    '& .MuiAlert-message': {
                                        width: '100%'
                                    }
                                }}
                            >
                                <AlertTitle>{validationError.message}</AlertTitle>
                                {validationError.suggestion}
                            </Alert>
                        ))}
                    </Stack>
                )}

                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                    px: 1
                }}>
                    <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'medium' }}>
                        Filters
                    </Typography>
                    {totalActiveFilters > 0 && (
                        <Button
                            size="small"
                            startIcon={<ClearIcon />}
                            onClick={handleClearAllFilters}
                            sx={{ minWidth: 'auto' }}
                        >
                            Clear All
                        </Button>
                    )}
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Render all filters from registry (except searchQuery which is handled separately) */}
                {registeredFilters.map((filterConfig) => {
                    // Skip searchQuery filter (not rendered in filter panel)
                    if (filterConfig.type === 'searchQuery') {
                        return null;
                    }

                    return (
                        <React.Fragment key={filterConfig.type}>
                            {renderFilterSection(
                                filterConfig.pluralLabel,
                                filterConfig.type,
                                filterCounts[filterConfig.type] || {},
                                filterCounts[filterConfig.type]
                            )}
                        </React.Fragment>
                    );
                })}
            </Box>
        );
    }, [
        error,
        validationErrors,
        totalActiveFilters,
        filterCounts,
        handleClearAllFilters,
        handleDismissValidationErrors,
        renderFilterSection,
        dispatch,
        handlePanelChange
    ]);

    // Mobile drawer
    if (isMobile || showMobile) {
        return (
            <>
                <Button
                    variant="outlined"
                    startIcon={<FilterListIcon />}
                    onClick={() => setDrawerOpen(true)}
                    sx={{ mb: 2 }}
                    endIcon={
                        totalActiveFilters > 0 && (
                            <Badge badgeContent={totalActiveFilters} color="primary" sx={{marginLeft : "0.5rem"}}/>
                        )
                    }
                >
                    Filters
                </Button>
                
                <Drawer
                    anchor="left"
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    PaperProps={{
                        sx: { width: 320, p: 2 }
                    }}
                >
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        mb: 2 
                    }}>
                        <Typography variant="h6">
                            Filters
                        </Typography>
                        <IconButton onClick={() => setDrawerOpen(false)}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    {filterPanelContent}
                </Drawer>
            </>
        );
    }

    // Desktop panel
    return (
        <Paper 
            elevation={1} 
            sx={{ 
                p: 2,
                backgroundColor: 'background.paper',
                borderRadius: 1,
                height: 'fit-content',
                position: 'sticky',
                top: 20
            }}
        >
            {filterPanelContent}
        </Paper>
    );
};

// Custom comparison function for React.memo to prevent unnecessary re-renders
const arePropsEqual = (prevProps, nextProps) => {
    // Only re-render if props actually change
    return (
        prevProps.isSearchMode === nextProps.isSearchMode &&
        prevProps.showMobile === nextProps.showMobile
    );
};

export default React.memo(FilterPanel, arePropsEqual);