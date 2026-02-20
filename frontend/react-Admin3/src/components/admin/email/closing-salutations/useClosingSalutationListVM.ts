import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import emailService from '../../../../services/emailService';
import type { ClosingSalutationList } from '../../../../types/email';

export interface ClosingSalutationListVM {
    salutations: ClosingSalutationList[];
    loading: boolean;
    error: string | null;
    page: number;
    rowsPerPage: number;
    totalCount: number;
    fetchSalutations: () => Promise<void>;
    handleEdit: (id: number) => void;
    handleDelete: (id: number) => Promise<void>;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const useClosingSalutationListVM = (): ClosingSalutationListVM => {
    const navigate = useNavigate();
    const [salutations, setSalutations] = useState<ClosingSalutationList[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(25);
    const [totalCount, setTotalCount] = useState<number>(0);

    const fetchSalutations = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await emailService.getClosingSalutations({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setSalutations(results as ClosingSalutationList[]);
            setTotalCount(count);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching closing salutations:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to fetch closing salutations.');
            setSalutations([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    const handleEdit = (id: number) => {
        navigate(`/admin/email/closing-salutations/${id}/edit`);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this closing salutation?')) {
            return;
        }
        try {
            await emailService.deleteClosingSalutation(id);
            await fetchSalutations();
        } catch (err: any) {
            console.error('Error deleting closing salutation:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to delete closing salutation.');
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
        salutations,
        loading,
        error,
        page,
        rowsPerPage,
        totalCount,
        fetchSalutations,
        handleEdit,
        handleDelete,
        handleChangePage,
        handleChangeRowsPerPage,
    };
};

export default useClosingSalutationListVM;
