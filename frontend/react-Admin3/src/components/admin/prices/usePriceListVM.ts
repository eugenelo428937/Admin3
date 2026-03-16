import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth.tsx';
import priceService from '../../../services/priceService';
import type { Price, GroupedProductPrices } from '../../../types/price';

export interface PriceListVM {
    // Auth
    isSuperuser: boolean;

    // Data state
    prices: Price[];
    groupedProducts: GroupedProductPrices[];
    loading: boolean;
    error: string | null;

    // Pagination
    page: number;
    rowsPerPage: number;
    totalCount: number;

    // Actions
    fetchPrices: () => Promise<void>;
    handleDeleteProduct: (priceIds: number[]) => Promise<void>;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Groups a flat array of prices into one row per product,
 * pivoting price_type values into columns.
 */
const groupPricesByProduct = (prices: Price[]): GroupedProductPrices[] => {
    const grouped: Record<number, GroupedProductPrices> = {};

    prices.forEach(price => {
        const productId = price.product;
        if (!grouped[productId]) {
            grouped[productId] = {
                product_id: productId,
                product_code: price.product_code || '',
                prices: {},
                price_ids: [],
            };
        }
        grouped[productId].prices[price.price_type] = price.amount;
        grouped[productId].price_ids.push(price.id);
    });

    return Object.values(grouped).sort((a, b) =>
        (a.product_code || '').localeCompare(b.product_code || '')
    );
};

const usePriceListVM = (): PriceListVM => {
    const { isSuperuser } = useAuth();
    const [prices, setPrices] = useState<Price[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(500);
    const [totalCount, setTotalCount] = useState<number>(0);

    const fetchPrices = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await priceService.list({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setPrices(results as Price[]);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error('Error fetching prices:', err);
            setError('Failed to fetch prices. Please try again later.');
            setPrices([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchPrices();
    }, [fetchPrices]);

    const handleDeleteProduct = async (priceIds: number[]) => {
        const count = priceIds.length;
        if (!window.confirm(`Delete ${count} price${count !== 1 ? 's' : ''} for this product?`)) return;
        try {
            await Promise.all(priceIds.map(id => priceService.delete(id)));
            fetchPrices();
        } catch (err) {
            setError('Failed to delete prices. Please try again later.');
        }
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const groupedProducts = useMemo(() => groupPricesByProduct(prices), [prices]);

    return {
        isSuperuser,
        prices, groupedProducts, loading, error,
        page, rowsPerPage, totalCount,
        fetchPrices, handleDeleteProduct,
        handleChangePage, handleChangeRowsPerPage,
    };
};

export default usePriceListVM;
