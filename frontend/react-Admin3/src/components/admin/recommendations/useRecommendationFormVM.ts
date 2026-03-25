import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import recommendationService from "../../../services/recommendationService";
import productProductVariationService from "../../../services/productProductVariationService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductProductVariation {
    id: number | string;
    product_code?: string;
    variation_code?: string;
    product?: { code?: string };
    product_variation?: { code?: string };
}

export interface RecommendationFormData {
    source_ppv: string;
    recommended_ppv: string;
}

export interface RecommendationFormVM {
    isEditMode: boolean;
    formData: RecommendationFormData;
    productProductVariations: ProductProductVariation[];
    loading: boolean;
    error: string | null;
    handleSourceChange: (value: string) => void;
    handleRecommendedChange: (value: string) => void;
    handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
    handleCancel: () => void;
}

// ─── ViewModel Hook ───────────────────────────────────────────────────────────

const useRecommendationFormVM = (): RecommendationFormVM => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [formData, setFormData] = useState<RecommendationFormData>({
        source_ppv: "",
        recommended_ppv: "",
    });
    const [productProductVariations, setProductProductVariations] = useState<
        ProductProductVariation[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const ppvData = await productProductVariationService.getAll();
                setProductProductVariations(
                    Array.isArray(ppvData) ? (ppvData as ProductProductVariation[]) : []
                );
            } catch (err) {
                setError("Failed to load dropdown options.");
            }
        };

        const fetchRecommendation = async () => {
            try {
                const data = await recommendationService.getById(id!);
                const rec = data as any;
                setFormData({
                    source_ppv: rec.source_ppv?.id ?? rec.source_ppv ?? "",
                    recommended_ppv:
                        rec.recommended_ppv?.id ?? rec.recommended_ppv ?? "",
                });
            } catch (err) {
                setError("Failed to load recommendation data.");
            }
        };

        const init = async () => {
            await fetchDropdownData();
            if (isEditMode) {
                await fetchRecommendation();
            }
            setLoading(false);
        };

        init();
    }, [id, isEditMode]);

    const handleSourceChange = useCallback((value: string) => {
        setFormData((prev) => ({ ...prev, source_ppv: value }));
    }, []);

    const handleRecommendedChange = useCallback((value: string) => {
        setFormData((prev) => ({ ...prev, recommended_ppv: value }));
    }, []);

    const handleSubmit = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            if (!formData.source_ppv || !formData.recommended_ppv) {
                setError(
                    "Please select both a source and recommended product product variation."
                );
                return;
            }

            if (formData.source_ppv === formData.recommended_ppv) {
                setError(
                    "Source and recommended product product variation cannot be the same."
                );
                return;
            }

            try {
                const submitData = {
                    source_ppv: formData.source_ppv,
                    recommended_ppv: formData.recommended_ppv,
                };

                if (isEditMode) {
                    await recommendationService.update(id!, submitData);
                } else {
                    await recommendationService.create(submitData);
                }

                navigate("/admin/recommendations");
            } catch (err: any) {
                setError(
                    `Failed to ${isEditMode ? "update" : "create"} recommendation: ${
                        err.response?.data?.message || err.message
                    }`
                );
            }
        },
        [formData, isEditMode, id, navigate]
    );

    const handleCancel = useCallback(() => {
        navigate("/admin/recommendations");
    }, [navigate]);

    return {
        isEditMode,
        formData,
        productProductVariations,
        loading,
        error,
        handleSourceChange,
        handleRecommendedChange,
        handleSubmit,
        handleCancel,
    };
};

export default useRecommendationFormVM;
