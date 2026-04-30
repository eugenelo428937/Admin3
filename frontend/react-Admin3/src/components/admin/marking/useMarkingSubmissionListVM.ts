import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import adminMarkingSubmissionService, {
    type MarkingSubmissionRow,
    type MarkingSubmissionFilters,
    type MarkingSubmissionFilterOptions,
} from '@/services/adminMarkingSubmissionService';

export interface MarkingSubmissionListVM {
    isSuperuser: boolean;
    rows: MarkingSubmissionRow[];
    loading: boolean;
    error: string | null;

    page: number;
    rowsPerPage: number;
    totalCount: number;

    filters: MarkingSubmissionFilters;
    setFilter: (key: keyof MarkingSubmissionFilters, value: any) => void;
    toggleSubject: (code: string) => void;
    clearFilters: () => void;

    options: MarkingSubmissionFilterOptions;
    optionsLoaded: boolean;

    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const EMPTY_FILTERS: MarkingSubmissionFilters = {
    student_ref: '',
    student_name: '',
    subject: [],
    product_code: '',
    sequence: '',
    marker: '',
    marker_legacy_id: '',
    marker_name: '',
    voucher: false,
    submission_date_gte: '',
    submission_date_lte: '',
    allocate_date_gte: '',
    allocate_date_lte: '',
    graded_date_gte: '',
    graded_date_lte: '',
    feedback_date_gte: '',
    feedback_date_lte: '',
};

const EMPTY_OPTIONS: MarkingSubmissionFilterOptions = {
    subjects: [],
    markers: [],
    sequences: [],
};

const useMarkingSubmissionListVM = (): MarkingSubmissionListVM => {
    const { isSuperuser } = useAuth() as any;

    const [rows, setRows] = useState<MarkingSubmissionRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(50);
    const [totalCount, setTotalCount] = useState<number>(0);

    const [filters, setFilters] = useState<MarkingSubmissionFilters>(EMPTY_FILTERS);
    const [options, setOptions] = useState<MarkingSubmissionFilterOptions>(EMPTY_OPTIONS);
    const [optionsLoaded, setOptionsLoaded] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchRows = useCallback(async (
        nextFilters: MarkingSubmissionFilters,
        nextPage: number,
        nextSize: number,
    ) => {
        try {
            setLoading(true);
            const { results, count } = await adminMarkingSubmissionService.list({
                ...nextFilters,
                page: nextPage + 1,
                page_size: nextSize,
            });
            setRows(results);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching marking submissions:', err);
            setError('Failed to fetch marking submissions. Please try again later.');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        adminMarkingSubmissionService
            .filterOptions()
            .then((opts) => {
                setOptions(opts);
                setOptionsLoaded(true);
            })
            .catch((err) => {
                console.error('Error fetching filter options:', err);
                setOptionsLoaded(true);
            });
    }, []);

    useEffect(() => {
        fetchRows(filters, page, rowsPerPage);
    }, [page, rowsPerPage, fetchRows]);

    const scheduleFetch = useCallback((nextFilters: MarkingSubmissionFilters) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchRows(nextFilters, 0, rowsPerPage);
        }, 350);
    }, [fetchRows, rowsPerPage]);

    const setFilter = useCallback((key: keyof MarkingSubmissionFilters, value: any) => {
        setFilters((prev) => {
            const next = { ...prev, [key]: value };
            setPage(0);
            scheduleFetch(next);
            return next;
        });
    }, [scheduleFetch]);

    const toggleSubject = useCallback((code: string) => {
        setFilters((prev) => {
            const current = prev.subject ?? [];
            const next = current.includes(code)
                ? current.filter((c) => c !== code)
                : [...current, code];
            const updated = { ...prev, subject: next };
            setPage(0);
            scheduleFetch(updated);
            return updated;
        });
    }, [scheduleFetch]);

    const clearFilters = useCallback(() => {
        setFilters(EMPTY_FILTERS);
        setPage(0);
        fetchRows(EMPTY_FILTERS, 0, rowsPerPage);
    }, [fetchRows, rowsPerPage]);

    const handleChangePage = useCallback((_event: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    return useMemo(() => ({
        isSuperuser,
        rows, loading, error,
        page, rowsPerPage, totalCount,
        filters, setFilter, toggleSubject, clearFilters,
        options, optionsLoaded,
        handleChangePage, handleChangeRowsPerPage,
    }), [
        isSuperuser, rows, loading, error,
        page, rowsPerPage, totalCount,
        filters, setFilter, toggleSubject, clearFilters,
        options, optionsLoaded,
        handleChangePage, handleChangeRowsPerPage,
    ]);
};

export default useMarkingSubmissionListVM;
