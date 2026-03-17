import { useState, useCallback, useEffect } from "react";
import recommendationService from "../../../services/recommendationService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Recommendation {
    id: number;
    product_product_variation?: number | string;
    recommended_product_product_variation?: number | string;
    source_product_code?: string;
    source_variation_name?: string;
    recommended_product_code?: string;
    recommended_variation_name?: string;
}

export interface RecommendationListVM {
    recommendations: Recommendation[];
    loading: boolean;
    error: string | null;
    page: number;
    rowsPerPage: number;
    totalCount: number;
    handleDelete: (id: number) => Promise<void>;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

// ─── ViewModel Hook ───────────────────────────────────────────────────────────

const useRecommendationListVM = (): RecommendationListVM => {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [totalCount, setTotalCount] = useState(0);

    const fetchRecommendations = useCallback(async () => {
        try {
            setLoading(true);
            const { results, count } = await recommendationService.list({
                page: page + 1,
                page_size: rowsPerPage,
            });
            setRecommendations(results as Recommendation[]);
            setTotalCount(count);
            setError(null);
        } catch (err) {
            console.error("Error fetching recommendations:", err);
            setError("Failed to fetch recommendations. Please try again later.");
            setRecommendations([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage]);

    useEffect(() => {
        fetchRecommendations();
    }, [fetchRecommendations]);

    const handleDelete = useCallback(
        async (id: number) => {
            if (window.confirm("Are you sure you want to delete this recommendation?")) {
                try {
                    await recommendationService.delete(id);
                    fetchRecommendations();
                } catch (err) {
                    setError("Failed to delete recommendation. Please try again later.");
                }
            }
        },
        [fetchRecommendations]
    );

    const handleChangePage = useCallback((_event: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const handleChangeRowsPerPage = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
        },
        []
    );

    return {
        recommendations,
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

export default useRecommendationListVM;
