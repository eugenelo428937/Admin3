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

import React, { useCallback, useMemo } from 'react';
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
import useFilterPanelVM, { SCROLLABLE_FILTER_STYLES } from './useFilterPanelVM';
import type { FilterPanelProps, FilterCountData } from '../../types/browse/browse.types';

const FilterPanel: React.FC<FilterPanelProps> = ({
    isSearchMode = false,
    showMobile = false
}) => {
    const vm = useFilterPanelVM({ isSearchMode, showMobile });

    /**
     * Render filter section with checkboxes
     */
    const renderFilterSection = useCallback((title: string, filterType: string, options: Record<string, FilterCountData | number>, counts: Record<string, FilterCountData | number>) => {
        const activeValues = (vm.filters[filterType] || []) as string[];
        const hasActiveFilters = activeValues.length > 0;

        if (vm.isLoading) {
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
                expanded={vm.expandedPanels[filterType]}
                onChange={vm.handlePanelChange(filterType)}
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
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        vm.handleClearFilterType(filterType);
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
                        maxHeight: vm.isMobile
                            ? SCROLLABLE_FILTER_STYLES.MAX_HEIGHT_MOBILE
                            : SCROLLABLE_FILTER_STYLES.MAX_HEIGHT_DESKTOP,
                        overflowY: SCROLLABLE_FILTER_STYLES.OVERFLOW_Y,
                    }}
                >
                    <FormGroup>
                        {Object.entries(options).map(([value, filterData]) => {
                            // Handle new structure: filterData can be either a number (old) or object with {count, name} (new)
                            const count: number = typeof filterData === 'object' && filterData !== null
                                ? (filterData as FilterCountData).count
                                : (filterData as number) || 0;
                            const displayLabel: string = typeof filterData === 'object' && filterData !== null
                                ? ((filterData as FilterCountData).display_name || (filterData as FilterCountData).name || value)
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
                                            onChange={() => vm.handleFilterChange(filterType, value)}
                                            onFocus={(e: React.FocusEvent<HTMLButtonElement>) => {
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
    }, [vm.filters, vm.expandedPanels, vm.isLoading, vm.isMobile, vm.handlePanelChange, vm.handleFilterChange, vm.handleClearFilterType]);

    /**
     * Filter panel content - uses FilterRegistry for dynamic rendering
     */
    const filterPanelContent = useMemo(() => {
        return (
            <Box>
                {vm.error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {vm.error}
                    </Alert>
                )}

                {/* Validation Error Display (Story 1.12) */}
                {vm.validationErrors && vm.validationErrors.length > 0 && (
                    <Stack spacing={1} sx={{ mb: 2 }}>
                        {vm.validationErrors.map((validationError, index) => (
                            <Alert
                                key={`${validationError.field}-${index}`}
                                severity={validationError.severity}
                                onClose={vm.handleDismissValidationErrors}
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
                    {vm.totalActiveFilters > 0 && (
                        <Button
                            size="small"
                            startIcon={<ClearIcon />}
                            onClick={vm.handleClearAllFilters}
                            sx={{ minWidth: 'auto' }}
                        >
                            Clear All
                        </Button>
                    )}
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Render all filters from registry (except searchQuery which is handled separately) */}
                {vm.registeredFilters.map((filterConfig) => {
                    // Skip searchQuery filter (not rendered in filter panel)
                    if (filterConfig.type === 'searchQuery') {
                        return null;
                    }

                    return (
                        <React.Fragment key={filterConfig.type}>
                            {renderFilterSection(
                                filterConfig.pluralLabel,
                                filterConfig.type,
                                (vm.filterCounts[filterConfig.type] || {}) as Record<string, FilterCountData | number>,
                                (vm.filterCounts[filterConfig.type] || {}) as Record<string, FilterCountData | number>
                            )}
                        </React.Fragment>
                    );
                })}
            </Box>
        );
    }, [
        vm.error,
        vm.validationErrors,
        vm.totalActiveFilters,
        vm.filterCounts,
        vm.handleClearAllFilters,
        vm.handleDismissValidationErrors,
        vm.registeredFilters,
        renderFilterSection,
    ]);

    // Mobile drawer
    if (vm.isMobile || showMobile) {
        return (
            <>
                <Button
                    variant="outlined"
                    startIcon={<FilterListIcon />}
                    onClick={() => vm.setDrawerOpen(true)}
                    sx={{ mb: 2 }}
                    endIcon={
                        vm.totalActiveFilters > 0 ? (
                            <Badge badgeContent={vm.totalActiveFilters} color="primary" sx={{ marginLeft: "0.5rem" }} />
                        ) : undefined
                    }
                >
                    Filters
                </Button>

                <Drawer
                    anchor="left"
                    open={vm.drawerOpen}
                    onClose={() => vm.setDrawerOpen(false)}
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
                        <IconButton onClick={() => vm.setDrawerOpen(false)}>
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
const arePropsEqual = (prevProps: FilterPanelProps, nextProps: FilterPanelProps): boolean => {
    // Only re-render if props actually change
    return (
        prevProps.isSearchMode === nextProps.isSearchMode &&
        prevProps.showMobile === nextProps.showMobile
    );
};

export default React.memo(FilterPanel, arePropsEqual);
