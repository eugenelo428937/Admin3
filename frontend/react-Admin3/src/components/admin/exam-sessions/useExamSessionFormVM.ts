import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.js';
import examSessionService from '../../../services/examSessionService';
import moment from 'moment';
import type { ExamSessionInput } from '../../../types/examSession';

export interface ExamSessionFormVM {
    // Auth
    isSuperuser: boolean;

    // Form state
    formData: ExamSessionInput;
    error: string | null;
    isSubmitting: boolean;
    isEditMode: boolean;

    // Actions
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    handleCancel: () => void;
}

const useExamSessionFormVM = (): ExamSessionFormVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { isSuperuser } = useAuth();
    const isEditMode = !!id;

    const [formData, setFormData] = useState<ExamSessionInput>({
        session_code: '',
        start_date: '',
        end_date: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const fetchExamSession = useCallback(async () => {
        try {
            const data = await examSessionService.getById(id!);
            setFormData({
                session_code: data.session_code,
                start_date: moment(data.start_date).format('YYYY-MM-DDTHH:mm'),
                end_date: moment(data.end_date).format('YYYY-MM-DDTHH:mm'),
            });
        } catch (err) {
            setError('Failed to fetch exam session');
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchExamSession();
        }
    }, [id, fetchExamSession]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.end_date <= formData.start_date) {
            setError('End date must be after start date');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            if (id) {
                await examSessionService.update(id, formData);
            } else {
                await examSessionService.create(formData);
            }
            navigate('/admin/exam-sessions');
        } catch (err) {
            setError('Failed to save exam session');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate('/admin/exam-sessions');
    };

    return {
        isSuperuser,
        formData, error, isSubmitting, isEditMode,
        handleChange, handleSubmit, handleCancel,
    };
};

export default useExamSessionFormVM;
