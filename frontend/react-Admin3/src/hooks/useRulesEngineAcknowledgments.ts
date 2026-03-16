import { useState, useCallback } from 'react';
import { rulesEngineHelpers, executeAndProcessRules, buildRulesContext } from '../utils/rulesEngineUtils';
import acknowledgmentService from '../services/acknowledgmentService.ts';
import type { AcknowledgmentModalState, AcknowledgmentMessage } from '../types/checkout';

interface UseRulesEngineAcknowledgmentsReturn {
  acknowledgmentModal: AcknowledgmentModalState;
  loading: boolean;
  error: string | null;
  showAcknowledgmentModal: (params: ShowModalParams) => void;
  closeAcknowledgmentModal: () => void;
  submitAcknowledgment: (acknowledgmentData: any) => Promise<any>;
  executeRulesWithAcknowledgments: (entryPoint: string, context: Record<string, any>, rulesEngineService: any) => Promise<boolean>;
  hasAcknowledgment: (ackKey: string, entryPointLocation: string) => Promise<boolean>;
  validateCheckoutAcknowledgments: () => Promise<any>;
  handleAddToCartAcknowledgments: (productId: number, context: Record<string, any>, rulesEngineService: any) => Promise<boolean>;
  handleCheckoutTermsAcknowledgments: (context: Record<string, any>, rulesEngineService: any) => Promise<boolean>;
  clearError: () => void;
}

interface ShowModalParams {
  message: AcknowledgmentMessage;
  entryPointLocation: string;
  onAcknowledge?: (data: any) => void;
  onClose?: () => void;
  required?: boolean;
}

const useRulesEngineAcknowledgments = (): UseRulesEngineAcknowledgmentsReturn => {
  const [acknowledgmentModal, setAcknowledgmentModal] = useState<AcknowledgmentModalState>({
    open: false,
    message: null,
    entryPointLocation: null,
    onAcknowledge: null,
    onClose: null,
    required: true
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const showAcknowledgmentModal = useCallback(({
    message,
    entryPointLocation,
    onAcknowledge,
    onClose,
    required = true
  }: ShowModalParams) => {
    setAcknowledgmentModal({
      open: true,
      message,
      entryPointLocation,
      onAcknowledge: onAcknowledge || null,
      onClose: onClose || null,
      required
    });
  }, []);

  const closeAcknowledgmentModal = useCallback(() => {
    if (acknowledgmentModal.onClose) {
      acknowledgmentModal.onClose();
    }
    setAcknowledgmentModal(prev => ({ ...prev, open: false }));
  }, [acknowledgmentModal.onClose]);

  const submitAcknowledgment = useCallback(async (acknowledgmentData: any) => {
    setLoading(true);
    setError(null);

    try {
      const result = await (acknowledgmentService as any).submitAcknowledgment(acknowledgmentData);

      if (acknowledgmentModal.onAcknowledge) {
        acknowledgmentModal.onAcknowledge(acknowledgmentData);
      }

      closeAcknowledgmentModal();
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [acknowledgmentModal.onAcknowledge, closeAcknowledgmentModal]);

  const executeRulesWithAcknowledgments = useCallback(async (entryPoint: string, context: Record<string, any> = {}, rulesEngineService: any): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await executeAndProcessRules(entryPoint, context, rulesEngineService, {
        processAcknowledgments: true,
        sortByPriority: true
      });

      const modalAcks = result.messages?.classified?.acknowledgments?.modal || [];
      if (modalAcks.length > 0) {
        modalAcks.forEach((message: AcknowledgmentMessage) => {
          showAcknowledgmentModal({
            message,
            entryPointLocation: entryPoint,
            onAcknowledge: (ackData: any) => submitAcknowledgment(ackData),
            onClose: closeAcknowledgmentModal,
            required: message.required !== false
          });
        });
      }

      return result.success && !result.blocked;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [showAcknowledgmentModal, submitAcknowledgment, closeAcknowledgmentModal]);

  const hasAcknowledgment = useCallback(async (ackKey: string, entryPointLocation: string): Promise<boolean> => {
    try {
      return await (acknowledgmentService as any).hasAcknowledgment(ackKey, entryPointLocation);
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const validateCheckoutAcknowledgments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (acknowledgmentService as any).validateCheckoutAcknowledgments();
      return result;
    } catch (err: any) {
      setError(err.message);
      return {
        canProceed: false,
        blocking: true,
        requiredAcknowledgments: [],
        messages: [],
        success: false,
        error: err.message
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddToCartAcknowledgments = useCallback(async (productId: number, context: Record<string, any> = {}, rulesEngineService: any): Promise<boolean> => {
    return executeRulesWithAcknowledgments('add_to_cart', {
      product: { product_id: productId },
      ...context
    }, rulesEngineService);
  }, [executeRulesWithAcknowledgments]);

  const handleCheckoutTermsAcknowledgments = useCallback(async (context: Record<string, any> = {}, rulesEngineService: any): Promise<boolean> => {
    return executeRulesWithAcknowledgments('checkout_terms', context, rulesEngineService);
  }, [executeRulesWithAcknowledgments]);

  return {
    acknowledgmentModal,
    loading,
    error,
    showAcknowledgmentModal,
    closeAcknowledgmentModal,
    submitAcknowledgment,
    executeRulesWithAcknowledgments,
    hasAcknowledgment,
    validateCheckoutAcknowledgments,
    handleAddToCartAcknowledgments,
    handleCheckoutTermsAcknowledgments,
    clearError: () => setError(null)
  };
};

export default useRulesEngineAcknowledgments;
