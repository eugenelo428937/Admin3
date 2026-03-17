import { useState, useEffect } from 'react';
import sessionSetupService from '../../../services/sessionSetupService';

export interface PreviousSession {
  id: number;
  session_code: string;
}

export interface CopyResult {
  message: string;
  products_created: number;
  prices_created: number;
  bundles_created: number;
  bundle_products_created: number;
  skipped_subjects?: string[];
}

export interface StepMaterialsVMProps {
  sessionId: number | null;
  sessionCode: string;
  onComplete: () => void;
}

export interface StepMaterialsVM {
  // State
  previousSession: PreviousSession | null;
  loading: boolean;
  copying: boolean;
  result: CopyResult | null;
  error: string | null;
  dialogOpen: boolean;
  // Handlers
  handleProceed: () => Promise<void>;
  handleSetupLater: () => void;
  handleContinue: () => void;
}

const useStepMaterialsVM = ({
  sessionId,
  sessionCode: _sessionCode,
  onComplete,
}: StepMaterialsVMProps): StepMaterialsVM => {
  const [previousSession, setPreviousSession] = useState<PreviousSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copying, setCopying] = useState<boolean>(false);
  const [result, setResult] = useState<CopyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(true);

  useEffect(() => {
    const fetchPrevious = async (): Promise<void> => {
      try {
        if (sessionId !== null) {
          const prev = await sessionSetupService.getPreviousSession(sessionId);
          setPreviousSession(prev);
        }
      } catch (err) {
        setError('Failed to load previous session');
      } finally {
        setLoading(false);
      }
    };
    fetchPrevious();
  }, [sessionId]);

  const handleProceed = async (): Promise<void> => {
    if (!previousSession || sessionId === null) return;

    setCopying(true);
    setError(null);

    try {
      const copyResult = await sessionSetupService.copyProducts(sessionId, previousSession.id);
      setResult(copyResult);
      setDialogOpen(false);
    } catch (err: any) {
      const message =
        err?.response?.data?.error || 'Copy operation failed. You may retry.';
      setError(message);
    } finally {
      setCopying(false);
    }
  };

  const handleSetupLater = (): void => {
    setDialogOpen(false);
    onComplete();
  };

  const handleContinue = (): void => {
    onComplete();
  };

  return {
    previousSession,
    loading,
    copying,
    result,
    error,
    dialogOpen,
    handleProceed,
    handleSetupLater,
    handleContinue,
  };
};

export default useStepMaterialsVM;
