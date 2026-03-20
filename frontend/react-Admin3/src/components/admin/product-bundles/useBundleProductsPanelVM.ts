import { useState, useEffect, useCallback } from 'react';
import catalogBundleProductService from '../../../services/catalogBundleProductService';
import catalogProductService from '../../../services/catalogProductService';
import productProductVariationService from '../../../services/productProductVariationService';
import type { BundleProduct } from '../../../types/productBundle';
import type { Product, ProductProductVariation } from '../../../types/product';

export interface BundleProductsPanelVM {
    // Data state
    bundleProducts: BundleProduct[];
    allProducts: Product[];
    loading: boolean;
    error: string | null;

    // Edit state
    editingId: number | null;
    editProduct: Product | null;
    editVariation: ProductProductVariation | null;
    editVariationOptions: ProductProductVariation[];

    // Add state
    addProduct: Product | null;
    addVariation: ProductProductVariation | null;
    addVariationOptions: ProductProductVariation[];

    // Edit actions
    setEditProduct: (product: Product | null) => void;
    setEditVariation: (variation: ProductProductVariation | null) => void;

    // Add actions
    setAddProduct: (product: Product | null) => void;
    setAddVariation: (variation: ProductProductVariation | null) => void;

    // CRUD actions
    handleRemove: (bpId: number) => Promise<void>;
    handleAdd: () => Promise<void>;
    handleEditStart: (bp: BundleProduct) => void;
    handleEditSave: (bpId: number) => Promise<void>;
    handleEditCancel: () => void;
}

const useBundleProductsPanelVM = (bundleId: number): BundleProductsPanelVM => {
    const [bundleProducts, setBundleProducts] = useState<BundleProduct[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [editVariation, setEditVariation] = useState<ProductProductVariation | null>(null);
    const [editVariationOptions, setEditVariationOptions] = useState<ProductProductVariation[]>([]);

    // Add state
    const [addProduct, setAddProduct] = useState<Product | null>(null);
    const [addVariation, setAddVariation] = useState<ProductProductVariation | null>(null);
    const [addVariationOptions, setAddVariationOptions] = useState<ProductProductVariation[]>([]);

    const fetchBundleProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await catalogBundleProductService.getByBundleId(bundleId);
            setBundleProducts(data);
        } catch (err) {
            setError('Failed to load bundle products');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [bundleId]);

    const fetchAllProducts = useCallback(async () => {
        try {
            const data = await catalogProductService.getAll();
            setAllProducts(data);
        } catch (err) {
            console.error('Failed to load products:', err);
        }
    }, []);

    useEffect(() => {
        fetchBundleProducts();
        fetchAllProducts();
    }, [fetchBundleProducts, fetchAllProducts]);

    // When add product selection changes, fetch its variations (PPVs)
    useEffect(() => {
        if (addProduct) {
            productProductVariationService
                .getByProduct(addProduct.id)
                .then((ppvs: ProductProductVariation[]) => {
                    // Filter out PPVs already in the bundle
                    const assignedPPVIds = bundleProducts.map(
                        (bp) => bp.product_product_variation
                    );
                    const available = ppvs.filter(
                        (ppv) => !assignedPPVIds.includes(ppv.id)
                    );
                    setAddVariationOptions(available);
                })
                .catch((err: unknown) => console.error('Failed to load variations:', err));
        } else {
            setAddVariationOptions([]);
        }
        setAddVariation(null);
    }, [addProduct, bundleProducts]);

    // When edit product selection changes, fetch its variations
    useEffect(() => {
        if (editProduct) {
            productProductVariationService
                .getByProduct(editProduct.id)
                .then((ppvs: ProductProductVariation[]) => {
                    const assignedPPVIds = bundleProducts
                        .filter((bp) => bp.id !== editingId)
                        .map((bp) => bp.product_product_variation);
                    const available = ppvs.filter(
                        (ppv) => !assignedPPVIds.includes(ppv.id)
                    );
                    setEditVariationOptions(available);
                })
                .catch((err: unknown) => console.error('Failed to load variations:', err));
        } else {
            setEditVariationOptions([]);
        }
        setEditVariation(null);
    }, [editProduct, bundleProducts, editingId]);

    const handleRemove = async (bpId: number) => {
        if (!window.confirm('Remove this product from the bundle?')) return;
        try {
            await catalogBundleProductService.delete(bpId);
            fetchBundleProducts();
        } catch (err) {
            setError('Failed to remove product');
            console.error(err);
        }
    };

    const handleAdd = async () => {
        if (!addVariation) return;
        try {
            await catalogBundleProductService.create({
                bundle: bundleId,
                product_product_variation: addVariation.id,
                default_price_type: 'standard',
                quantity: 1,
                sort_order: bundleProducts.length + 1,
            });
            setAddProduct(null);
            setAddVariation(null);
            setAddVariationOptions([]);
            fetchBundleProducts();
        } catch (err) {
            setError('Failed to add product');
            console.error(err);
        }
    };

    const handleEditStart = (bp: BundleProduct) => {
        setEditingId(bp.id);
        const matchedProduct = allProducts.find((p) => p.code === bp.product_code);
        setEditProduct(matchedProduct || null);
    };

    const handleEditSave = async (bpId: number) => {
        if (!editVariation) return;
        try {
            await catalogBundleProductService.update(bpId, {
                bundle: bundleId,
                product_product_variation: editVariation.id,
            });
            setEditingId(null);
            setEditProduct(null);
            setEditVariation(null);
            setEditVariationOptions([]);
            fetchBundleProducts();
        } catch (err) {
            setError('Failed to update product');
            console.error(err);
        }
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditProduct(null);
        setEditVariation(null);
        setEditVariationOptions([]);
    };

    return {
        bundleProducts, allProducts, loading, error,
        editingId, editProduct, editVariation, editVariationOptions,
        addProduct, addVariation, addVariationOptions,
        setEditProduct, setEditVariation,
        setAddProduct, setAddVariation,
        handleRemove, handleAdd, handleEditStart, handleEditSave, handleEditCancel,
    };
};

export default useBundleProductsPanelVM;
