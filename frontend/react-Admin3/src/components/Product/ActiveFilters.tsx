/**
 * ActiveFilters Component
 *
 * Displays active filters as removable pills/chips.
 * Provides visual feedback for current filter state and easy filter removal.
 * Integrates with Redux store for filter management via ViewModel.
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

import React from 'react';
import {
    Box,
    Chip,
    Typography,
    Button,
    Stack,
    Divider,
} from '@mui/material';
import {
    Clear as ClearIcon,
    FilterList as FilterListIcon
} from '@mui/icons-material';
import useActiveFiltersVM from './useActiveFiltersVM';
import type { ActiveFiltersProps } from '../../types/browse/browse.types';

const ActiveFilters: React.FC<ActiveFiltersProps> = ({
    showCount = true,
    showClearAll = true,
    maxChipsToShow = 10,
    variant = 'default'
}) => {
    const vm = useActiveFiltersVM({ showCount, showClearAll, maxChipsToShow, variant });

    // Don't render if no active filters
    if (vm.activeFilterCount === 0) {
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
                    {vm.activeFilterCount} filter{vm.activeFilterCount > 1 ? 's' : ''} active
                </Typography>
                {showClearAll && (
                    <Button
                        size="small"
                        startIcon={<ClearIcon />}
                        onClick={vm.handleClearAll}
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
                label={`${vm.activeFilterCount} active`}
                onClick={showClearAll ? vm.handleClearAll : undefined}
                onDelete={showClearAll ? vm.handleClearAll : undefined}
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
                        {showCount && `${vm.activeFilterCount} `}
                        Active Filter{vm.activeFilterCount > 1 ? 's' : ''}
                    </Typography>
                </Box>

                {showClearAll && vm.activeFilterCount > 0 && (
                    <Button
                        size="small"
                        startIcon={<ClearIcon />}
                        onClick={vm.handleClearAll}
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
                {vm.activeFilterChips.map((chip) => (
                    <Chip
                        key={chip.key}
                        label={chip.label}
                        onDelete={chip.isSearchQuery ? vm.handleClearSearchQuery : () => vm.handleRemoveFilter(chip.filterType, chip.value)}
                        deleteIcon={<ClearIcon />}
                        color={chip.color as any}
                        variant="outlined"
                        size={vm.isMobile ? "small" : "medium"}
                        sx={{
                            maxWidth: vm.isMobile ? 120 : 300,
                            '& .MuiChip-label': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }
                        }}
                    />
                ))}

                {/* Show remaining count if we've hit the limit */}
                {vm.remainingChipsCount > 0 && (
                    <Chip
                        label={`+${vm.remainingChipsCount} more`}
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
