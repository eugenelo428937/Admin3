import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import productVariationService from '../../../services/productVariationService';
import type { ProductVariationInput } from '../../../types/productVariation/productVariation.types';

export interface ProductVariationFormVM {
    // Auth
    isSuperuser: boolean;

    // Form state
    formData: ProductVariationInput;
    loading: boolean;
    error: string | null;
    isEditMode: boolean;

    // Actions
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    handleCancel: () => void;
}

const useProductVariationFormVM = (): ProductVariationFormVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { isSuperuser } = useAuth();
    const isEditMode = !!id;

    const [formData, setFormData] = useState<ProductVariationInput>({
        variation_type: '',
        name: '',
        description: '',
        code: '',
    });
    const [loading, setLoading] = useState<boolean>(isEditMode);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProductVariation = async () => {
            try {
                const data = await productVariationService.getById(id!);
                setFormData({
                    variation_type: data.variation_type || '',
                    name: data.name || '',
                    description: data.description || '',
                    code: data.code || '',
                });
            } catch (err) {
                setError('Failed to fetch product variation details. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (isEditMode) {
            fetchProductVariation();
        }
    }, [id, isEditMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => {
        const { name, value } = e.target as { name: string; value: string };
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.variation_type || !formData.name) {
            setError('Please fill in all required fields.');
            return;
        }

        try {
            if (isEditMode) {
                await productVariationService.update(id!, formData);
            } else {
                await productVariationService.create(formData);
            }
            navigate('/admin/product-variations');
        } catch (err) {
            setError(`Failed to ${isEditMode ? 'update' : 'create'} product variation. Please check your input and try again.`);
        }
    };

    const handleCancel = () => {
        navigate('/admin/product-variations');
    };

    return {
        isSuperuser,
        formData, loading, error, isEditMode,
        handleChange, handleSubmit, handleCancel,
    };
};

export default useProductVariationFormVM;
