import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { SelectChangeEvent } from '@mui/material';
import examSessionSubjectService from '../../../services/examSessionSubjectService';
import examSessionService from '../../../services/examSessionService';
import subjectService from '../../../services/subjectService';
import type { ExamSession } from '../../../types/examSession';
import type { Subject } from '../../../types/subject';

export interface ExamSessionSubjectFormData {
    exam_session: string | number;
    subject: string | number;
    is_active: boolean;
}

export interface ExamSessionSubjectFormVM {
    // Form state
    formData: ExamSessionSubjectFormData;
    examSessions: ExamSession[];
    subjects: Subject[];
    loading: boolean;
    error: string | null;
    isSubmitting: boolean;
    isEditMode: boolean;

    // Actions
    handleSelectChange: (event: SelectChangeEvent) => void;
    handleCheckboxChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
    handleCancel: () => void;
}

const useExamSessionSubjectFormVM = (): ExamSessionSubjectFormVM => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;

    const [formData, setFormData] = useState<ExamSessionSubjectFormData>({
        exam_session: '',
        subject: '',
        is_active: true,
    });
    const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const [examSessionsData, subjectsData] = await Promise.all([
                    examSessionService.getAll(),
                    subjectService.getAll(),
                ]);
                setExamSessions(Array.isArray(examSessionsData) ? examSessionsData : []);
                setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
            } catch (err) {
                setError('Failed to load dropdown data. Please try again.');
            }
        };

        const fetchExamSessionSubject = async () => {
            try {
                const data = await examSessionSubjectService.getById(id!);
                const record = data as any;
                setFormData({
                    exam_session: record.exam_session?.id ?? record.exam_session ?? '',
                    subject: record.subject?.id ?? record.subject ?? '',
                    is_active: record.is_active !== undefined ? record.is_active : true,
                });
            } catch (err) {
                setError('Failed to fetch exam session subject details. Please try again.');
            }
        };

        const initializeForm = async () => {
            await fetchDropdownData();
            if (isEditMode) {
                await fetchExamSessionSubject();
            }
            setLoading(false);
        };

        initializeForm();
    }, [id, isEditMode]);

    const handleSelectChange = (event: SelectChangeEvent) => {
        const { name, value } = event.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = event.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.exam_session || !formData.subject) {
            setError('Please select both an exam session and a subject.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            if (isEditMode) {
                await examSessionSubjectService.update(id!, formData);
            } else {
                await examSessionSubjectService.create(formData);
            }
            navigate('/admin/exam-session-subjects');
        } catch (err) {
            setError(
                `Failed to ${isEditMode ? 'update' : 'create'} exam session subject. Please check your input and try again.`
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate('/admin/exam-session-subjects');
    };

    return {
        formData,
        examSessions,
        subjects,
        loading,
        error,
        isSubmitting,
        isEditMode,
        handleSelectChange,
        handleCheckboxChange,
        handleSubmit,
        handleCancel,
    };
};

export default useExamSessionSubjectFormVM;
