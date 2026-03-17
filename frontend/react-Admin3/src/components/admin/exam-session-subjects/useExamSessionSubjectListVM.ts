import { useState, useEffect, useCallback } from 'react';
import type { SelectChangeEvent } from '@mui/material';
import examSessionSubjectService from '../../../services/examSessionSubjectService';
import examSessionService from '../../../services/examSessionService';
import type { ExamSession } from '../../../types/examSession';

export interface ExamSessionSubject {
    id: number;
    exam_session: { id: number; session_code: string } | null;
    subject: { id: number; code: string } | null;
    is_active: boolean;
}

export interface ExamSessionSubjectListVM {
    // Data state
    examSessionSubjects: ExamSessionSubject[];
    examSessions: ExamSession[];
    selectedExamSession: string;
    loading: boolean;
    error: string | null;

    // Actions
    handleDelete: (id: number) => Promise<void>;
    handleExamSessionFilterChange: (event: SelectChangeEvent) => void;
}

const useExamSessionSubjectListVM = (): ExamSessionSubjectListVM => {
    const [examSessionSubjects, setExamSessionSubjects] = useState<ExamSessionSubject[]>([]);
    const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
    const [selectedExamSession, setSelectedExamSession] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        examSessionService.getAll().then(data => {
            setExamSessions(Array.isArray(data) ? data : []);
        });
    }, []);

    const fetchExamSessionSubjects = useCallback(async () => {
        try {
            setLoading(true);
            const params: Record<string, any> = {};
            if (selectedExamSession) {
                params.exam_session = selectedExamSession;
            }
            const data = await examSessionSubjectService.getAll();
            setExamSessionSubjects(data as ExamSessionSubject[]);
            setError(null);
        } catch (err) {
            console.error('Error fetching exam session subjects:', err);
            setError('Failed to fetch exam session subjects. Please try again later.');
            setExamSessionSubjects([]);
        } finally {
            setLoading(false);
        }
    }, [selectedExamSession]);

    useEffect(() => {
        fetchExamSessionSubjects();
    }, [fetchExamSessionSubjects]);

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this exam session subject?')) return;
        try {
            await examSessionSubjectService.delete(id);
            setExamSessionSubjects(prev => prev.filter(ess => ess.id !== id));
        } catch (err) {
            setError('Failed to delete exam session subject. Please try again later.');
        }
    };

    const handleExamSessionFilterChange = (event: SelectChangeEvent) => {
        setSelectedExamSession(event.target.value);
    };

    return {
        examSessionSubjects,
        examSessions,
        selectedExamSession,
        loading,
        error,
        handleDelete,
        handleExamSessionFilterChange,
    };
};

export default useExamSessionSubjectListVM;
