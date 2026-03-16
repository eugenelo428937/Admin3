import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import catalogProductService from '../../../services/catalogProductService';
import type { Product } from '../../../types/product';

export interface ProductDetailVM {
    isSuperuser: boolean;
    product: Product | null;
    loading: boolean;
    error: string | null;
    handleDelete: () => Promise<void>;
}

const useProductDetailVM = (): ProductDetailVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { isSuperuser } = useAuth();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const data = await catalogProductService.getById(id!);
                setProduct(data as Product);
                setError(null);
            } catch (err) {
                setError('Failed to load product details');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await catalogProductService.delete(id!);
            navigate('/admin/products');
        } catch (err) {
            setError('Failed to delete product');
            console.error(err);
        }
    };

    return {
        isSuperuser,
        product, loading, error,
        handleDelete,
    };
};

export default useProductDetailVM;
