import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import legacyProductService from '../../../services/legacyProductService';
import examSessionService from '../../../services/examSessionService';
import subjectService from '../../../services/subjectService';
import type { LegacyProduct } from '../../../types/legacy-product.types';
import type { ComboboxOption } from '../ui/combobox';

interface Filters {
  q: string;
  subject: string;
  session: string;
  delivery: string;
}

const INITIAL_FILTERS: Filters = {
  q: '',
  subject: '',
  session: '',
  delivery: '',
};

const PAGE_SIZE = 20;

const useLegacyProductListVM = () => {
  const { isSuperuser } = useAuth();

  // Data
  const [products, setProducts] = useState<LegacyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  // Filters
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState('');

  // Option lists for comboboxes
  const [subjectOptions, setSubjectOptions] = useState<ComboboxOption[]>([]);
  const [sessionOptions, setSessionOptions] = useState<ComboboxOption[]>([]);

  // Debounce search text (300ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters.q]);

  // Fetch combobox options on mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [subjectsRes, sessionsRes] = await Promise.all([
          subjectService.getAll(),
          examSessionService.getAll(),
        ]);
        setSubjectOptions(
          (subjectsRes as any[])
            .map((s: any) => ({ value: s.code, label: s.code }))
            .sort((a: ComboboxOption, b: ComboboxOption) => a.label.localeCompare(b.label))
        );
        setSessionOptions(
          (sessionsRes as any[])
            .map((s: any) => ({ value: s.session_code, label: s.session_code }))
            .sort((a: ComboboxOption, b: ComboboxOption) => a.label.localeCompare(b.label))
        );
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    loadOptions();
  }, []);

  // Fetch products when filters or page change
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await legacyProductService.search({
        q: debouncedQ || undefined,
        subject: filters.subject || undefined,
        session: filters.session || undefined,
        delivery: filters.delivery || undefined,
        page: page + 1,
        page_size: PAGE_SIZE,
      });
      setProducts(data.results);
      setTotalCount(data.count);
      setError(null);
    } catch (err) {
      console.error('Error fetching legacy products:', err);
      setError('Failed to fetch legacy products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, filters.subject, filters.session, filters.delivery, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter setters — each resets page to 0
  const setSearchQuery = (q: string) => {
    setFilters((prev) => ({ ...prev, q }));
    setPage(0);
  };

  const setSubject = (subject: string) => {
    setFilters((prev) => ({ ...prev, subject }));
    setPage(0);
  };

  const setSession = (session: string) => {
    setFilters((prev) => ({ ...prev, session }));
    setPage(0);
  };

  const setDelivery = (delivery: string) => {
    setFilters((prev) => ({ ...prev, delivery }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPage(0);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
  };

  return {
    isSuperuser,
    products,
    loading,
    error,
    totalCount,
    page,
    pageSize: PAGE_SIZE,

    filters,
    setSearchQuery,
    setSubject,
    setSession,
    setDelivery,
    clearFilters,

    subjectOptions,
    sessionOptions,

    handleChangePage,
    handleChangeRowsPerPage,
  };
};

export default useLegacyProductListVM;
