import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import storeProductService from '../../../services/storeProductService';
import examSessionSubjectService from '../../../services/examSessionSubjectService';
import productProductVariationService from '../../../services/productProductVariationService';
import type { StoreProductInput } from '../../../types/storeProduct';

export interface StoreProductFormVM {
    isSuperuser: boolean;
    formData: StoreProductInput;
    examSessionSubjects: any[];
    productProductVariations: any[];
    loading: boolean;
    error: string | null;
    isEditMode: boolean;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    handleCancel: () => void;
}

const useStoreProductFormVM = (): StoreProductFormVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { isSuperuser } = useAuth();
    const isEditMode = !!id;

    const [formData, setFormData] = useState<StoreProductInput>({
        exam_session_subject: '',
        product_product_variation: '',
        is_active: true,
        product_code: '',
    });
    const [examSessionSubjects, setExamSessionSubjects] = useState<any[]>([]);
    const [productProductVariations, setProductProductVariations] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const [essData, ppvData] = await Promise.all([
                    examSessionSubjectService.getAll(),
                    productProductVariationService.getAll(),
                ]);
                setExamSessionSubjects(Array.isArray(essData) ? essData : []);
                setProductProductVariations(Array.isArray(ppvData) ? ppvData : []);
            } catch (err) {
                console.error('Error fetching dropdown data:', err);
                setError('Failed to load dropdown options.');
            }
        };

        const fetchStoreProduct = async () => {
            try {
                const data = await storeProductService.getById(id!);
                setFormData({
                    exam_session_subject: data.exam_session_subject?.id || data.exam_session_subject || '',
                    product_product_variation: data.product_product_variation?.id || data.product_product_variation || '',
                    is_active: data.is_active !== undefined ? data.is_active : true,
                    product_code: data.product_code || '',
                });
            } catch (err) {
                setError('Failed to load store product data.');
                console.error(err);
            }
        };

        const init = async () => {
            await fetchDropdownData();
            if (isEditMode) {
                await fetchStoreProduct();
            }
            setLoading(false);
        };

        init();
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
        if (!formData.exam_session_subject || !formData.product_product_variation) {
            setError('Please select both an exam session subject and a product product variation.');
            return;
        }
        try {
            const submitData = {
                exam_session_subject: formData.exam_session_subject,
                product_product_variation: formData.product_product_variation,
                is_active: formData.is_active,
            };
            if (isEditMode) {
                await storeProductService.update(id!, submitData);
            } else {
                await storeProductService.create(submitData);
            }
            navigate('/admin/store-products');
        } catch (err: any) {
            setError(`Failed to ${isEditMode ? 'update' : 'create'} store product: ${err.response?.data?.message || err.message}`);
            console.error(err);
        }
    };

    const handleCancel = () => {
        navigate('/admin/store-products');
    };

    return {
        isSuperuser,
        formData, examSessionSubjects, productProductVariations,
        loading, error, isEditMode,
        handleChange, handleSubmit, handleCancel,
    };
};

export default useStoreProductFormVM;
