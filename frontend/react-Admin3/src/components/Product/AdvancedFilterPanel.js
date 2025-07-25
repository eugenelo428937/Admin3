import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    Chip,
    Button,
    IconButton,
    Drawer,
    useMediaQuery,
    useTheme,
    Badge,
    Divider,
    Skeleton,
    Alert
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    FilterList as FilterListIcon,
    Clear as ClearIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import productService from '../../services/productService';

const AdvancedFilterPanel = ({ 
    onFiltersChange, 
    categoryFilter, 
    subjectFilter,
    isSearchMode = false,
    initialFilters = {} 
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // State management
    const [filterConfig, setFilterConfig] = useState({});
    const [activeFilters, setActiveFilters] = useState(initialFilters);
    const [expandedPanels, setExpandedPanels] = useState({});
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load filter configuration on mount - only once
    useEffect(() => {
        let isMounted = true;
        
        const loadFilterConfig = async () => {
            try {
                setLoading(true);
                const config = await productService.getFilterConfiguration();
                
                if (!isMounted) return; // Component unmounted
                
                setFilterConfig(config);
                
                // Set default expanded panels
                const defaultExpanded = {};
                Object.entries(config).forEach(([key, value]) => {
                    defaultExpanded[key] = value.default_open || false;
                });
                setExpandedPanels(defaultExpanded);
                
                setError(null);
            } catch (err) {
                if (!isMounted) return; // Component unmounted
                setError('Failed to load filter configuration');
                console.error('Error loading filter config:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadFilterConfig();
        
        return () => {
            isMounted = false;
        };
    }, []); // Empty dependency array - only run once

    // Handle external filter changes (from URL params, etc.) - only when filters actually change
    useEffect(() => {
        if (!isSearchMode && Object.keys(filterConfig).length > 0) {
            const newFilters = { ...activeFilters };
            
            // Handle category filter from navbar - only if not already set
            if (categoryFilter && !newFilters.main_category?.includes(categoryFilter)) {
                newFilters.main_category = [...(newFilters.main_category || []), categoryFilter];
            }
            
            // Handle subject filter from URL - only if not already set
            if (subjectFilter) {
                let subjectId = subjectFilter;
                if (typeof subjectFilter === 'string' && !subjectFilter.match(/^\d+$/)) {
                    // Convert subject code to ID
                    const subjectOptions = filterConfig.subject?.options || [];
                    const foundSubject = subjectOptions.find(s => s.code === subjectFilter);
                    if (foundSubject) {
                        subjectId = foundSubject.id;
                    }
                } else {
                    subjectId = parseInt(subjectFilter);
                }
                
                if (subjectId && !newFilters.subject?.includes(subjectId)) {
                    newFilters.subject = [...(newFilters.subject || []), subjectId];
                }
            }
            
            // Only update if filters actually changed
            const filtersChanged = JSON.stringify(activeFilters) !== JSON.stringify(newFilters);
            if (filtersChanged) {
                console.log('🔍 [AdvancedFilterPanel] External filters changed, updating:', newFilters);
                setActiveFilters(newFilters);
            }
        }
    }, [categoryFilter, subjectFilter, isSearchMode, filterConfig.subject?.options]); // More specific dependency

    // Notify parent when filters change - debounced
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (onFiltersChange) {
                console.log('🔍 [AdvancedFilterPanel] Notifying parent of filter change:', {
                    activeFilters,
                    filterCount: Object.keys(activeFilters).length,
                    hasSubject: !!activeFilters.subject?.length,
                    hasMainCategory: !!activeFilters.main_category?.length
                });
                onFiltersChange(activeFilters);
            }
        }, 100); // Small debounce to prevent rapid fire calls
        
        return () => clearTimeout(timeoutId);
    }, [activeFilters, onFiltersChange]);

    // Handle filter value changes
    const handleFilterChange = useCallback((filterType, value, checked) => {
        setActiveFilters(prev => {
            const currentValues = prev[filterType] || [];
            let newValues;
            
            if (checked) {
                // Don't add if already exists
                if (currentValues.includes(value)) {
                    return prev;
                }
                newValues = [...currentValues, value];
            } else {
                // Don't remove if doesn't exist
                if (!currentValues.includes(value)) {
                    return prev;
                }
                newValues = currentValues.filter(v => v !== value);
            }
            
            return {
                ...prev,
                [filterType]: newValues
            };
        });
    }, []);

    // Handle panel expansion
    const handlePanelChange = (panel) => (event, isExpanded) => {
        setExpandedPanels(prev => ({
            ...prev,
            [panel]: isExpanded
        }));
    };

    // Clear all filters
    const handleClearFilters = useCallback(() => {
        setActiveFilters(prev => {
            // Only clear if there are filters to clear
            if (Object.keys(prev).length === 0) {
                return prev;
            }
            return {};
        });
    }, []);

    // Clear specific filter
    const handleClearFilter = useCallback((filterType) => {
        setActiveFilters(prev => {
            // Only clear if the filter exists
            if (!prev[filterType]) {
                return prev;
            }
            const newFilters = { ...prev };
            delete newFilters[filterType];
            return newFilters;
        });
    }, []);

    // Get active filter count - memoized
    const getActiveFilterCount = useMemo(() => {
        return Object.values(activeFilters).reduce((count, values) => count + (values?.length || 0), 0);
    }, [activeFilters]);

    // Get filter label for display - memoized
    const getFilterLabel = useCallback((filterType, value) => {
        const options = filterConfig[filterType]?.options || [];
        const option = options.find(opt => opt.id === value);
        return option?.label || option?.name || value;
    }, [filterConfig]);

    // Render filter chips - memoized
    const renderFilterChips = useMemo(() => {
        const chips = [];
        
        Object.entries(activeFilters).forEach(([filterType, values]) => {
            if (values && values.length > 0) {
                values.forEach(value => {
                    chips.push(
                        <Chip
                            key={`${filterType}-${value}`}
                            label={getFilterLabel(filterType, value)}
                            onDelete={() => handleFilterChange(filterType, value, false)}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                    );
                });
            }
        });
        
        return chips;
    }, [activeFilters, getFilterLabel, handleFilterChange]);

    // Render filter options for a specific filter type
    const renderFilterOptions = (filterType) => {
        const config = filterConfig[filterType];
        if (!config || !config.options) return null;
        
        const activeValues = activeFilters[filterType] || [];
        
        return (
            <FormGroup>
                {config.options.map(option => (
                    <FormControlLabel
                        key={option.id}
                        control={
                            <Checkbox
                                checked={activeValues.includes(option.id)}
                                onChange={(e) => handleFilterChange(filterType, option.id, e.target.checked)}
                                size="small"
                            />
                        }
                        className='text-start'
                        label={<Typography variant="body2">{option.label || option.name}</Typography>}
                    />
                ))}
            </FormGroup>
        );
    };

    // Render filter panel content
    const renderFilterContent = () => {
        if (loading) {
            return (
                <Box sx={{ p: 2 }}>
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} height={60} sx={{ mb: 1 }} />
                    ))}
                </Box>
            );
        }

        if (error) {
            return (
                <Alert severity="error" sx={{ m: 2 }}>
                    {error}
                </Alert>
            );
        }

        const sortedFilters = Object.entries(filterConfig)
            .sort(([, a], [, b]) => a.display_order - b.display_order);

        return (
				<Box>
					{/* Active filters chips */}
					{getActiveFilterCount > 0 && (
						<Box sx={{ p: 2, pb: 0 }}>
							<Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
								<Typography variant="subtitle2" color="text.secondary">
									Active Filters ({getActiveFilterCount})
								</Typography>
								<Button
									size="small"
									onClick={handleClearFilters}
									sx={{ ml: "auto" }}
									className="clear-filters-btn">
									Clear All
								</Button>
							</Box>
							<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb:2 }}>
								{renderFilterChips}
							</Box>
							<Divider sx={{ mt: 1 }} />
						</Box>
					)}

					{/* Filter accordions */}
					{sortedFilters.map(([filterType, config]) => (
						<Accordion
							key={filterType}
							expanded={expandedPanels[filterType] || false}
							onChange={handlePanelChange(filterType)}
							elevation={0}
							sx={{
								"&:before": { display: "none" },
								borderBottom: `1px solid ${theme.palette.divider}`,
							}}>
							<AccordionSummary
								expandIcon={<ExpandMoreIcon />}
								sx={{
									minHeight: 48,
									"& .MuiAccordionSummary-content": {
										margin: "12px 0",
									},
								}}>
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										width: "100%",
									}}>
									<div
										variant="subtitle1"
										className="body color-light__onsurface_lkv">
										{config.label}
									</div>
									{activeFilters[filterType]?.length > 0 && (
										<Badge
											badgeContent={activeFilters[filterType].length}
											color="primary"
											variant="outlined"
											sx={{ ml: 2 }}>
											<Box />
										</Badge>
									)}
								</Box>
							</AccordionSummary>
							<AccordionDetails sx={{ pt: 0 }}>
								{renderFilterOptions(filterType)}
							</AccordionDetails>
						</Accordion>
					))}
				</Box>
			);
    };

    // Mobile drawer
    if (isMobile) {
        return (
				<>
					<div className="align-items-end">
						<Button
							variant="outlined"
							startIcon={<FilterListIcon />}
							onClick={() => setDrawerOpen(true)}
							sx={{ mb: 2 }}
							className="align-items-end">
							<Badge
								badgeContent={getActiveFilterCount}
								variant="outlined"
								className="color-light__onsurface_lkv">
								Filters
							</Badge>
						</Button>
					</div>
					<Drawer
						anchor="left"
						open={drawerOpen}
						onClose={() => setDrawerOpen(false)}
						sx={{
							"& .MuiDrawer-paper": {
								width: 280,
								maxWidth: "80vw",
							},
						}}>
						<Box sx={{ display: "flex", alignItems: "center", p: 2 }}>
							<Typography variant="h6">Filters</Typography>
							<IconButton
								onClick={() => setDrawerOpen(false)}
								sx={{ ml: "auto" }}>
								<CloseIcon />
							</IconButton>
						</Box>
						<Divider />
						{renderFilterContent()}
					</Drawer>
				</>
			);
    }

    // Desktop panel
    return (
        <Paper
            elevation={1}
            sx={{
                maxWidth: '15.9rem',
                maxHeight: '80vh',
                overflow: 'auto',
                position: 'sticky',                
                top: 20
            }}
        >
            <Box sx={{ p: 2, pb: 1 }}>
                <Typography variant="h6" component="div">
                    Filters
                </Typography>
            </Box>
            <Divider />
            {renderFilterContent()}
        </Paper>
    );
};

export default AdvancedFilterPanel;