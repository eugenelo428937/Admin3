import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import httpService from '../../../services/httpService';
import sessionSetupService from '../../../services/sessionSetupService';
import config from '../../../config';

const CATALOG_URL = `${config.catalogUrl}`;

export interface Subject {
  id: number;
  code: string;
  description: string;
}

export interface SessionDataCounts {
  has_data: boolean;
  exam_session_subjects: number;
  products: number;
  bundles: number;
}

export interface PreviousSession {
  id: number;
  session_code: string;
}

export interface StepSubjectsVMProps {
  sessionId: number | null;
  sessionCode: string;
  isExistingSession: boolean;
  onComplete: () => void;
}

export interface StepSubjectsVM {
  // State
  allSubjects: Subject[];
  assigned: Subject[];
  checked: number[];
  previousSession: PreviousSession | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  showWarningDialog: boolean;
  sessionDataCounts: SessionDataCounts | null;
  deactivating: boolean;
  // Derived values
  available: Subject[];
  leftChecked: number[];
  rightChecked: number[];
  // Handlers
  handleToggle: (id: number) => void;
  handleAllRight: () => void;
  handleCheckedRight: () => void;
  handleCheckedLeft: () => void;
  handleAllLeft: () => void;
  handleCopyFromPrevious: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleDeactivateAndProceed: () => Promise<void>;
  handleCancelWarning: () => void;
}

const useStepSubjectsVM = ({
  sessionId,
  sessionCode: _sessionCode,
  isExistingSession,
  onComplete,
}: StepSubjectsVMProps): StepSubjectsVM => {
  const navigate = useNavigate();

  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [assigned, setAssigned] = useState<Subject[]>([]);
  const [checked, setChecked] = useState<number[]>([]);
  const [previousSession, setPreviousSession] = useState<PreviousSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarningDialog, setShowWarningDialog] = useState<boolean>(false);
  const [sessionDataCounts, setSessionDataCounts] = useState<SessionDataCounts | null>(null);
  const [deactivating, setDeactivating] = useState<boolean>(false);

  // Derived values
  const available = allSubjects.filter((s) => !assigned.some((a) => a.id === s.id));
  const leftChecked = checked.filter((id) => available.some((s) => s.id === id));
  const rightChecked = checked.filter((id) => assigned.some((s) => s.id === id));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      if (isExistingSession && sessionId !== null) {
        const counts = await sessionSetupService.getSessionDataCounts(sessionId);
        if (counts.has_data) {
          setSessionDataCounts(counts);
          setShowWarningDialog(true);
        }
      }

      const [subjectsRes, prevSession] = await Promise.all([
        httpService.get(`${CATALOG_URL}/admin-subjects/`, { params: { active: true } }),
        sessionId !== null ? sessionSetupService.getPreviousSession(sessionId) : Promise.resolve(null),
      ]);

      const subjects: Subject[] = Array.isArray(subjectsRes.data)
        ? subjectsRes.data
        : subjectsRes.data.results || [];
      setAllSubjects(subjects);
      setPreviousSession(prevSession);
    } catch (err) {
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, [sessionId, isExistingSession]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeactivateAndProceed = async (): Promise<void> => {
    setDeactivating(true);
    setError(null);
    try {
      if (sessionId !== null) {
        await sessionSetupService.deactivateSessionData(sessionId);
      }
      setShowWarningDialog(false);
      setSessionDataCounts(null);
    } catch (err) {
      setError('Failed to deactivate session data');
    } finally {
      setDeactivating(false);
    }
  };

  const handleCancelWarning = (): void => {
    setShowWarningDialog(false);
    navigate('/admin/new-session-setup');
  };

  const handleToggle = (id: number): void => {
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleAllRight = (): void => {
    setAssigned(allSubjects);
    setChecked([]);
  };

  const handleCheckedRight = (): void => {
    const toMove = available.filter((s) => leftChecked.includes(s.id));
    setAssigned((prev) => [...prev, ...toMove]);
    setChecked((prev) => prev.filter((id) => !leftChecked.includes(id)));
  };

  const handleCheckedLeft = (): void => {
    setAssigned((prev) => prev.filter((s) => !rightChecked.includes(s.id)));
    setChecked((prev) => prev.filter((id) => !rightChecked.includes(id)));
  };

  const handleAllLeft = (): void => {
    setAssigned([]);
    setChecked([]);
  };

  const handleCopyFromPrevious = async (): Promise<void> => {
    if (!previousSession) return;
    try {
      const prevSubjects = await sessionSetupService.getSessionSubjects(previousSession.id);
      const prevSubjectIds = prevSubjects.map((ess: { subject: { id: number } }) => ess.subject.id);
      const copied = allSubjects.filter((s) => prevSubjectIds.includes(s.id));
      setAssigned(copied);
      setChecked([]);
    } catch (err) {
      setError('Failed to copy subjects from previous session');
    }
  };

  const handleSave = async (): Promise<void> => {
    if (assigned.length === 0) {
      setError('At least one subject must be assigned');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (sessionId !== null) {
        await Promise.all(
          assigned.map((subject) =>
            httpService.post(`${CATALOG_URL}/exam-session-subjects/`, {
              exam_session: sessionId,
              subject: subject.id,
              is_active: true,
            })
          )
        );
      }
      onComplete();
    } catch (err) {
      setError('Failed to save subject assignments');
    } finally {
      setSaving(false);
    }
  };

  return {
    allSubjects,
    assigned,
    checked,
    previousSession,
    loading,
    saving,
    error,
    showWarningDialog,
    sessionDataCounts,
    deactivating,
    available,
    leftChecked,
    rightChecked,
    handleToggle,
    handleAllRight,
    handleCheckedRight,
    handleCheckedLeft,
    handleAllLeft,
    handleCopyFromPrevious,
    handleSave,
    handleDeactivateAndProceed,
    handleCancelWarning,
  };
};

export default useStepSubjectsVM;
