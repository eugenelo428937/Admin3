import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.tsx';
import subjectService from '../../../services/subjectService';
import type { Subject } from '../../../types/subject';

export interface SubjectDetailVM {
    // Auth
    isSuperuser: boolean;

    // Data state
    subject: Subject | null;
    loading: boolean;
    error: string | null;

    // Route params
    id: string | undefined;

    // Actions
    handleDelete: () => Promise<void>;
    handleBack: () => void;
}

const useSubjectDetailVM = (): SubjectDetailVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { isSuperuser } = useAuth();

    const [subject, setSubject] = useState<Subject | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSubject = async () => {
            try {
                const data = await subjectService.getById(id!);
                setSubject(data);
            } catch (err) {
                setError('Failed to fetch subject details. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchSubject();
    }, [id]);

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this subject?')) return;
        try {
            await subjectService.delete(id!);
            navigate('/admin/subjects');
        } catch (err) {
            setError('Failed to delete subject. Please try again later.');
        }
    };

    const handleBack = () => {
        navigate('/admin/subjects');
    };

    return {
        isSuperuser,
        subject, loading, error,
        id,
        handleDelete, handleBack,
    };
};

export default useSubjectDetailVM;
