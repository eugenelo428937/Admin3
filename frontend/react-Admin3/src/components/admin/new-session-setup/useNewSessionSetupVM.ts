import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// ─── Interfaces ───────────────────────────────────────────────

export interface Session {
  id: number;
  session_code: string;
}

export interface NewSessionSetupVM {
  activeStep: number;
  sessionId: number | null;
  sessionCode: string;
  isExistingSession: boolean;
  handleStepComplete: (step: number) => void;
  handleSessionCreated: (session: Session, options?: { isExisting?: boolean }) => void;
  handleWizardComplete: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────

const useNewSessionSetupVM = (): NewSessionSetupVM => {
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();

  const [activeStep, setActiveStep] = useState<number>(0);
  const [sessionId, setSessionId] = useState<number | null>(
    urlSessionId ? Number(urlSessionId) : null,
  );
  const [sessionCode, setSessionCode] = useState<string>('');
  const [isExistingSession, setIsExistingSession] = useState<boolean>(false);

  useEffect(() => {
    if (urlSessionId && !sessionId) {
      setSessionId(Number(urlSessionId));
      setActiveStep(1);
    }
  }, [urlSessionId, sessionId]);

  const handleStepComplete = useCallback((step: number) => {
    if (step < 3) setActiveStep(step + 1);
  }, []);

  const handleSessionCreated = useCallback(
    (session: Session, { isExisting = false }: { isExisting?: boolean } = {}) => {
      setSessionId(session.id);
      setSessionCode(session.session_code);
      setIsExistingSession(isExisting);
      navigate(`/admin/new-session-setup/${session.id}`, { replace: true });
      handleStepComplete(0);
    },
    [navigate, handleStepComplete],
  );

  const handleWizardComplete = useCallback(() => {
    navigate('/admin/exam-sessions');
  }, [navigate]);

  return {
    activeStep,
    sessionId,
    sessionCode,
    isExistingSession,
    handleStepComplete,
    handleSessionCreated,
    handleWizardComplete,
  };
};

export default useNewSessionSetupVM;
