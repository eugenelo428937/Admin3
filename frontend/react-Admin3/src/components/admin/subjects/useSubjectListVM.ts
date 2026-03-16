import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import subjectService from '../../../services/subjectService';
import type { Subject } from '../../../types/subject';

export interface SubjectListVM {
    // Auth
    isSuperuser: boolean;

    // Data state
    subjects: Subject[];
    loading: boolean;
    error: string | null;

    // Pagination
    page: number;
    rowsPerPage: number;
    totalCount: number;

    // Actions
    fetchSubjects: () => Promise<void>;
    handleDelete: (id: number | string) => Promise<void>;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const useSubjectListVM = (): SubjectListVM => {
    const navigate = useNavigate();
    const { isSuperuser } = useAuth();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(50);
    const [totalCount, setTotalCount] = useState<number>(0);

    const fetchSubjects = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await subjectService.list({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setSubjects(results as Subject[]);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching subjects:', err);
            setError('Failed to fetch subjects. Please try again later.');
            setSubjects([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchSubjects();
    }, [fetchSubjects]);

    const handleDelete = async (id: number | string) => {
        if (!window.confirm('Are you sure you want to delete this subject?')) return;
        try {
            await subjectService.delete(id);
            fetchSubjects();
        } catch (err) {
            setError('Failed to delete subject. Please try again later.');
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
        subjects, loading, error,
        page, rowsPerPage, totalCount,
        fetchSubjects, handleDelete,
        handleChangePage, handleChangeRowsPerPage,
    };
};

export default useSubjectListVM;
