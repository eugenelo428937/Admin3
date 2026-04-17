import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth.tsx';
import storeProductService from '../../../services/storeProductService';
import { useAdminProductFilters } from '../../../hooks/useAdminProductFilters';
import type { ActiveFilter, FilterConfigEntry } from '../../../hooks/useAdminProductFilters';
import type { StoreProduct, GroupedStoreProduct, GroupedStoreData } from '../../../types/storeProduct';

/**
 * Groups a flat array of store products into a hierarchy:
 *   session_code → subject_code → catalog_product_id → [store products]
 */
const groupStoreProducts = (storeProducts: StoreProduct[]): GroupedStoreData => {
    const grouped: GroupedStoreData = {};

    storeProducts.forEach((sp) => {
        const session = sp.session_code || 'Unknown Session';
        const subject = sp.subject_code || 'Unknown Subject';
        const cpId = sp.catalog_product_id ? String(sp.catalog_product_id) : `orphan-${sp.id}`;

        if (!grouped[session]) grouped[session] = {};
        if (!grouped[session][subject]) grouped[session][subject] = {};
        if (!grouped[session][subject][cpId]) {
            grouped[session][subject][cpId] = {
                catalog_product_id: sp.catalog_product_id,
                catalog_product_code: sp.catalog_product_code,
                product_name: sp.product_name,
                variations: [],
            };
        }
        grouped[session][subject][cpId].variations.push(sp);
    });

    return grouped;
};

/** Count total store products under a session group. */
const countSessionProducts = (subjects: Record<string, Record<string, GroupedStoreProduct>>) =>
    Object.values(subjects).reduce(
        (sum, products) =>
            sum +
            Object.values(products).reduce((s, p) => s + p.variations.length, 0),
        0
    );

/** Count total store products under a subject group. */
const countSubjectProducts = (products: Record<string, GroupedStoreProduct>) =>
    Object.values(products).reduce((sum, p) => sum + p.variations.length, 0);

export interface StoreProductListVM {
    isSuperuser: boolean;
    pageProducts: StoreProduct[];
    loading: boolean;
    error: string | null;
    page: number;
    rowsPerPage: number;
    totalCount: number;
    groupedData: GroupedStoreData;
    sortedSessions: string[];
    expandedSessions: Record<string, boolean>;
    expandedSubjects: Record<string, boolean>;
    expandedProduct: string | null;
    // Filters
    activeFilter: ActiveFilter;
    groupFilters: Record<string, string>;
    filterConfigs: FilterConfigEntry[];
    filtersLoading: boolean;
    handleActiveFilter: (value: ActiveFilter) => void;
    handleGroupFilter: (configName: string, value: string) => void;
    toggleSession: (session: string) => void;
    toggleSubject: (key: string) => void;
    toggleProduct: (key: string) => void;
    fetchProducts: () => Promise<void>;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
    countSessionProducts: (subjects: Record<string, Record<string, GroupedStoreProduct>>) => number;
    countSubjectProducts: (products: Record<string, GroupedStoreProduct>) => number;
}

const useStoreProductListVM = (): StoreProductListVM => {
    const { isSuperuser } = useAuth();
    const [pageProducts, setPageProducts] = useState<StoreProduct[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(400);
    const [totalCount, setTotalCount] = useState<number>(0);

    // Filter state
    const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
    const [groupFilters, setGroupFilters] = useState<Record<string, string>>({});
    const { filterConfigs, filtersLoading } = useAdminProductFilters();

    const handleActiveFilter = useCallback((value: ActiveFilter) => {
        setActiveFilter(value);
        setPage(0);
    }, []);

    const handleGroupFilter = useCallback((configName: string, value: string) => {
        setGroupFilters(prev => ({ ...prev, [configName]: value }));
        setPage(0);
    }, []);

    const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
    const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

    const toggleSession = (session: string) => {
        setExpandedSessions((prev) => ({ ...prev, [session]: !prev[session] }));
    };

    const toggleSubject = (key: string) => {
        setExpandedSubjects((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleProduct = (key: string) => {
        setExpandedProduct((prev) => (prev === key ? null : key));
    };

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const params: Record<string, any> = {
                page: page + 1,
                page_size: rowsPerPage,
            };
            if (activeFilter !== 'all') {
                params.is_active = activeFilter === 'active' ? 'true' : 'false';
            }
            // Collect selected group IDs across all filter configs
            const selectedGroupIds = Object.values(groupFilters).filter(v => v !== 'all');
            if (selectedGroupIds.length > 0) {
                params.group = selectedGroupIds.join(',');
            }
            const { results, count } = await storeProductService.adminList(params);
            setPageProducts(results as StoreProduct[]);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching store products:', err);
            setError('Failed to fetch store products. Please try again later.');
            setPageProducts([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, activeFilter, groupFilters]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
        setExpandedProduct(null);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
        setExpandedProduct(null);
    };

    const groupedData = useMemo(() => groupStoreProducts(pageProducts), [pageProducts]);

    const sortedSessions = useMemo(
        () => Object.keys(groupedData).sort((a, b) => b.localeCompare(a)),
        [groupedData]
    );

    return {
        isSuperuser,
        pageProducts, loading, error,
        page, rowsPerPage, totalCount,
        groupedData, sortedSessions,
        expandedSessions, expandedSubjects, expandedProduct,
        activeFilter, groupFilters,
        filterConfigs, filtersLoading,
        handleActiveFilter, handleGroupFilter,
        toggleSession, toggleSubject, toggleProduct,
        fetchProducts,
        handleChangePage, handleChangeRowsPerPage,
        countSessionProducts, countSubjectProducts,
    };
};

export default useStoreProductListVM;
