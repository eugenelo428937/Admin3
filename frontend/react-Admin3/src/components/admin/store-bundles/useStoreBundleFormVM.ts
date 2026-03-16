import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import storeBundleService from '../../../services/storeBundleService';
import catalogBundleService from '../../../services/catalogBundleService';
import examSessionSubjectService from '../../../services/examSessionSubjectService';
import type { StoreBundleInput } from '../../../types/storeBundle';

interface BundleTemplate {
    id: number;
    name?: string;
    code?: string;
}

interface ExamSessionSubject {
    id: number;
    subject_code?: string;
    session_code?: string;
    subject?: { code?: string };
    exam_session?: { session_code?: string };
}

export interface StoreBundleFormVM {
    // Auth
    isSuperuser: boolean;

    // Form state
    formData: StoreBundleInput;
    loading: boolean;
    error: string | null;
    isEditMode: boolean;

    // Dropdown data
    bundleTemplates: BundleTemplate[];
    examSessionSubjects: ExamSessionSubject[];

    // Actions
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    handleCancel: () => void;
}

const useStoreBundleFormVM = (): StoreBundleFormVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { isSuperuser } = useAuth();
    const isEditMode = !!id;

    const [formData, setFormData] = useState<StoreBundleInput>({
        bundle_template: '',
        exam_session_subject: '',
        override_name: '',
        override_description: '',
        is_active: true,
    });

    const [bundleTemplates, setBundleTemplates] = useState<BundleTemplate[]>([]);
    const [examSessionSubjects, setExamSessionSubjects] = useState<ExamSessionSubject[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const [templatesData, essData] = await Promise.all([
                    catalogBundleService.getAll(),
                    examSessionSubjectService.getAll(),
                ]);
                setBundleTemplates(Array.isArray(templatesData) ? templatesData : []);
                setExamSessionSubjects(Array.isArray(essData) ? essData : []);
            } catch (err) {
                console.error('Error fetching dropdown data:', err);
                setError('Failed to load dropdown options.');
            }
        };

        const fetchStoreBundle = async () => {
            try {
                const data = await storeBundleService.getById(id!);
                setFormData({
                    bundle_template: (data as any).bundle_template?.id || (data as any).bundle_template || '',
                    exam_session_subject: (data as any).exam_session_subject?.id || (data as any).exam_session_subject || '',
                    override_name: (data as any).override_name || '',
                    override_description: (data as any).override_description || '',
                    is_active: (data as any).is_active !== undefined ? (data as any).is_active : true,
                });
            } catch (err) {
                setError('Failed to load store bundle data.');
                console.error(err);
            }
        };

        const init = async () => {
            await fetchDropdownData();
            if (isEditMode) {
                await fetchStoreBundle();
            }
            setLoading(false);
        };

        init();
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

        if (!formData.bundle_template || !formData.exam_session_subject) {
            setError('Please select both a bundle template and an exam session subject.');
            return;
        }

        try {
            const submitData: StoreBundleInput = {
                bundle_template: formData.bundle_template,
                exam_session_subject: formData.exam_session_subject,
                override_name: formData.override_name,
                override_description: formData.override_description,
                is_active: formData.is_active,
            };

            if (isEditMode) {
                await storeBundleService.update(id!, submitData);
            } else {
                await storeBundleService.create(submitData);
            }
            navigate('/admin/store-bundles');
        } catch (err: any) {
            setError(`Failed to ${isEditMode ? 'update' : 'create'} store bundle: ${err.response?.data?.message || err.message}`);
            console.error(err);
        }
    };

    const handleCancel = () => {
        navigate('/admin/store-bundles');
    };

    return {
        isSuperuser,
        formData, loading, error, isEditMode,
        bundleTemplates, examSessionSubjects,
        handleChange, handleSubmit, handleCancel,
    };
};

export default useStoreBundleFormVM;
