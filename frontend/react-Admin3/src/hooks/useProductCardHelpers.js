import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCart } from '../contexts/CartContext';
import productService from '../services/productService';

/**
 * Custom hook for managing product card functionality
 * Provides reusable cart operations and deadline management
 */
const useProductCardHelpers = (products = []) => {
    const [bulkDeadlines, setBulkDeadlines] = useState({});
    const { addToCart } = useCart();

    // Memoize expensive calculations
    const allEsspIds = useMemo(() => {
        const markingProducts = products.filter((p) => p.type === "Markings");
        return markingProducts.map((p) => p.essp_id || p.id || p.product_id);
    }, [products]);

    // Create a stable string representation of IDs for comparison
    const idsString = useMemo(() => {
        return allEsspIds.sort().join(',');
    }, [allEsspIds]);

    // Handle add to cart functionality
    const handleAddToCart = useCallback((product, priceInfo) => {
        addToCart(product, priceInfo);
    }, [addToCart]);

    // Fetch bulk deadlines whenever marking products IDs actually change
    useEffect(() => {
        if (allEsspIds.length > 0) {
            console.log('🔄 [useProductCardHelpers] Fetching deadlines for IDs:', allEsspIds);
            productService
                .getBulkMarkingDeadlines(allEsspIds)
                .then((deadlines) => {
                    setBulkDeadlines(deadlines);
                })
                .catch((error) => {
                    console.error('Failed to fetch bulk deadlines:', error);
                    setBulkDeadlines({});
                });
        } else {
            setBulkDeadlines({});
        }
    }, [idsString]); // Use idsString instead of allEsspIds for more stable comparison

    return {
        handleAddToCart,
        allEsspIds,
        bulkDeadlines
    };
};

export default useProductCardHelpers; 