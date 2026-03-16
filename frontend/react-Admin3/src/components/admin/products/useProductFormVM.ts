import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import catalogProductService from '../../../services/catalogProductService';
import type { ProductInput } from '../../../types/product';

export interface ProductFormVM {
    isSuperuser: boolean;
    formData: ProductInput;
    loading: boolean;
    error: string | null;
    isEditMode: boolean;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    handleCancel: () => void;
}

const useProductFormVM = (): ProductFormVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { isSuperuser } = useAuth();
    const isEditMode = !!id;

    const [formData, setFormData] = useState<ProductInput>({
        code: '',
        fullname: '',
        shortname: '',
        description: '',
        active: true,
    });
    const [loading, setLoading] = useState<boolean>(isEditMode);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isEditMode) {
            const fetchProduct = async () => {
                try {
                    const data = await catalogProductService.getById(id!);
                    setFormData({
                        code: data.code || '',
                        fullname: data.fullname || '',
                        shortname: data.shortname || '',
                        description: data.description || '',
                        active: data.active,
                    });
                    setError(null);
                } catch (err) {
                    setError('Failed to load product data');
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            fetchProduct();
        }
    }, [id, isEditMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.fullname || !formData.shortname) {
            setError('Please fill in all required fields');
            return;
        }
        try {
            if (isEditMode) {
                await catalogProductService.update(id!, formData);
            } else {
                await catalogProductService.create(formData);
            }
            navigate('/admin/products');
        } catch (err: any) {
            setError(`Failed to ${isEditMode ? 'update' : 'create'} product: ${err.response?.data?.message || err.message}`);
            console.error(err);
        }
    };

    const handleCancel = () => {
        navigate('/admin/products');
    };

    return {
        isSuperuser,
        formData, loading, error, isEditMode,
        handleChange, handleSubmit, handleCancel,
    };
};

export default useProductFormVM;
