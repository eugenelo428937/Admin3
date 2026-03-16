import { useState, useEffect, useCallback } from 'react';
import storeBundleService from '../../../services/storeBundleService';
import type { StoreBundleProduct } from '../../../types/storeBundle';

export interface StoreBundleProductsPanelVM {
    // Data state
    bundleProducts: StoreBundleProduct[];
    loading: boolean;
    error: string | null;
}

const useStoreBundleProductsPanelVM = (bundleId: number): StoreBundleProductsPanelVM => {
    const [bundleProducts, setBundleProducts] = useState<StoreBundleProduct[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBundleProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await storeBundleService.getProducts(bundleId);
            setBundleProducts(data as StoreBundleProduct[]);
        } catch (err) {
            setError('Failed to load bundle products');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [bundleId]);

    useEffect(() => {
        fetchBundleProducts();
    }, [fetchBundleProducts]);

    return {
        bundleProducts, loading, error,
    };
};

export default useStoreBundleProductsPanelVM;
