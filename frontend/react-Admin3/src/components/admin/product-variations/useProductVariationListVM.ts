import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth.tsx';
import productVariationService from '../../../services/productVariationService';
import type { ProductVariation } from '../../../types/productVariation/productVariation.types';

export interface ProductVariationListVM {
    // Auth
    isSuperuser: boolean;

    // Data state
    productVariations: ProductVariation[];
    loading: boolean;
    error: string | null;

    // Actions
    fetchProductVariations: () => Promise<void>;
    handleDelete: (id: number | string) => Promise<void>;
}

const useProductVariationListVM = (): ProductVariationListVM => {
    const { isSuperuser } = useAuth();
    const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProductVariations = useCallback(async () => {
        try {
            const data = await productVariationService.getAll();
            if (Array.isArray(data)) {
                setProductVariations(data);
            } else if (data && (data as any).results && Array.isArray((data as any).results)) {
                setProductVariations((data as any).results);
            } else if (data && typeof data === 'object') {
                setProductVariations(Object.values(data) as ProductVariation[]);
            } else {
                setProductVariations([]);
                setError('Unexpected data format received from server');
            }
        } catch (err) {
            console.error('Error fetching product variations:', err);
            setError('Failed to fetch product variations. Please try again later.');
            setProductVariations([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProductVariations();
    }, [fetchProductVariations]);

    const handleDelete = async (id: number | string) => {
        if (!window.confirm('Are you sure you want to delete this product variation?')) return;
        try {
            await productVariationService.delete(id);
            setProductVariations(productVariations.filter(pv => pv.id !== id));
        } catch (err) {
            setError('Failed to delete product variation. Please try again later.');
        }
    };

    return {
        isSuperuser,
        productVariations, loading, error,
        fetchProductVariations, handleDelete,
    };
};

export default useProductVariationListVM;
