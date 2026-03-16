import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth.tsx';
import catalogBundleService from '../../../services/catalogBundleService';
import type { ProductBundle } from '../../../types/productBundle';

export interface ProductBundleListVM {
    // Auth
    isSuperuser: boolean;

    // Data state
    bundles: ProductBundle[];
    loading: boolean;
    error: string | null;

    // Pagination
    page: number;
    rowsPerPage: number;
    totalCount: number;

    // Expand state
    expandedId: number | null;

    // Actions
    fetchBundles: () => Promise<void>;
    handleDelete: (id: number) => Promise<void>;
    handleToggleExpand: (bundleId: number) => void;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const useProductBundleListVM = (): ProductBundleListVM => {
    const { isSuperuser } = useAuth();
    const [bundles, setBundles] = useState<ProductBundle[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(50);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const handleToggleExpand = (bundleId: number) => {
        setExpandedId(prev => prev === bundleId ? null : bundleId);
    };

    const fetchBundles = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await catalogBundleService.list({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setBundles(results);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching product bundles:', err);
            setError('Failed to fetch product bundles. Please try again later.');
            setBundles([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchBundles();
    }, [fetchBundles]);

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this product bundle?')) {
            try {
                await catalogBundleService.delete(id);
                fetchBundles();
            } catch (err) {
                setError('Failed to delete product bundle. Please try again later.');
            }
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
        bundles, loading, error,
        page, rowsPerPage, totalCount,
        expandedId,
        fetchBundles, handleDelete, handleToggleExpand,
        handleChangePage, handleChangeRowsPerPage,
    };
};

export default useProductBundleListVM;
