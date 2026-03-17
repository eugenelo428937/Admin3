import { useState, useEffect, useCallback } from 'react';
import staffService from '../../../services/staffService';

// ─── Interfaces ───────────────────────────────────────────────

export interface StaffMember {
  id: number;
  user?: number | string;
  is_active?: boolean;
  user_detail?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface StaffListVM {
  staff: StaffMember[];
  loading: boolean;
  error: string | null;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  handleDelete: (id: number) => Promise<void>;
  handleChangePage: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

// ─── Hook ─────────────────────────────────────────────────────

const useStaffListVM = (): StaffListVM => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const { results, count } = await staffService.list({ page: page + 1, page_size: rowsPerPage });
      setStaff(results as StaffMember[]);
      setTotalCount(count);
      setError(null);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError('Failed to fetch staff. Please try again later.');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleDelete = useCallback(async (id: number) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await staffService.delete(id);
        fetchStaff();
      } catch (err) {
        setError('Failed to delete staff member. Please try again later.');
      }
    }
  }, [fetchStaff]);

  const handleChangePage = useCallback(
    (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
      setPage(newPage);
    },
    [],
  );

  const handleChangeRowsPerPage = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(0);
    },
    [],
  );

  return {
    staff,
    loading,
    error,
    page,
    rowsPerPage,
    totalCount,
    handleDelete,
    handleChangePage,
    handleChangeRowsPerPage,
  };
};

export default useStaffListVM;
