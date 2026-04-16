import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import legacyOrderService from '../../../services/legacyOrderService';
import legacyProductService from '../../../services/legacyProductService';
import subjectService from '../../../services/subjectService';
import examSessionService from '../../../services/examSessionService';
import type { LegacyOrder } from '../../../types/legacy-order.types';
import type { ComboboxOption } from '../ui/combobox';

interface Filters {
  ref: string;
  name: string;
  email: string;
  session: string;
  subject: string;
  dateFrom: string;
  dateTo: string;
  product: string;
}

const INITIAL_FILTERS: Filters = {
  ref: '',
  name: '',
  email: '',
  session: '',
  subject: '',
  dateFrom: '',
  dateTo: '',
  product: '',
};

const PAGE_SIZE = 20;

const useLegacyOrderListVM = () => {
  const { isSuperuser } = useAuth();

  // Data
  const [orders, setOrders] = useState<LegacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  // Sorting (field name; prefix with - for desc)
  const [ordering, setOrdering] = useState<string>('-order_date');

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Filters
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState<Filters>(INITIAL_FILTERS);

  // Option lists for comboboxes
  const [subjectOptions, setSubjectOptions] = useState<ComboboxOption[]>([]);
  const [sessionOptions, setSessionOptions] = useState<ComboboxOption[]>([]);
  const [productOptions, setProductOptions] = useState<ComboboxOption[]>([]);

  // Debounce text filters (300ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedFilters(filters), 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters]);

  // Fetch combobox options on mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [subjectsRes, sessionsRes, productsRes] = await Promise.all([
          subjectService.getAll(),
          examSessionService.getAll(),
          legacyProductService.search({ page_size: 10000 }),
        ]);
        setSubjectOptions(
          (subjectsRes as any[])
            .map((s: any) => ({ value: s.code, label: s.code }))
            .sort((a: ComboboxOption, b: ComboboxOption) =>
              a.label.localeCompare(b.label),
            ),
        );
        setSessionOptions(
          (sessionsRes as any[])
            .map((s: any) => ({ value: s.session_code, label: s.session_code }))
            .sort((a: ComboboxOption, b: ComboboxOption) =>
              a.label.localeCompare(b.label),
            ),
        );
        setProductOptions(
          productsRes.results
            .map((p) => ({
              value: String(p.id),
              label: `${p.full_code} — ${p.legacy_product_name}`,
            }))
            .sort((a: ComboboxOption, b: ComboboxOption) =>
              a.label.localeCompare(b.label),
            ),
        );
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    loadOptions();
  }, []);

  // Fetch orders when debounced filters or page change
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await legacyOrderService.search({
        ref: debouncedFilters.ref || undefined,
        name: debouncedFilters.name || undefined,
        email: debouncedFilters.email || undefined,
        session: debouncedFilters.session || undefined,
        subject: debouncedFilters.subject || undefined,
        date_from: debouncedFilters.dateFrom || undefined,
        date_to: debouncedFilters.dateTo || undefined,
        product: debouncedFilters.product || undefined,
        ordering: ordering || undefined,
        page: page + 1,
        page_size: PAGE_SIZE,
      });
      setOrders(data.results);
      setTotalCount(data.count);
      setError(null);
      setExpandedRows(new Set());
    } catch (err) {
      console.error('Error fetching legacy orders:', err);
      setError('Failed to fetch legacy orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, ordering, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter setters — each resets page to 0
  const setRef = (ref: string) => {
    setFilters((prev) => ({ ...prev, ref }));
    setPage(0);
  };

  const setName = (name: string) => {
    setFilters((prev) => ({ ...prev, name }));
    setPage(0);
  };

  const setEmail = (email: string) => {
    setFilters((prev) => ({ ...prev, email }));
    setPage(0);
  };

  const setSession = (session: string) => {
    setFilters((prev) => ({ ...prev, session }));
    setPage(0);
  };

  const setSubject = (subject: string) => {
    setFilters((prev) => ({ ...prev, subject }));
    setPage(0);
  };

  const setDateFrom = (dateFrom: string) => {
    setFilters((prev) => ({ ...prev, dateFrom }));
    setPage(0);
  };

  const setDateTo = (dateTo: string) => {
    setFilters((prev) => ({ ...prev, dateTo }));
    setPage(0);
  };

  const setProduct = (product: string) => {
    setFilters((prev) => ({ ...prev, product }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPage(0);
  };

  const toggleRow = (orderId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleSort = (field: string) => {
    setOrdering((prev) => {
      if (prev === field) return `-${field}`;
      if (prev === `-${field}`) return '';
      return field;
    });
    setPage(0);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (_event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
  };

  return {
    isSuperuser,
    orders,
    loading,
    error,
    totalCount,
    page,
    pageSize: PAGE_SIZE,

    filters,
    setRef,
    setName,
    setEmail,
    setSession,
    setSubject,
    setDateFrom,
    setDateTo,
    setProduct,
    clearFilters,

    subjectOptions,
    sessionOptions,
    productOptions,

    ordering,
    toggleSort,

    expandedRows,
    toggleRow,

    handleChangePage,
    handleChangeRowsPerPage,
  };
};

export default useLegacyOrderListVM;
