import { useState, useCallback } from 'react';
import emailService from '../../../../services/emailService';
import type { EmailBatch, BatchStatus } from '../../../../types/email';

interface EmailBatchListVM {
    batches: EmailBatch[];
    loading: boolean;
    error: string | null;
    statusFilter: BatchStatus | 'all';
    page: number;
    rowsPerPage: number;
    totalCount: number;
    selectedBatchId: string | null;
    fetchBatches: () => Promise<void>;
    handleStatusFilter: (status: BatchStatus | 'all') => void;
    handleSelectBatch: (batchId: string) => void;
    handleCloseDrawer: () => void;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const useEmailBatchListVM = (): EmailBatchListVM => {
    const [batches, setBatches] = useState<EmailBatch[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<BatchStatus | 'all'>('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

    const fetchBatches = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, any> = {
                page: page + 1,
                page_size: rowsPerPage,
            };
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }
            const response = await emailService.getBatches(params);
            setBatches(response.results);
            setTotalCount(response.count);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to load batches');
            setBatches([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, statusFilter]);

    const handleStatusFilter = useCallback((status: BatchStatus | 'all') => {
        setStatusFilter(status);
        setPage(0);
    }, []);

    const handleSelectBatch = useCallback((batchId: string) => {
        setSelectedBatchId(batchId);
    }, []);

    const handleCloseDrawer = useCallback(() => {
        setSelectedBatchId(null);
    }, []);

    const handleChangePage = useCallback((_event: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    return {
        batches,
        loading,
        error,
        statusFilter,
        page,
        rowsPerPage,
        totalCount,
        selectedBatchId,
        fetchBatches,
        handleStatusFilter,
        handleSelectBatch,
        handleCloseDrawer,
        handleChangePage,
        handleChangeRowsPerPage,
    };
};
