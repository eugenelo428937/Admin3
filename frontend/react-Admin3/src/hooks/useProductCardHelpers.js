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

    // Memoize expensive calculations - extract store product IDs for marking products
    const allStoreProductIds = useMemo(() => {
        const markingProducts = products.filter((p) => p.type === "Markings");
        // Use id (store product ID) as primary identifier after cart-orders refactoring
        return markingProducts.map((p) => p.id || p.store_product_id || p.product_id);
    }, [products]);

    // Create a stable string representation of IDs for comparison
    const idsString = useMemo(() => {
        return allStoreProductIds.sort().join(',');
    }, [allStoreProductIds]);

    // Handle add to cart functionality
    const handleAddToCart = useCallback((product, priceInfo) => {
        addToCart(product, priceInfo);
    }, [addToCart]);

    // Fetch bulk deadlines whenever marking products IDs actually change
    useEffect(() => {
        if (allStoreProductIds.length > 0) {
            productService
                .getBulkMarkingDeadlines(allStoreProductIds)
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
    }, [idsString]); // Use idsString instead of allStoreProductIds for more stable comparison

    return {
        handleAddToCart,
        // Keep allEsspIds as alias for backward compatibility
        allEsspIds: allStoreProductIds,
        allStoreProductIds,
        bulkDeadlines
    };
};

export default useProductCardHelpers; 