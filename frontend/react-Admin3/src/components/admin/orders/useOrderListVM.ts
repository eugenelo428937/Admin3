import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import adminOrderService, { ProductCodeOption } from '../../../services/adminOrderService';
import type { AdminOrderListItem } from '../../../types/admin-order.types';

interface ComboboxOption { value: string; label: string; }

interface Filters {
  studentRef: string;
  name: string;
  email: string;
  orderNo: string;
  productCode: string;
  dateFrom: string;
  dateTo: string;
}

const INITIAL_FILTERS: Filters = {
  studentRef: '',
  name: '',
  email: '',
  orderNo: '',
  productCode: '',
  dateFrom: '',
  dateTo: '',
};

const PAGE_SIZE = 20;
const DEFAULT_ORDERING = '-created_at';

const useOrderListVM = () => {
  const { isSuperuser } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  const [ordering, setOrdering] = useState<string>(DEFAULT_ORDERING);
  const [sortedField, setSortedField] = useState<string>('created_at');
  const [sortToggleCount, setSortToggleCount] = useState<number>(0);

  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState<Filters>(INITIAL_FILTERS);

  const [productCodeOptions, setProductCodeOptions] = useState<ComboboxOption[]>([]);

  // Load product-code combobox options once on mount.
  useEffect(() => {
    adminOrderService.listProductCodes()
      .then((opts: ProductCodeOption[]) => {
        setProductCodeOptions(
          opts
            .map((o) => ({ value: o.code, label: o.name ? `${o.code} — ${o.name}` : o.code }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      })
      .catch((err) => console.error('Failed to load product codes:', err));
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedFilters(filters), 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminOrderService.search({
        student_ref: debouncedFilters.studentRef || undefined,
        name: debouncedFilters.name || undefined,
        email: debouncedFilters.email || undefined,
        order_no: debouncedFilters.orderNo || undefined,
        product_code: debouncedFilters.productCode || undefined,
        date_from: debouncedFilters.dateFrom || undefined,
        date_to: debouncedFilters.dateTo || undefined,
        ordering: ordering || undefined,
        page: page + 1,
        page_size: PAGE_SIZE,
      });
      setOrders(data.results);
      setTotalCount(data.count);
      setError(null);
    } catch (err) {
      console.error('Error fetching admin orders:', err);
      setError('Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, ordering, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const makeSetter = <K extends keyof Filters>(key: K) =>
    (value: Filters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(0);
    };

  const setStudentRef = makeSetter('studentRef');
  const setName        = makeSetter('name');
  const setEmail       = makeSetter('email');
  const setOrderNo     = makeSetter('orderNo');
  const setProductCode = makeSetter('productCode');
  const setDateFrom    = makeSetter('dateFrom');
  const setDateTo      = makeSetter('dateTo');

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPage(0);
  };

  const toggleSort = (field: string) => {
    if (sortedField === field) {
      // Toggling same field: cycle through desc (0) -> asc (1) -> desc (2) -> cleared (3) -> desc (0)
      const nextCount = (sortToggleCount + 1) % 4;
      if (nextCount === 1) {
        // Step 1: ascending
        setOrdering(field);
      } else if (nextCount === 2) {
        // Step 2: descending again
        setOrdering(`-${field}`);
      } else if (nextCount === 3) {
        // Step 3: cleared
        setOrdering('');
      } else {
        // Step 0: back to descending
        setOrdering(`-${field}`);
      }
      setSortToggleCount(nextCount);
    } else {
      // Different field: start with descending, counter at 0
      setOrdering(`-${field}`);
      setSortedField(field);
      setSortToggleCount(0);
    }
    setPage(0);
  };

  const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (_event: React.ChangeEvent<HTMLInputElement>) => setPage(0);

  const onView = (orderId: number) => navigate(`/admin/orders/${orderId}`);

  return {
    isSuperuser,
    orders, loading, error, totalCount, page, pageSize: PAGE_SIZE,
    filters,
    setStudentRef, setName, setEmail, setOrderNo, setProductCode, setDateFrom, setDateTo,
    clearFilters,
    productCodeOptions,
    ordering, toggleSort,
    handleChangePage, handleChangeRowsPerPage,
    onView,
  };
};

export default useOrderListVM;
