import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import emailService from '../../../../services/emailService';
import type { EmailContentPlaceholder, EmailTemplate, InsertPosition } from '../../../../types/email';

interface PlaceholderFormData {
    name: string;
    display_name: string;
    description: string;
    default_content_template: string;
    content_variables: string;
    insert_position: InsertPosition;
    templates: number[];
    is_required: boolean;
    allow_multiple_rules: boolean;
    content_separator: string;
    is_active: boolean;
}

const initialFormData: PlaceholderFormData = {
    name: '',
    display_name: '',
    description: '',
    default_content_template: '',
    content_variables: '{}',
    insert_position: 'replace',
    templates: [],
    is_required: false,
    allow_multiple_rules: false,
    content_separator: '',
    is_active: true,
};

export interface EmailPlaceholderFormVM {
    formData: PlaceholderFormData;
    templates: EmailTemplate[];
    loading: boolean;
    error: string | null;
    isSubmitting: boolean;
    isEditMode: boolean;
    handleChange: (field: keyof PlaceholderFormData, value: any) => void;
    handleTemplatesChange: (templateIds: number[]) => void;
    handleSubmit: () => Promise<void>;
    handleCancel: () => void;
}

const useEmailPlaceholderFormVM = (): EmailPlaceholderFormVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id && id !== 'new');

    const [formData, setFormData] = useState<PlaceholderFormData>(initialFormData);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const fetchTemplates = useCallback(async () => {
        try {
            const { results } = await emailService.getTemplates({ page_size: 200 });
            setTemplates(results as EmailTemplate[]);
        } catch (err: any) {
            console.error('Error fetching templates:', err);
        }
    }, []);

    const fetchPlaceholder = useCallback(async () => {
        if (!id || id === 'new') return;
        try {
            setLoading(true);
            const placeholder: EmailContentPlaceholder = await emailService.getPlaceholderById(Number(id));
            setFormData({
                name: placeholder.name,
                display_name: placeholder.display_name,
                description: placeholder.description,
                default_content_template: placeholder.default_content_template,
                content_variables: JSON.stringify(placeholder.content_variables, null, 2),
                insert_position: placeholder.insert_position,
                templates: placeholder.templates || [],
                is_required: placeholder.is_required,
                allow_multiple_rules: placeholder.allow_multiple_rules,
                content_separator: placeholder.content_separator,
                is_active: placeholder.is_active,
            });
            setError(null);
        } catch (err: any) {
            console.error('Error fetching placeholder:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to load placeholder.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTemplates();
        if (isEditMode) {
            fetchPlaceholder();
        }
    }, [isEditMode, fetchPlaceholder, fetchTemplates]);

    const handleChange = useCallback((field: keyof PlaceholderFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleTemplatesChange = useCallback((templateIds: number[]) => {
        setFormData(prev => ({ ...prev, templates: templateIds }));
    }, []);

    const handleSubmit = useCallback(async () => {
        try {
            setIsSubmitting(true);
            setError(null);

            let contentVariables: Record<string, any> = {};
            try {
                contentVariables = JSON.parse(formData.content_variables);
            } catch {
                contentVariables = {};
            }

            const submitData: Partial<EmailContentPlaceholder> = {
                name: formData.name,
                display_name: formData.display_name,
                description: formData.description,
                default_content_template: formData.default_content_template,
                content_variables: contentVariables,
                insert_position: formData.insert_position,
                templates: formData.templates,
                is_required: formData.is_required,
                allow_multiple_rules: formData.allow_multiple_rules,
                content_separator: formData.content_separator,
                is_active: formData.is_active,
            };

            if (isEditMode && id) {
                await emailService.updatePlaceholder(Number(id), submitData);
            } else {
                await emailService.createPlaceholder(submitData);
            }

            navigate('/admin/email/placeholders');
        } catch (err: any) {
            console.error('Error saving placeholder:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to save placeholder.');
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, isEditMode, id, navigate]);

    const handleCancel = useCallback(() => {
        navigate('/admin/email/placeholders');
    }, [navigate]);

    return {
        formData,
        templates,
        loading,
        error,
        isSubmitting,
        isEditMode,
        handleChange,
        handleTemplatesChange,
        handleSubmit,
        handleCancel,
    };
};

export default useEmailPlaceholderFormVM;
