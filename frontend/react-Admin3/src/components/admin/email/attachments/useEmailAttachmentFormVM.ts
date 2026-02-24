import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import emailService from '../../../../services/emailService';
import type { EmailAttachment, AttachmentType } from '../../../../types/email';

interface AttachmentFormData {
    name: string;
    display_name: string;
    attachment_type: AttachmentType;
    description: string;
    is_conditional: boolean;
    condition_rules: string;
    is_active: boolean;
}

const initialFormData: AttachmentFormData = {
    name: '',
    display_name: '',
    attachment_type: 'static',
    description: '',
    is_conditional: false,
    condition_rules: '{}',
    is_active: true,
};

export interface EmailAttachmentFormVM {
    formData: AttachmentFormData;
    selectedFile: File | null;
    currentFileInfo: { name: string; size: number; url: string } | null;
    loading: boolean;
    error: string | null;
    isSubmitting: boolean;
    isEditMode: boolean;
    handleChange: (field: keyof AttachmentFormData, value: any) => void;
    handleFileSelect: (file: File | null) => void;
    handleSubmit: () => Promise<void>;
    handleCancel: () => void;
}

const useEmailAttachmentFormVM = (): EmailAttachmentFormVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id && id !== 'new');

    const [formData, setFormData] = useState<AttachmentFormData>(initialFormData);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [currentFileInfo, setCurrentFileInfo] = useState<{ name: string; size: number; url: string } | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const fetchAttachment = useCallback(async () => {
        if (!id || id === 'new') return;
        try {
            setLoading(true);
            const attachment: EmailAttachment = await emailService.getAttachmentById(Number(id));
            setFormData({
                name: attachment.name,
                display_name: attachment.display_name,
                attachment_type: attachment.attachment_type,
                description: attachment.description,
                is_conditional: attachment.is_conditional,
                condition_rules: JSON.stringify(attachment.condition_rules, null, 2),
                is_active: attachment.is_active,
            });
            if (attachment.file_path || attachment.file_url) {
                setCurrentFileInfo({
                    name: attachment.file_path?.split('/').pop() || 'Current file',
                    size: attachment.file_size,
                    url: attachment.file_url,
                });
            }
            setError(null);
        } catch (err: any) {
            console.error('Error fetching attachment:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to load attachment.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (isEditMode) {
            fetchAttachment();
        }
    }, [isEditMode, fetchAttachment]);

    const handleChange = useCallback((field: keyof AttachmentFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleFileSelect = useCallback((file: File | null) => {
        setSelectedFile(file);
    }, []);

    const handleSubmit = useCallback(async () => {
        try {
            setIsSubmitting(true);
            setError(null);

            const submitData = new FormData();
            submitData.append('name', formData.name);
            submitData.append('display_name', formData.display_name);
            submitData.append('attachment_type', formData.attachment_type);
            submitData.append('description', formData.description);
            submitData.append('is_conditional', String(formData.is_conditional));
            submitData.append('is_active', String(formData.is_active));

            try {
                const conditionRules = JSON.parse(formData.condition_rules);
                submitData.append('condition_rules', JSON.stringify(conditionRules));
            } catch {
                submitData.append('condition_rules', '{}');
            }

            if (selectedFile) {
                submitData.append('file', selectedFile);
            }

            if (isEditMode && id) {
                await emailService.updateAttachment(Number(id), submitData);
            } else {
                await emailService.createAttachment(submitData);
            }

            navigate('/admin/email/attachments');
        } catch (err: any) {
            console.error('Error saving attachment:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to save attachment.');
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, selectedFile, isEditMode, id, navigate]);

    const handleCancel = useCallback(() => {
        navigate('/admin/email/attachments');
    }, [navigate]);

    return {
        formData,
        selectedFile,
        currentFileInfo,
        loading,
        error,
        isSubmitting,
        isEditMode,
        handleChange,
        handleFileSelect,
        handleSubmit,
        handleCancel,
    };
};

export default useEmailAttachmentFormVM;
