import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import emailService from '../../../../services/emailService';
import type { EmailContentPlaceholder } from '../../../../types/email';

export interface EmailPlaceholderListVM {
    placeholders: EmailContentPlaceholder[];
    loading: boolean;
    error: string | null;
    page: number;
    rowsPerPage: number;
    totalCount: number;
    fetchPlaceholders: () => Promise<void>;
    handleEdit: (id: number) => void;
    handleDelete: (id: number) => Promise<void>;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const useEmailPlaceholderListVM = (): EmailPlaceholderListVM => {
    const navigate = useNavigate();
    const [placeholders, setPlaceholders] = useState<EmailContentPlaceholder[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(25);
    const [totalCount, setTotalCount] = useState<number>(0);

    const fetchPlaceholders = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await emailService.getPlaceholders({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setPlaceholders(results as EmailContentPlaceholder[]);
            setTotalCount(count);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching placeholders:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to fetch placeholders.');
            setPlaceholders([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    const handleEdit = (id: number) => {
        navigate(`/admin/email/placeholders/${id}/edit`);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this placeholder?')) {
            return;
        }
        try {
            await emailService.deletePlaceholder(id);
            await fetchPlaceholders();
        } catch (err: any) {
            console.error('Error deleting placeholder:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to delete placeholder.');
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
        placeholders,
        loading,
        error,
        page,
        rowsPerPage,
        totalCount,
        fetchPlaceholders,
        handleEdit,
        handleDelete,
        handleChangePage,
        handleChangeRowsPerPage,
    };
};

export default useEmailPlaceholderListVM;
