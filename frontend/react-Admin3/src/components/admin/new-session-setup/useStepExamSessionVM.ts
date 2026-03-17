import { useState, useEffect, useCallback } from 'react';
import examSessionService from '../../../services/examSessionService';
import type { ExamSession, ExamSessionInput } from '../../../types/examSession/examSession.types';

// ─── Interfaces ───────────────────────────────────────────────

export interface StepExamSessionProps {
  onSessionCreated: (session: ExamSession, options?: { isExisting?: boolean }) => void;
}

export interface StepExamSessionVM {
  error: string | null;
  isSubmitting: boolean;
  allSessions: ExamSession[];
  loadingSessions: boolean;
  selectedSession: ExamSession | null;
  formData: ExamSessionInput;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAutocompleteChange: (event: React.SyntheticEvent, newValue: ExamSession | null) => void;
  handleSelectExisting: () => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  formatDate: (dateStr: string) => string;
}

// ─── Hook ─────────────────────────────────────────────────────

const useStepExamSessionVM = ({ onSessionCreated }: StepExamSessionProps): StepExamSessionVM => {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [allSessions, setAllSessions] = useState<ExamSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);
  const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);
  const [formData, setFormData] = useState<ExamSessionInput>({
    session_code: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const sessions = await examSessionService.getAll();
        (sessions as ExamSession[]).sort((a, b) => b.id - a.id);
        setAllSessions(sessions as ExamSession[]);
      } catch {
        // Non-blocking
      } finally {
        setLoadingSessions(false);
      }
    };
    fetchSessions();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleAutocompleteChange = useCallback(
    (_event: React.SyntheticEvent, newValue: ExamSession | null) => {
      setSelectedSession(newValue);
      setError(null);
    },
    [],
  );

  const handleSelectExisting = useCallback(() => {
    if (!selectedSession) return;
    onSessionCreated(selectedSession, { isExisting: true });
  }, [selectedSession, onSessionCreated]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (formData.end_date <= formData.start_date) {
        setError('End date must be after start date');
        return;
      }
      setIsSubmitting(true);
      setError(null);
      try {
        const created = await examSessionService.create(formData);
        onSessionCreated(created as ExamSession, { isExisting: false });
      } catch (err: any) {
        const message =
          err.response?.data?.end_date?.[0] ||
          err.response?.data?.session_code?.[0] ||
          'Failed to create exam session';
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSessionCreated],
  );

  const formatDate = useCallback((dateStr: string): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  }, []);

  return {
    error,
    isSubmitting,
    allSessions,
    loadingSessions,
    selectedSession,
    formData,
    handleChange,
    handleAutocompleteChange,
    handleSelectExisting,
    handleSubmit,
    formatDate,
  };
};

export default useStepExamSessionVM;
