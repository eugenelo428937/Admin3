import { useState, useEffect, useCallback } from 'react';
import storeProductService from '../../../services/storeProductService';
import type { StoreProduct } from '../../../types/storeProduct';

export interface StoreProductVariationsPanelVM {
    products: StoreProduct[];
    loading: boolean;
    error: string | null;
    handleDelete: (id: number) => Promise<void>;
}

interface StoreProductVariationsPanelParams {
    catalogProductId?: number;
    storeProducts?: StoreProduct[];
    onRefresh?: () => void;
}

const useStoreProductVariationsPanelVM = ({
    catalogProductId,
    storeProducts: providedProducts,
    onRefresh,
}: StoreProductVariationsPanelParams): StoreProductVariationsPanelVM => {
    const [fetchedProducts, setFetchedProducts] = useState<StoreProduct[]>([]);
    const [loading, setLoading] = useState<boolean>(!providedProducts);
    const [error, setError] = useState<string | null>(null);

    const fetchStoreProducts = useCallback(async () => {
        if (providedProducts) return;
        try {
            setLoading(true);
            setError(null);
            const data = await storeProductService.getByCatalogProduct(catalogProductId!);
            setFetchedProducts(data as StoreProduct[]);
        } catch (err) {
            setError('Failed to load store products');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [catalogProductId, providedProducts]);

    useEffect(() => {
        fetchStoreProducts();
    }, [fetchStoreProducts]);

    const products = providedProducts || fetchedProducts;

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this store product?')) return;
        try {
            await storeProductService.delete(id);
            if (onRefresh) {
                onRefresh();
            } else {
                fetchStoreProducts();
            }
        } catch (err) {
            setError('Failed to delete store product');
            console.error(err);
        }
    };

    return {
        products,
        loading, error,
        handleDelete,
    };
};

export default useStoreProductVariationsPanelVM;
