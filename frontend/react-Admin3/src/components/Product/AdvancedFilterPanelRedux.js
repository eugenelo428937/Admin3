/**
 * AdvancedFilterPanelRedux - Redux Integration Adapter
 * 
 * Wrapper around AdvancedFilterPanel to integrate with Redux store.
 * This allows existing AdvancedFilterPanel usage to work with the new Redux architecture
 * while maintaining backward compatibility.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    selectFilters,
    selectFilterCounts,
    setMultipleFilters,
    clearAllFilters
} from '../../store/slices/filtersSlice';
import AdvancedFilterPanel from './AdvancedFilterPanel';

const AdvancedFilterPanelRedux = ({
    isSearchMode = false,
    ...otherProps
}) => {
    const dispatch = useDispatch();
    
    // Redux state
    const filters = useSelector(selectFilters);
    const filterCounts = useSelector(selectFilterCounts);

    /**
     * Convert Redux filters to AdvancedFilterPanel format
     */
    const advancedFilters = useMemo(() => {
        return {
            subjects: filters.subjects || [],
            mainCategory: filters.categories || [],
            productTypes: filters.product_types || [],
            products: filters.products || [],
            deliveryMethod: filters.modes_of_delivery || []
        };
    }, [filters]);

    /**
     * Convert filter counts to AdvancedFilterPanel format
     */
    const filterConfig = useMemo(() => {
        if (!filterCounts || Object.keys(filterCounts).length === 0) {
            return {};
        }

        return {
            subjects: Object.entries(filterCounts.subjects || {}).map(([code, count]) => ({
                id: code,
                name: code,
                count: count
            })),
            categories: Object.entries(filterCounts.categories || {}).map(([name, count]) => ({
                id: name,
                name: name,
                count: count
            })),
            productTypes: Object.entries(filterCounts.product_types || {}).map(([name, count]) => ({
                id: name,
                name: name,
                count: count
            })),
            products: Object.entries(filterCounts.products || {}).map(([name, count]) => ({
                id: name,
                name: name,
                count: count
            })),
            modesOfDelivery: Object.entries(filterCounts.modes_of_delivery || {}).map(([name, count]) => ({
                id: name,
                name: name,
                count: count
            }))
        };
    }, [filterCounts]);

    /**
     * Handle filter changes from AdvancedFilterPanel
     */
    const handleFiltersChange = useCallback((newFilters) => {
        // Convert AdvancedFilterPanel format back to Redux format
        const reduxFilters = {};
        
        if (newFilters.subjects && newFilters.subjects.length > 0) {
            reduxFilters.subjects = newFilters.subjects;
        }
        
        if (newFilters.mainCategory && newFilters.mainCategory.length > 0) {
            reduxFilters.categories = newFilters.mainCategory;
        }
        
        if (newFilters.productTypes && newFilters.productTypes.length > 0) {
            reduxFilters.product_types = newFilters.productTypes;
        }
        
        if (newFilters.products && newFilters.products.length > 0) {
            reduxFilters.products = newFilters.products;
        }
        
        if (newFilters.deliveryMethod && newFilters.deliveryMethod.length > 0) {
            reduxFilters.modes_of_delivery = newFilters.deliveryMethod;
        }
        
        // Update Redux store
        dispatch(setMultipleFilters(reduxFilters));
    }, [dispatch]);

    return (
        <AdvancedFilterPanel
            onFiltersChange={handleFiltersChange}
            isSearchMode={isSearchMode}
            initialFilters={advancedFilters}
            filterConfig={filterConfig}
            {...otherProps}
        />
    );
};

export default AdvancedFilterPanelRedux;