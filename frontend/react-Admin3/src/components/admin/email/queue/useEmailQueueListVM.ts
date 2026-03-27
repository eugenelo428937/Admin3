import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import emailService from '../../../../services/emailService';
import type { EmailQueue, QueueStatus } from '../../../../types/email';

interface EmailQueueListVM {
    queueItems: EmailQueue[];
    loading: boolean;
    error: string | null;
    statusFilter: QueueStatus | 'all';
    toFilter: string;
    page: number;
    rowsPerPage: number;
    totalCount: number;
    resendDialogOpen: boolean;
    resendTargetId: number | null;
    fetchQueue: () => Promise<void>;
    handleStatusFilter: (status: QueueStatus | 'all') => void;
    handleToFilter: (value: string) => void;
    handleViewDetail: (id: number) => void;
    handleDuplicate: (id: number) => void;
    openResendDialog: (id: number) => void;
    closeResendDialog: () => void;
    confirmResend: () => Promise<void>;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const useEmailQueueListVM = (): EmailQueueListVM => {
    const navigate = useNavigate();

    const [queueItems, setQueueItems] = useState<EmailQueue[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<QueueStatus | 'all'>('all');
    const [toFilter, setToFilter] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);
    const [resendDialogOpen, setResendDialogOpen] = useState(false);
    const [resendTargetId, setResendTargetId] = useState<number | null>(null);

    const fetchQueue = useCallback(async () => {
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
            if (toFilter) {
                params.to_email = toFilter;
            }
            const response = await emailService.getQueue(params);
            setQueueItems(response.results);
            setTotalCount(response.count);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to load email queue');
            setQueueItems([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, statusFilter, toFilter]);

    const handleStatusFilter = useCallback((status: QueueStatus | 'all') => {
        setStatusFilter(status);
        setPage(0);
    }, []);

    const handleToFilter = useCallback((value: string) => {
        setToFilter(value);
        setPage(0);
    }, []);

    const handleViewDetail = useCallback((id: number) => {
        navigate(`/admin/email/queue/${id}`);
    }, [navigate]);

    const handleDuplicate = useCallback((id: number) => {
        navigate(`/admin/email/queue/${id}/duplicate`);
    }, [navigate]);

    const openResendDialog = useCallback((id: number) => {
        setResendTargetId(id);
        setResendDialogOpen(true);
    }, []);

    const closeResendDialog = useCallback(() => {
        setResendTargetId(null);
        setResendDialogOpen(false);
    }, []);

    const confirmResend = useCallback(async () => {
        if (resendTargetId === null) return;
        try {
            await emailService.resendQueueItem(resendTargetId);
            setResendDialogOpen(false);
            setResendTargetId(null);
            await fetchQueue();
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to resend email');
            setResendDialogOpen(false);
            setResendTargetId(null);
        }
    }, [resendTargetId, fetchQueue]);

    const handleChangePage = useCallback((_event: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    return {
        queueItems,
        loading,
        error,
        statusFilter,
        toFilter,
        page,
        rowsPerPage,
        totalCount,
        resendDialogOpen,
        resendTargetId,
        fetchQueue,
        handleStatusFilter,
        handleToFilter,
        handleViewDetail,
        handleDuplicate,
        openResendDialog,
        closeResendDialog,
        confirmResend,
        handleChangePage,
        handleChangeRowsPerPage,
    };
};
