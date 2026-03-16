import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.js';
import subjectService from '../../../services/subjectService';
import type { Subject, SubjectInput } from '../../../types/subject';

export interface SubjectFormVM {
    // Auth
    isSuperuser: boolean;

    // Form state
    formData: SubjectInput;
    loading: boolean;
    error: string | null;
    isEditMode: boolean;

    // Actions
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    handleCancel: () => void;
}

const useSubjectFormVM = (): SubjectFormVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { isSuperuser } = useAuth();
    const isEditMode = !!id;

    const [formData, setFormData] = useState<SubjectInput>({
        code: '',
        description: '',
        active: true,
    });
    const [loading, setLoading] = useState<boolean>(isEditMode);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSubject = async () => {
            try {
                const data = await subjectService.getById(id!);
                setFormData({
                    code: data.code,
                    description: data.description,
                    active: data.active,
                });
            } catch (err) {
                setError('Failed to fetch subject details. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (isEditMode) {
            fetchSubject();
        }
    }, [id, isEditMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.code) {
            setError('Please provide a subject code.');
            return;
        }

        try {
            if (isEditMode) {
                await subjectService.update(id!, formData);
            } else {
                await subjectService.create(formData);
            }
            navigate('/admin/subjects');
        } catch (err) {
            setError(`Failed to ${isEditMode ? 'update' : 'create'} subject. Please check your input and try again.`);
        }
    };

    const handleCancel = () => {
        navigate('/admin/subjects');
    };

    return {
        isSuperuser,
        formData, loading, error, isEditMode,
        handleChange, handleSubmit, handleCancel,
    };
};

export default useSubjectFormVM;
