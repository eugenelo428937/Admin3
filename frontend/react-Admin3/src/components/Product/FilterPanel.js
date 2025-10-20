/**
 * FilterPanel Component
 *
 * Handles checkbox and radio interface for product filtering with proper counts.
 * Integrates with Redux store and displays disjunctive facet counts.
 * Replaces complex filtering logic from the original ProductList component.
 *
 * **Features:**
 * - Array-based filters: Subjects, Categories, Product Types, Products, Modes of Delivery
 *
 * @component
 * @example
 * // In ProductList component
 * <FilterPanel />
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
    toggleSubjectFilter,
    toggleCategoryFilter,
    toggleProductTypeFilter,
    toggleProductFilter,
    toggleModeOfDeliveryFilter,
    clearAllFilters,
    clearFilterType
} from '../../store/slices/filtersSlice';

const FilterPanel = ({ 
    isSearchMode = false,
    showMobile = false 
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const dispatch = useDispatch();
    
    // Redux state
    const filters = useSelector(selectFilters);
    const filterCounts = useSelector(selectFilterCounts);
    const isLoading = useSelector(state => state.filters.isLoading);
    const error = useSelector(state => state.filters.error);

    // Local state
    const [expandedPanels, setExpandedPanels] = useState({
        subjects: true,
        categories: false,
        productTypes: false,
        products: false,
        modesOfDelivery: false
    });
    const [drawerOpen, setDrawerOpen] = useState(false);

    /**
     * Handle accordion panel expansion
     */
    const handlePanelChange = useCallback((panel) => (event, isExpanded) => {
        setExpandedPanels(prev => ({
            ...prev,
            [panel]: isExpanded
        }));
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
                <AccordionDetails sx={{ pt: 0 }}>
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
                            
                            return (
                                <FormControlLabel
                                    key={value}
                                    control={
                                        <Checkbox
                                            checked={isChecked}
                                            onChange={() => handleFilterChange(filterType, value)}
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
    }, [filters, expandedPanels, isLoading, handlePanelChange, handleFilterChange, handleClearFilterType]);

    /**
     * Filter panel content
     */
    const filterPanelContent = useMemo(() => (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
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

            {/* Subjects Filter */}
            {renderFilterSection(
                'Subjects',
                'subjects',
                filterCounts.subjects || {},
                filterCounts.subjects
            )}

            {/* Categories Filter */}
            {renderFilterSection(
                'Categories',
                'categories',
                filterCounts.categories || {},
                filterCounts.categories
            )}

            {/* Product Types Filter */}
            {renderFilterSection(
                'Product Types',
                'product_types',
                filterCounts.product_types || {},
                filterCounts.product_types
            )}

            {/* Products Filter */}
            {renderFilterSection(
                'Products',
                'products',
                filterCounts.products || {},
                filterCounts.products
            )}

            {/* Modes of Delivery Filter */}
            {renderFilterSection(
                'Delivery Mode',
                'modes_of_delivery',
                filterCounts.modes_of_delivery || {},
                filterCounts.modes_of_delivery
            )}
        </Box>
    ), [
        error,
        totalActiveFilters,
        filterCounts,
        handleClearAllFilters,
        renderFilterSection,
        expandedPanels.tutorialFormat,
        expandedPanels.distanceLearning,
        expandedPanels.tutorial,
        tutorialFormat,
        distanceLearning,
        tutorial,
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

export default FilterPanel;