import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth.tsx';
import examSessionService from '../../../services/examSessionService';
import type { ExamSession } from '../../../types/examSession';

export interface ExamSessionListVM {
    // Auth
    isSuperuser: boolean;

    // Data state
    examSessions: ExamSession[];
    loading: boolean;
    error: string | null;

    // Pagination
    page: number;
    rowsPerPage: number;
    totalCount: number;

    // Actions
    fetchExamSessions: () => Promise<void>;
    handleDelete: (id: number | string) => Promise<void>;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const useExamSessionListVM = (): ExamSessionListVM => {
    const { isSuperuser } = useAuth();
    const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(50);
    const [totalCount, setTotalCount] = useState<number>(0);

    const fetchExamSessions = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await examSessionService.list({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setExamSessions(results as ExamSession[]);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching exam sessions:', err);
            setError('Failed to fetch exam sessions');
            setExamSessions([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchExamSessions();
    }, [fetchExamSessions]);

    const handleDelete = async (id: number | string) => {
        if (!window.confirm('Are you sure you want to delete this exam session?')) return;
        try {
            await examSessionService.delete(id);
            fetchExamSessions();
        } catch (err) {
            setError('Failed to delete exam session');
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
        examSessions, loading, error,
        page, rowsPerPage, totalCount,
        fetchExamSessions, handleDelete,
        handleChangePage, handleChangeRowsPerPage,
    };
};

export default useExamSessionListVM;
