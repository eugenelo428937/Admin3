import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import subjectService from '../../../services/subjectService';
import catalogBundleService from '../../../services/catalogBundleService';
import type { ProductBundleInput } from '../../../types/productBundle';
import type { Subject } from '../../../types/subject';

export interface ProductBundleFormVM {
    // Auth
    isSuperuser: boolean;

    // Form state
    formData: ProductBundleInput;
    subjects: Subject[];
    loading: boolean;
    error: string | null;
    isEditMode: boolean;

    // Actions
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    handleCancel: () => void;
}

const useProductBundleFormVM = (): ProductBundleFormVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { isSuperuser } = useAuth();
    const isEditMode = !!id;

    const [formData, setFormData] = useState<ProductBundleInput>({
        bundle_name: '',
        subject: '',
        description: '',
        is_featured: false,
        is_active: true,
        display_order: 0,
    });

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const data = await subjectService.getAll();
                setSubjects(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching subjects:', err);
                setError('Failed to load subjects. Please try again.');
            }
        };

        const fetchBundle = async () => {
            try {
                const data = await catalogBundleService.getById(id!);
                setFormData({
                    bundle_name: data.bundle_name || '',
                    subject: (data.subject as { id: number; code: string })?.id || data.subject || '',
                    description: data.description || '',
                    is_featured: data.is_featured !== undefined ? data.is_featured : false,
                    is_active: data.is_active !== undefined ? data.is_active : true,
                    display_order: data.display_order !== undefined ? data.display_order : 0,
                });
            } catch (err) {
                setError('Failed to fetch product bundle details. Please try again.');
            }
        };

        const initializeForm = async () => {
            await fetchSubjects();
            if (isEditMode) {
                await fetchBundle();
            }
            setLoading(false);
        };

        initializeForm();
    }, [id, isEditMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => {
        const target = e.target as HTMLInputElement;
        const { name, value, type, checked } = target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.bundle_name) {
            setError('Please provide a bundle name.');
            return;
        }

        try {
            const submitData = {
                ...formData,
                display_order: parseInt(String(formData.display_order), 10) || 0,
            };

            if (isEditMode) {
                await catalogBundleService.update(id!, submitData);
            } else {
                await catalogBundleService.create(submitData);
            }
            navigate('/admin/product-bundles');
        } catch (err) {
            setError(`Failed to ${isEditMode ? 'update' : 'create'} product bundle. Please check your input and try again.`);
        }
    };

    const handleCancel = () => {
        navigate('/admin/product-bundles');
    };

    return {
        isSuperuser,
        formData, subjects, loading, error, isEditMode,
        handleChange, handleSubmit, handleCancel,
    };
};

export default useProductBundleFormVM;
