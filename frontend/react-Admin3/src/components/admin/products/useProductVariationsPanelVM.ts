import { useState, useEffect, useCallback } from 'react';
import productProductVariationService from '../../../services/productProductVariationService';
import productVariationService from '../../../services/productVariationService';
import type { ProductProductVariation, ProductProductVariationInput } from '../../../types/product';
import type { ProductVariation } from '../../../types/productVariation';

export interface ProductVariationsPanelVM {
    variations: ProductProductVariation[];
    allVariations: ProductVariation[];
    loading: boolean;
    error: string | null;
    editingId: number | null;
    editVariation: ProductVariation | null;
    addVariation: ProductVariation | null;
    getUnassignedVariations: (excludeVariationId?: number | null) => ProductVariation[];
    handleRemove: (ppvId: number) => Promise<void>;
    handleEditStart: (ppv: ProductProductVariation) => void;
    handleEditCancel: () => void;
    handleEditSave: (ppvId: number) => Promise<void>;
    setEditVariation: (variation: ProductVariation | null) => void;
    setAddVariation: (variation: ProductVariation | null) => void;
    handleAdd: () => Promise<void>;
}

const useProductVariationsPanelVM = (productId: number): ProductVariationsPanelVM => {
    const [variations, setVariations] = useState<ProductProductVariation[]>([]);
    const [allVariations, setAllVariations] = useState<ProductVariation[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editVariation, setEditVariation] = useState<ProductVariation | null>(null);
    const [addVariation, setAddVariation] = useState<ProductVariation | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [ppvs, allVars] = await Promise.all([
                productProductVariationService.getByProduct(productId),
                productVariationService.getAll(),
            ]);
            setVariations(ppvs as ProductProductVariation[]);
            setAllVariations(allVars as ProductVariation[]);
        } catch (err) {
            setError('Failed to load variations');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const assignedVariationIds = variations.map((v) => v.product_variation);

    const getUnassignedVariations = (excludeVariationId: number | null = null) => {
        return allVariations.filter(
            (v) => !assignedVariationIds.includes(v.id) || v.id === excludeVariationId
        );
    };

    const handleRemove = async (ppvId: number) => {
        if (!window.confirm('Are you sure you want to remove this variation?')) return;
        try {
            await productProductVariationService.delete(ppvId);
            await fetchData();
        } catch (err) {
            setError('Failed to remove variation');
            console.error(err);
        }
    };

    const handleEditStart = (ppv: ProductProductVariation) => {
        setEditingId(ppv.id);
        const currentVariation = allVariations.find(
            (v) => v.id === ppv.product_variation
        );
        setEditVariation(currentVariation || null);
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditVariation(null);
    };

    const handleEditSave = async (ppvId: number) => {
        if (!editVariation) return;
        try {
            await productProductVariationService.update(ppvId, {
                product: productId,
                product_variation: editVariation.id,
            });
            setEditingId(null);
            setEditVariation(null);
            await fetchData();
        } catch (err) {
            setError('Failed to update variation');
            console.error(err);
        }
    };

    const handleAdd = async () => {
        if (!addVariation) return;
        try {
            await productProductVariationService.create({
                product: productId,
                product_variation: addVariation.id,
            });
            setAddVariation(null);
            await fetchData();
        } catch (err) {
            setError('Failed to add variation');
            console.error(err);
        }
    };

    return {
        variations, allVariations, loading, error,
        editingId, editVariation, addVariation,
        getUnassignedVariations,
        handleRemove, handleEditStart, handleEditCancel, handleEditSave,
        setEditVariation, setAddVariation, handleAdd,
    };
};

export default useProductVariationsPanelVM;
