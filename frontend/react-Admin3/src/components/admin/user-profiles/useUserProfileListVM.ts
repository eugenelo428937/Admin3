import { useState, useEffect, useCallback } from 'react';
import userProfileService from '../../../services/userProfileService.ts';

// ─── Interfaces ───────────────────────────────────────────────

export interface UserProfile {
  id: number;
  title?: string;
  user?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface UserProfileListVM {
  profiles: UserProfile[];
  loading: boolean;
  error: string | null;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  handleChangePage: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

// ─── Hook ─────────────────────────────────────────────────────

const useUserProfileListVM = (): UserProfileListVM => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const { results, count } = await userProfileService.list({ page: page + 1, page_size: rowsPerPage });
      setProfiles(results as UserProfile[]);
      setTotalCount(count);
      setError(null);
    } catch (err) {
      console.error('Error fetching user profiles:', err);
      setError('Failed to fetch user profiles. Please try again later.');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

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
    profiles,
    loading,
    error,
    page,
    rowsPerPage,
    totalCount,
    handleChangePage,
    handleChangeRowsPerPage,
  };
};

export default useUserProfileListVM;
