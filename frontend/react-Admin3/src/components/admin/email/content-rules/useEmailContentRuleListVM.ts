import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import emailService from '../../../../services/emailService';
import type { EmailContentRule } from '../../../../types/email';

export interface EmailContentRuleListVM {
    rules: EmailContentRule[];
    loading: boolean;
    error: string | null;
    page: number;
    rowsPerPage: number;
    totalCount: number;
    fetchRules: () => Promise<void>;
    handleEdit: (id: number) => void;
    handleDelete: (id: number) => Promise<void>;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const useEmailContentRuleListVM = (): EmailContentRuleListVM => {
    const navigate = useNavigate();
    const [rules, setRules] = useState<EmailContentRule[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(25);
    const [totalCount, setTotalCount] = useState<number>(0);

    const fetchRules = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await emailService.getContentRules({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setRules(results as EmailContentRule[]);
            setTotalCount(count);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching content rules:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to fetch content rules.');
            setRules([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    const handleEdit = (id: number) => {
        navigate(`/admin/email/content-rules/${id}/edit`);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this content rule?')) {
            return;
        }
        try {
            await emailService.deleteContentRule(id);
            await fetchRules();
        } catch (err: any) {
            console.error('Error deleting content rule:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to delete content rule.');
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
        rules,
        loading,
        error,
        page,
        rowsPerPage,
        totalCount,
        fetchRules,
        handleEdit,
        handleDelete,
        handleChangePage,
        handleChangeRowsPerPage,
    };
};

export default useEmailContentRuleListVM;
