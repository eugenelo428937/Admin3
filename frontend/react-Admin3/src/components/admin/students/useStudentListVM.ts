import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import studentService from '@/services/studentService';
import type { StudentListItem, StudentSearchParams } from '@/services/studentService';

export interface StudentSearchFields {
    ref: string;
    name: string;
    email: string;
    phone: string;
    address: string;
}

const EMPTY_SEARCH: StudentSearchFields = {
    ref: '',
    name: '',
    email: '',
    phone: '',
    address: '',
};

export interface StudentListVM {
    isSuperuser: boolean;

    // Data
    students: StudentListItem[];
    loading: boolean;
    error: string | null;

    // Pagination
    page: number;
    rowsPerPage: number;
    totalCount: number;

    // Search
    search: StudentSearchFields;

    // Actions
    handleSearchChange: (key: string, value: string) => void;
    handleClearSearch: () => void;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const useStudentListVM = (): StudentListVM => {
    const { isSuperuser } = useAuth();
    const [students, setStudents] = useState<StudentListItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(50);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [search, setSearch] = useState<StudentSearchFields>(EMPTY_SEARCH);

    // Debounce timer ref
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchStudents = useCallback(async (searchOverride?: StudentSearchFields) => {
        try {
            setLoading(true);
            const s = searchOverride ?? search;
            const params: StudentSearchParams = {
                page: page + 1,
                page_size: rowsPerPage,
                ref: s.ref,
                name: s.name,
                email: s.email,
                phone: s.phone,
                address: s.address,
            };
            const { results, count } = await studentService.list(params);
            setStudents(results);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching students:', err);
            setError('Failed to fetch students. Please try again later.');
            setStudents([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, search]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const handleSearchChange = (key: string, value: string) => {
        const next = { ...search, [key]: value };
        setSearch(next);
        setPage(0);

        // Debounce the API call
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchStudents(next);
        }, 400);
    };

    const handleClearSearch = () => {
        setSearch(EMPTY_SEARCH);
        setPage(0);
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
        students, loading, error,
        page, rowsPerPage, totalCount,
        search,
        handleSearchChange, handleClearSearch,
        handleChangePage, handleChangeRowsPerPage,
    };
};

export default useStudentListVM;
