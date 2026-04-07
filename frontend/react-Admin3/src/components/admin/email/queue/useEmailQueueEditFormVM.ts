import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import emailService from '../../../../services/emailService';
import type { EmailQueue, EmailQueueEditInput } from '../../../../types/email';

interface EmailFields {
    to_emails: string[];
    cc_emails: string[];
    bcc_emails: string[];
    from_email: string;
    reply_to_email: string;
    subject: string;
}

const initialEmailFields: EmailFields = {
    to_emails: [],
    cc_emails: [],
    bcc_emails: [],
    from_email: '',
    reply_to_email: '',
    subject: '',
};

export interface EmailQueueEditFormVM {
    queueItem: EmailQueue | null;
    emailFields: EmailFields;
    loading: boolean;
    error: string | null;
    isSubmitting: boolean;
    initialMjml: string;
    initialBasicContent: string;
    fetchItem: () => Promise<void>;
    handleFieldChange: (field: keyof EmailFields, value: string) => void;
    handleEmailListChange: (field: keyof EmailFields, value: string[]) => void;
    handleSubmit: (mjmlContent: string, basicContent: string) => Promise<void>;
}

export const useEmailQueueEditFormVM = (): EmailQueueEditFormVM => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [queueItem, setQueueItem] = useState<EmailQueue | null>(null);
    const [emailFields, setEmailFields] = useState<EmailFields>(initialEmailFields);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [initialMjml, setInitialMjml] = useState('');
    const [initialBasicContent, setInitialBasicContent] = useState('');

    const fetchItem = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await emailService.getQueueItemById(Number(id));
            setQueueItem(data);
            setEmailFields({
                to_emails: [...data.to_emails],
                cc_emails: [...data.cc_emails],
                bcc_emails: [...data.bcc_emails],
                from_email: data.from_email,
                reply_to_email: data.reply_to_email,
                subject: data.subject,
            });
            // Use override content if it exists, otherwise fall back to
            // the template version content so the editor starts pre-populated
            setInitialMjml(data.content_override_mjml || data.template_version_mjml || '');
            setInitialBasicContent(data.content_override_basic || data.template_version_basic || '');
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to load queue item');
        } finally {
            setLoading(false);
        }
    }, [id]);

    const handleFieldChange = useCallback((field: keyof EmailFields, value: string) => {
        setEmailFields(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleEmailListChange = useCallback((field: keyof EmailFields, value: string[]) => {
        setEmailFields(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSubmit = useCallback(async (mjmlContent: string, basicContent: string) => {
        if (!id) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const payload: EmailQueueEditInput = {
                ...emailFields,
                content_override_mjml: mjmlContent,
                content_override_basic: basicContent,
            };
            await emailService.editQueueItem(Number(id), payload);
            navigate('/admin/email/queue');
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to save queue item edits');
        } finally {
            setIsSubmitting(false);
        }
    }, [id, emailFields, navigate]);

    return {
        queueItem,
        emailFields,
        loading,
        error,
        isSubmitting,
        initialMjml,
        initialBasicContent,
        fetchItem,
        handleFieldChange,
        handleEmailListChange,
        handleSubmit,
    };
};
