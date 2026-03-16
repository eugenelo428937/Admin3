import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth.tsx';
import storeBundleService from '../../../services/storeBundleService';
import type { StoreBundle } from '../../../types/storeBundle';

export interface StoreBundleListVM {
    // Auth
    isSuperuser: boolean;

    // Data state
    storeBundles: StoreBundle[];
    loading: boolean;
    error: string | null;

    // Pagination
    page: number;
    rowsPerPage: number;
    totalCount: number;

    // Expand/collapse
    expandedId: number | null;

    // Actions
    handleToggleExpand: (bundleId: number) => void;
    fetchStoreBundles: () => Promise<void>;
    handleDelete: (id: number | string) => Promise<void>;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const useStoreBundleListVM = (): StoreBundleListVM => {
    const { isSuperuser } = useAuth();
    const [storeBundles, setStoreBundles] = useState<StoreBundle[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(50);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const handleToggleExpand = (bundleId: number) => {
        setExpandedId(prev => prev === bundleId ? null : bundleId);
    };

    const fetchStoreBundles = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await storeBundleService.adminList({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setStoreBundles(results as StoreBundle[]);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching store bundles:', err);
            setError('Failed to fetch store bundles. Please try again later.');
            setStoreBundles([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchStoreBundles();
    }, [fetchStoreBundles]);

    const handleDelete = async (id: number | string) => {
        if (!window.confirm('Are you sure you want to delete this store bundle?')) return;
        try {
            await storeBundleService.delete(id);
            fetchStoreBundles();
        } catch (err) {
            setError('Failed to delete store bundle. Please try again later.');
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
        storeBundles, loading, error,
        page, rowsPerPage, totalCount,
        expandedId,
        handleToggleExpand, fetchStoreBundles, handleDelete,
        handleChangePage, handleChangeRowsPerPage,
    };
};

export default useStoreBundleListVM;
