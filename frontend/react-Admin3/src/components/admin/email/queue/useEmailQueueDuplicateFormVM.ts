import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import emailService from '../../../../services/emailService';
import type { EmailQueue, EmailQueueDuplicateInput } from '../../../../types/email';

const initialFormData: EmailQueueDuplicateInput = {
    to_emails: [],
    cc_emails: [],
    bcc_emails: [],
    from_email: '',
    reply_to_email: '',
    subject: '',
};

interface EmailQueueDuplicateFormVM {
    originalItem: EmailQueue | null;
    formData: EmailQueueDuplicateInput;
    loading: boolean;
    error: string | null;
    isSubmitting: boolean;
    fetchOriginal: () => Promise<void>;
    handleChange: (field: keyof EmailQueueDuplicateInput, value: string) => void;
    handleEmailListChange: (field: keyof EmailQueueDuplicateInput, value: string[]) => void;
    handleSubmit: () => Promise<void>;
}

export const useEmailQueueDuplicateFormVM = (): EmailQueueDuplicateFormVM => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [originalItem, setOriginalItem] = useState<EmailQueue | null>(null);
    const [formData, setFormData] = useState<EmailQueueDuplicateInput>(initialFormData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchOriginal = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await emailService.getQueueItemById(Number(id));
            setOriginalItem(data);
            setFormData({
                to_emails: [...data.to_emails],
                cc_emails: [...data.cc_emails],
                bcc_emails: [...data.bcc_emails],
                from_email: data.from_email,
                reply_to_email: data.reply_to_email,
                subject: data.subject,
            });
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to load original queue item');
        } finally {
            setLoading(false);
        }
    }, [id]);

    const handleChange = useCallback((field: keyof EmailQueueDuplicateInput, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleEmailListChange = useCallback((field: keyof EmailQueueDuplicateInput, value: string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!id) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await emailService.duplicateQueueItem(Number(id), formData);
            navigate('/admin/email/queue');
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to duplicate queue item');
        } finally {
            setIsSubmitting(false);
        }
    }, [id, formData, navigate]);

    return {
        originalItem,
        formData,
        loading,
        error,
        isSubmitting,
        fetchOriginal,
        handleChange,
        handleEmailListChange,
        handleSubmit,
    };
};
