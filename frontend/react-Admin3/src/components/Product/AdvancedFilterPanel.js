import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    isSearchMode = false,
    initialFilters = {},
    urlFilters = {},
    subjects = [],
    filterConfig = {}
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // State management
    const [internalFilterConfig, setInternalFilterConfig] = useState(filterConfig);
    const [activeFilters, setActiveFilters] = useState(initialFilters);
    const [expandedPanels, setExpandedPanels] = useState({});
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [loading, setLoading] = useState(Object.keys(filterConfig).length === 0);
    const [error, setError] = useState(null);
    const [isUpdatingFromUrl, setIsUpdatingFromUrl] = useState(false);
    
    // Track last sent filters to avoid redundant parent calls
    const lastSentFiltersRef = useRef({});

    // Update internal filter config when prop changes
    useEffect(() => {
        if (Object.keys(filterConfig).length > 0) {
            // Filter config loaded successfully
            
            setInternalFilterConfig(filterConfig);
            setLoading(false);
            
            // Set default expanded panels
            const defaultExpanded = {};
            Object.entries(filterConfig).forEach(([key, value]) => {
                defaultExpanded[key] = value.default_open || false;
            });
            setExpandedPanels(prev => ({ ...defaultExpanded, ...prev }));
        }
    }, [filterConfig]);

    // Handle external filter changes (from URL params, navbar, etc.) - rebuild filters from scratch
    useEffect(() => {
        if (!isSearchMode && Object.keys(internalFilterConfig).length > 0) {
            console.log('Processing URL filters:', urlFilters);
            console.log('Available filter configs:', Object.keys(internalFilterConfig));
            // Processing URL filters
            
            // Start with a fresh filter object, only keeping panel-initiated filters that don't conflict with URL filters
            const newFilters = {};
            
            // First, add URL filters
            Object.entries(urlFilters).forEach(([filterKey, filterValue]) => {
                if (filterValue) {
                    // Map URL filter keys to filter config keys
                    const filterKeyMapping = {
                        'subject': 'SUBJECT_FILTER',
                        'group': 'PRODUCT_CATEGORY', 
                        'product': 'PRODUCT_TYPE',
                        'tutorial_format': 'tutorial_format',
                        'variation': 'variation',
                        'distance_learning': 'DELIVERY_MODE',
                        'tutorial': 'tutorial'
                    };
                    
                    let panelFilterKey = filterKeyMapping[filterKey] || filterKey;
                    console.log(`Initial mapping ${filterKey} (${filterValue}) -> ${panelFilterKey}`);
                    
                    // Special case: if group filter doesn't exist in PRODUCT_CATEGORY, check PRODUCT_TYPE
                    if (filterKey === 'group' && panelFilterKey === 'PRODUCT_CATEGORY') {
                        const categoryOptions = internalFilterConfig.PRODUCT_CATEGORY?.options || [];
                        const categoryExists = categoryOptions.some(opt => 
                            opt.label === filterValue || opt.name === filterValue || opt.id === filterValue
                        );
                        
                        if (!categoryExists) {
                            // Check if it exists in PRODUCT_TYPE instead
                            const typeOptions = internalFilterConfig.PRODUCT_TYPE?.options || [];
                            const typeExists = typeOptions.some(opt => 
                                opt.label === filterValue || opt.name === filterValue || opt.id === filterValue
                            );
                            
                            if (typeExists) {
                                panelFilterKey = 'PRODUCT_TYPE';
                                console.log(`Remapped ${filterKey} to PRODUCT_TYPE since not found in PRODUCT_CATEGORY`);
                            }
                        }
                    }
                    
                    console.log(`Final mapping ${filterKey} (${filterValue}) -> ${panelFilterKey}`);
                    
                    if (panelFilterKey && internalFilterConfig[panelFilterKey]) {
                        let filterId = filterValue;
                        
                        // Special handling for subjects - convert code to ID
                        if (panelFilterKey === 'SUBJECT_FILTER') {
                            if (typeof filterValue === 'string' && !filterValue.match(/^\d+$/)) {
                                // Convert subject code to ID using passed subjects prop
                                const foundSubject = subjects.find(s => s.code === filterValue || s.code === filterValue.toUpperCase());
                                if (foundSubject) {
                                    filterId = foundSubject.id;
                                } else {
                                    // Also try the filter config if we didn't find in subjects
                                    const foundInConfig = internalFilterConfig.SUBJECT_FILTER?.options?.find(s => 
                                        s.code === filterValue || s.code === filterValue.toUpperCase() ||
                                        s.label === filterValue || s.name === filterValue
                                    );
                                    if (foundInConfig) {
                                        filterId = foundInConfig.id;
                                    }
                                }
                            } else {
                                filterId = parseInt(filterValue);
                            }
                        } else if ((panelFilterKey === 'PRODUCT_CATEGORY' && filterKey === 'group') || 
                                 (panelFilterKey === 'PRODUCT_TYPE' && (filterKey === 'group' || filterKey === 'product'))) {
                            // Special handling for product categories and types - convert name to ID
                            if (typeof filterValue === 'string' && !filterValue.match(/^\d+$/)) {
                                // Find option by label/name in filter config
                                const foundOption = internalFilterConfig[panelFilterKey]?.options?.find(opt => 
                                    opt.label === filterValue || opt.name === filterValue || 
                                    opt.label === filterValue.toLowerCase() || opt.name === filterValue.toLowerCase()
                                );
                                console.log(`Looking for ${panelFilterKey} "${filterValue}":`, foundOption);
                                if (foundOption) {
                                    filterId = foundOption.id;
                                } else {
                                    filterId = filterValue; // Keep as string if not found
                                }
                            } else {
                                filterId = parseInt(filterValue);
                            }
                        } else {
                            // For non-subject filters, convert string/number to appropriate type
                            filterId = typeof filterValue === 'string' ? parseInt(filterValue) || filterValue : filterValue;
                        }
                        
                        // Check if the filter option exists in the configuration
                        const filterOptions = internalFilterConfig[panelFilterKey]?.options || [];
                        const optionExists = filterOptions.some(opt => opt.id === filterId || opt.id === filterValue);
                        console.log(`Checking if ${panelFilterKey} option exists for ID ${filterId}:`, optionExists);
                        console.log(`Available ${panelFilterKey} options:`, filterOptions.map(opt => ({id: opt.id, label: opt.label || opt.name, code: opt.code})));
                        
                        if (optionExists) {
                            // Use the mapped panelFilterKey for activeFilters so checkbox rendering works
                            newFilters[panelFilterKey] = [filterId];
                            console.log(`Added filter: ${panelFilterKey} = [${filterId}]`);
                        } else if (panelFilterKey === 'PRODUCT_TYPE' && filterKey === 'product') {
                            // Special case: individual product ID doesn't exist in PRODUCT_TYPE config
                            // Navigation is clicking on individual products (e.g., "Core Reading") 
                            // but filter only supports product categories (e.g., "Core Study Materials")
                            // Individual product filtering will be handled at API level instead of filter panel
                            
                            // For now, we'll ignore individual product filters since the filter system doesn't support them
                            // The user will see all products instead of filtering by specific product name
                            // TODO: Consider implementing product name search or requesting backend to add individual product filter config
                        }
                    }
                }
            });
            
            // Then add category filter from navbar if present
            if (categoryFilter && internalFilterConfig.main_category) {
                const filterOptions = internalFilterConfig.main_category?.options || [];
                const optionExists = filterOptions.some(opt => opt.id === categoryFilter);
                
                if (optionExists) {
                    newFilters.main_category = [categoryFilter];
                }
            }
            
            // Finally, add any panel filters that don't conflict with URL filters
            Object.entries(initialFilters).forEach(([filterType, values]) => {
                if (values && values.length > 0 && !newFilters[filterType]) {
                    newFilters[filterType] = [...values];
                }
            });
            
            // Only update if filters actually changed
            const filtersChanged = JSON.stringify(activeFilters) !== JSON.stringify(newFilters);
            
            if (filtersChanged) {
                setIsUpdatingFromUrl(true);
                setActiveFilters(newFilters);
                // Reset the flag after a short delay
                setTimeout(() => setIsUpdatingFromUrl(false), 50);
            }
        }
    }, [categoryFilter, urlFilters, isSearchMode, internalFilterConfig, subjects, initialFilters]); // activeFilters is intentionally excluded to avoid circular dependency

    // Notify parent when filters change - debounced (but not when updating from URL)
    useEffect(() => {
        console.log('🔧 Parent notification effect triggered');
        console.log('🔧 isUpdatingFromUrl:', isUpdatingFromUrl);
        console.log('🔧 activeFilters:', activeFilters);
        
        if (isUpdatingFromUrl) {
            console.log('🔧 Skipping parent notification - updating from URL');
            return; // Don't notify parent when we're updating from URL filters
        }
        
        const timeoutId = setTimeout(() => {
            console.log('🔧 Parent notification timeout executing');
            if (onFiltersChange) {
                // Only send panel-only filters (non-URL filters) to parent
                // Note: SUBJECT_FILTER needs special handling as it can be both URL-based and panel-based
                const alwaysUrlOnlyFilters = ['PRODUCT_CATEGORY', 'PRODUCT_TYPE', 'DELIVERY_MODE', 'main_category', 'tutorial_format', 'variation', 'tutorial'];
                const panelOnlyFilters = {};
                
                console.log('🔧 Processing active filters for parent notification:');
                console.log('🔧 Current URL filters:', urlFilters);
                
                Object.entries(activeFilters).forEach(([configKey, values]) => {
                    console.log('🔧   Checking filter:', configKey, 'values:', values);
                    
                    // Check if this filter should be excluded
                    let shouldExclude = false;
                    
                    // Always exclude certain URL-only filters
                    if (alwaysUrlOnlyFilters.includes(configKey)) {
                        shouldExclude = true;
                        console.log('🔧   Excluded - always URL-only filter');
                    } 
                    // Special handling for SUBJECT_FILTER - exclude subjects that match the URL
                    else if (configKey === 'SUBJECT_FILTER') {
                        const currentUrlSubject = urlFilters.subject;
                        if (currentUrlSubject && values && values.length > 0) {
                            // Find the URL subject
                            const urlSubject = subjects.find(s => s.code === currentUrlSubject || s.id === parseInt(currentUrlSubject));
                            if (urlSubject) {
                                // Filter out any panel subjects that match the URL subject
                                const filteredValues = values.filter(panelSubjectId => {
                                    const matches = urlSubject.id === panelSubjectId || urlSubject.code === panelSubjectId;
                                    if (matches) {
                                        console.log('🔧   Removing duplicate URL subject from panel:', panelSubjectId);
                                    }
                                    return !matches;
                                });
                                
                                // If we have remaining subjects after filtering, include them
                                if (filteredValues.length > 0) {
                                    panelOnlyFilters[configKey] = filteredValues;
                                    console.log('🔧   Including SUBJECT_FILTER with filtered values:', filteredValues);
                                    return; // Skip the normal processing
                                } else {
                                    shouldExclude = true;
                                    console.log('🔧   Excluded - all SUBJECT_FILTER values match URL subject');
                                }
                            } else {
                                console.log('🔧   Including SUBJECT_FILTER - URL subject not found in subjects list');
                            }
                        } else if (!currentUrlSubject) {
                            console.log('🔧   Including SUBJECT_FILTER - no URL subject');
                        }
                    }
                    
                    // Include if not excluded and has values
                    if (!shouldExclude && values && values.length > 0) {
                        panelOnlyFilters[configKey] = values;
                        console.log('🔧   Added to panel-only filters');
                    } else if (!values || values.length === 0) {
                        console.log('🔧   Excluded (empty values)');
                    }
                });
                
                console.log('🔧 Final panel-only filters to send to parent:', panelOnlyFilters);
                
                // Check if filters have actually changed
                const filtersChanged = JSON.stringify(lastSentFiltersRef.current) !== JSON.stringify(panelOnlyFilters);
                console.log('🔧 Filters changed since last send:', filtersChanged);
                console.log('🔧 Last sent filters:', lastSentFiltersRef.current);
                
                // Only call parent if filters changed
                if (filtersChanged) {
                    console.log('🔧 Calling parent onFiltersChange with:', panelOnlyFilters);
                    lastSentFiltersRef.current = { ...panelOnlyFilters };
                    onFiltersChange(panelOnlyFilters);
                } else {
                    console.log('🔧 No change in filters, not calling parent');
                }
            }
        }, 100); // Small debounce to prevent rapid fire calls
        
        return () => clearTimeout(timeoutId);
    }, [activeFilters, onFiltersChange, isUpdatingFromUrl]);

    // Handle filter value changes
    const handleFilterChange = useCallback((filterType, value, checked) => {
        console.log('🔧 Filter change triggered:', { filterType, value, checked });
        console.log('🔧 Current active filters before change:', activeFilters);
        
        setActiveFilters(prev => {
            const currentValues = prev[filterType] || [];
            console.log('🔧 Current values for', filterType, ':', currentValues);
            let newValues;
            
            if (checked) {
                // Don't add if already exists
                if (currentValues.includes(value)) {
                    console.log('🔧 Value already exists, not adding');
                    return prev;
                }
                newValues = [...currentValues, value];
                console.log('🔧 Adding value, new values:', newValues);
            } else {
                // Don't remove if doesn't exist
                if (!currentValues.includes(value)) {
                    console.log('🔧 Value does not exist, not removing');
                    return prev;
                }
                newValues = currentValues.filter(v => v !== value);
                console.log('🔧 Removing value, new values:', newValues);
            }
            
            const updatedFilters = {
                ...prev,
                [filterType]: newValues
            };
            console.log('🔧 Updated active filters:', updatedFilters);
            return updatedFilters;
        });
    }, [activeFilters]);

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
        const options = internalFilterConfig[filterType]?.options || [];
        const option = options.find(opt => opt.id === value);
        return option?.label || option?.name || value;
    }, [internalFilterConfig]);


    // Render filter options for a specific filter type
    const renderFilterOptions = (filterType) => {
        const config = internalFilterConfig[filterType];
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

        const sortedFilters = Object.entries(internalFilterConfig)
            .sort(([, a], [, b]) => a.display_order - b.display_order);

        return (
				<Box>
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