import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import emailService from '../../../../services/emailService';
import type { EmailTemplate, ClosingSalutationList } from '../../../../types/email';

export interface EmailTemplateFormVM {
    formData: Partial<EmailTemplate>;
    salutations: ClosingSalutationList[];
    loading: boolean;
    error: string | null;
    isSubmitting: boolean;
    activeTab: number;
    isEditMode: boolean;
    fetchTemplate: () => Promise<void>;
    handleChange: (field: keyof EmailTemplate, value: any) => void;
    handleSubmit: () => Promise<void>;
    setActiveTab: (tab: number) => void;
}

const DEFAULT_FORM_DATA: Partial<EmailTemplate> = {
    name: '',
    template_type: 'custom',
    display_name: '',
    description: '',
    subject_template: '',
    use_master_template: true,
    from_email: '',
    reply_to_email: '',
    default_priority: 'normal',
    enable_tracking: false,
    enable_queue: true,
    mjml_content: '',
    is_active: true,
};

const useEmailTemplateFormVM = (): EmailTemplateFormVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id && id !== 'new');

    const [formData, setFormData] = useState<Partial<EmailTemplate>>(DEFAULT_FORM_DATA);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<number>(0);
    const [salutations, setSalutations] = useState<ClosingSalutationList[]>([]);

    const fetchTemplate = useCallback(async () => {
        if (!isEditMode || !id) return;
        try {
            setLoading(true);
            const template = await emailService.getTemplateById(Number(id));
            setFormData(template);
            setError(null);
        } catch (err) {
            console.error('Error fetching email template:', err);
            setError('Failed to load email template.');
        } finally {
            setLoading(false);
        }
    }, [id, isEditMode]);

    useEffect(() => {
        if (isEditMode) {
            fetchTemplate();
        }
    }, [isEditMode, fetchTemplate]);

    useEffect(() => {
        const fetchSalutations = async () => {
            try {
                const { results } = await emailService.getClosingSalutations({ page_size: 100 });
                setSalutations(results as ClosingSalutationList[]);
            } catch (err) {
                console.error('Error fetching closing salutations:', err);
            }
        };
        fetchSalutations();
    }, []);

    const handleChange = (field: keyof EmailTemplate, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            setError(null);

            if (isEditMode && id) {
                await emailService.updateTemplate(Number(id), formData);
            } else {
                await emailService.createTemplate(formData);
            }

            navigate('/admin/email/templates');
        } catch (err: any) {
            console.error('Error saving email template:', err);
            const detail = err?.response?.data?.detail || err?.response?.data;
            if (typeof detail === 'string') {
                setError(detail);
            } else if (typeof detail === 'object') {
                const messages = Object.entries(detail)
                    .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
                    .join('; ');
                setError(messages);
            } else {
                setError('Failed to save email template. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        formData,
        salutations,
        loading,
        error,
        isSubmitting,
        activeTab,
        isEditMode,
        fetchTemplate,
        handleChange,
        handleSubmit,
        setActiveTab,
    };
};

export default useEmailTemplateFormVM;
