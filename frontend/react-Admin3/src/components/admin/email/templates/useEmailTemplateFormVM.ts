import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import emailService from '../../../../services/emailService';
import type { EmailTemplate, ClosingSalutationList, EmailTemplateVersion } from '../../../../types/email';

export type FormTab = 'general' | 'editor' | 'attachments' | 'content-rules';

export interface EmailTemplateFormVM {
    formData: Partial<EmailTemplate>;
    salutations: ClosingSalutationList[];
    versions: EmailTemplateVersion[];
    loading: boolean;
    error: string | null;
    isSubmitting: boolean;
    activeTab: FormTab;
    isEditMode: boolean;
    fetchTemplate: () => Promise<void>;
    fetchVersions: () => Promise<void>;
    handleChange: (field: keyof EmailTemplate, value: any) => void;
    handleSubmit: () => Promise<void>;
    setActiveTab: (tab: FormTab) => void;
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
    const [activeTab, setActiveTab] = useState<FormTab>('general');
    const [salutations, setSalutations] = useState<ClosingSalutationList[]>([]);
    const [versions, setVersions] = useState<EmailTemplateVersion[]>([]);

    const fetchVersions = useCallback(async () => {
        if (!isEditMode || !id) return;
        try {
            const results = await emailService.getTemplateVersions(Number(id));
            setVersions(results);
        } catch (err) {
            console.error('Error fetching template versions:', err);
        }
    }, [id, isEditMode]);

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
            fetchVersions();
        }
    }, [isEditMode, fetchTemplate, fetchVersions]);

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
                toast.success('Template saved successfully');
                // Refresh version list and clear change_note after save
                await fetchVersions();
                setFormData((prev) => ({ ...prev, change_note: '' }));
            } else {
                const created = await emailService.createTemplate(formData);
                toast.success('Template created successfully');
                // Navigate to edit mode for the newly created template
                navigate(`/admin/email/templates/${created.id}`, { replace: true });
            }
        } catch (err: any) {
            console.error('Error saving email template:', err);
            const detail = err?.response?.data?.detail || err?.response?.data;
            if (typeof detail === 'string') {
                setError(detail);
                toast.error(detail);
            } else if (typeof detail === 'object') {
                const messages = Object.entries(detail)
                    .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
                    .join('; ');
                setError(messages);
                toast.error('Failed to save template');
            } else {
                setError('Failed to save email template. Please try again.');
                toast.error('Failed to save email template');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        formData,
        salutations,
        versions,
        loading,
        error,
        isSubmitting,
        activeTab,
        isEditMode,
        fetchTemplate,
        fetchVersions,
        handleChange,
        handleSubmit,
        setActiveTab,
    };
};

export default useEmailTemplateFormVM;
