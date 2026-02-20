import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import emailService from '../../../../services/emailService';
import type { ClosingSalutation, SignatureType, StaffNameFormat } from '../../../../types/email';

interface SalutationFormData {
    name: string;
    display_name: string;
    sign_off_text: string;
    signature_type: SignatureType;
    team_signature: string;
    staff_name_format: StaffNameFormat;
    is_active: boolean;
}

const initialFormData: SalutationFormData = {
    name: '',
    display_name: '',
    sign_off_text: 'Kind Regards',
    signature_type: 'team',
    team_signature: '',
    staff_name_format: 'full_name',
    is_active: true,
};

export interface ClosingSalutationFormVM {
    formData: SalutationFormData;
    loading: boolean;
    error: string | null;
    isSubmitting: boolean;
    isEditMode: boolean;
    handleChange: (field: keyof SalutationFormData, value: any) => void;
    handleSubmit: () => Promise<void>;
    handleCancel: () => void;
}

const useClosingSalutationFormVM = (): ClosingSalutationFormVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id && id !== 'new');

    const [formData, setFormData] = useState<SalutationFormData>(initialFormData);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const fetchSalutation = useCallback(async () => {
        if (!id || id === 'new') return;
        try {
            setLoading(true);
            const salutation: ClosingSalutation = await emailService.getClosingSalutationById(Number(id));
            setFormData({
                name: salutation.name,
                display_name: salutation.display_name,
                sign_off_text: salutation.sign_off_text,
                signature_type: salutation.signature_type,
                team_signature: salutation.team_signature,
                staff_name_format: salutation.staff_name_format,
                is_active: salutation.is_active,
            });
            setError(null);
        } catch (err: any) {
            console.error('Error fetching closing salutation:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to load closing salutation.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (isEditMode) {
            fetchSalutation();
        }
    }, [isEditMode, fetchSalutation]);

    const handleChange = useCallback((field: keyof SalutationFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSubmit = useCallback(async () => {
        try {
            setIsSubmitting(true);
            setError(null);

            const submitData: Partial<ClosingSalutation> = {
                name: formData.name,
                display_name: formData.display_name,
                sign_off_text: formData.sign_off_text,
                signature_type: formData.signature_type,
                team_signature: formData.team_signature,
                staff_name_format: formData.staff_name_format,
                is_active: formData.is_active,
            };

            if (isEditMode && id) {
                await emailService.updateClosingSalutation(Number(id), submitData);
            } else {
                await emailService.createClosingSalutation(submitData);
            }

            navigate('/admin/email/closing-salutations');
        } catch (err: any) {
            console.error('Error saving closing salutation:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to save closing salutation.');
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, isEditMode, id, navigate]);

    const handleCancel = useCallback(() => {
        navigate('/admin/email/closing-salutations');
    }, [navigate]);

    return {
        formData,
        loading,
        error,
        isSubmitting,
        isEditMode,
        handleChange,
        handleSubmit,
        handleCancel,
    };
};

export default useClosingSalutationFormVM;
