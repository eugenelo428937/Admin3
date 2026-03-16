import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import catalogProductService from '../../../services/catalogProductService';
import type { Product } from '../../../types/product';

export interface ProductListVM {
    isSuperuser: boolean;
    products: Product[];
    loading: boolean;
    error: string | null;
    page: number;
    rowsPerPage: number;
    totalCount: number;
    fetchProducts: () => Promise<void>;
    handleDelete: (id: number | string) => Promise<void>;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const useProductListVM = (): ProductListVM => {
    const navigate = useNavigate();
    const { isSuperuser } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(50);
    const [totalCount, setTotalCount] = useState<number>(0);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await catalogProductService.list({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setProducts(results as Product[]);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            setError('Failed to load products');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleDelete = async (id: number | string) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await catalogProductService.delete(id);
            fetchProducts();
        } catch (err) {
            setError('Failed to delete product');
            console.error(err);
        }
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return {
        isSuperuser,
        products, loading, error,
        page, rowsPerPage, totalCount,
        fetchProducts, handleDelete,
        handleChangePage, handleChangeRowsPerPage,
    };
};

export default useProductListVM;
