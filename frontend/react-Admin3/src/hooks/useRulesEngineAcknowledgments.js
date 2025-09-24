import { useState, useCallback } from 'react';
import { rulesEngineHelpers, executeAndProcessRules, buildRulesContext } from '../utils/rulesEngineUtils';
import acknowledgmentService from '../services/AcknowledgmentService';

/**
 * Hook for managing rules engine acknowledgments
 */
const useRulesEngineAcknowledgments = () => {
  const [acknowledgmentModal, setAcknowledgmentModal] = useState({
    open: false,
    message: null,
    entryPointLocation: null,
    onAcknowledge: null,
    onClose: null,
    required: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Show acknowledgment modal
   */
  const showAcknowledgmentModal = useCallback(({
    message,
    entryPointLocation,
    onAcknowledge,
    onClose,
    required = true
  }) => {
    setAcknowledgmentModal({
      open: true,
      message,
      entryPointLocation,
      onAcknowledge,
      onClose,
      required
    });
  }, []);

  /**
   * Close acknowledgment modal
   */
  const closeAcknowledgmentModal = useCallback(() => {
    if (acknowledgmentModal.onClose) {
      acknowledgmentModal.onClose();
    }
    setAcknowledgmentModal(prev => ({
      ...prev,
      open: false
    }));
  }, [acknowledgmentModal.onClose]);

  /**
   * Submit acknowledgment
   */
  const submitAcknowledgment = useCallback(async (acknowledgmentData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await acknowledgmentService.submitAcknowledgment(acknowledgmentData);

      if (acknowledgmentModal.onAcknowledge) {
        acknowledgmentModal.onAcknowledge(acknowledgmentData);
      }

      closeAcknowledgmentModal();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [acknowledgmentModal.onAcknowledge, closeAcknowledgmentModal]);

  /**
   * Execute rules for entry point and handle acknowledgments automatically
   */
  const executeRulesWithAcknowledgments = useCallback(async (entryPoint, context = {}, rulesEngineService) => {
    setLoading(true);
    setError(null);

    try {
      // Use the new processing pipeline
      const result = await executeAndProcessRules(entryPoint, context, rulesEngineService, {
        processAcknowledgments: true,
        sortByPriority: true
      });

      // Auto-show acknowledgment modals if they exist
      const modalAcks = result.messages?.classified?.acknowledgments?.modal || [];
      if (modalAcks.length > 0) {
        modalAcks.forEach(message => {
          showAcknowledgmentModal({
            message,
            entryPointLocation: entryPoint,
            onAcknowledge: (ackData) => submitAcknowledgment(ackData),
            onClose: closeAcknowledgmentModal,
            required: message.required !== false
          });
        });
      }

      return result.success && !result.blocked;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [showAcknowledgmentModal, submitAcknowledgment, closeAcknowledgmentModal]);

  /**
   * Check if acknowledgment exists
   */
  const hasAcknowledgment = useCallback(async (ackKey, entryPointLocation) => {
    try {
      return await acknowledgmentService.hasAcknowledgment(ackKey, entryPointLocation);
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  /**
   * Validate checkout acknowledgments
   */
  const validateCheckoutAcknowledgments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await acknowledgmentService.validateCheckoutAcknowledgments();
      return result;
    } catch (err) {
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

  /**
   * Execute rules for add to cart and handle acknowledgments
   */
  const handleAddToCartAcknowledgments = useCallback(async (productId, context = {}, rulesEngineService) => {
    return executeRulesWithAcknowledgments('add_to_cart', {
      product: { product_id: productId },
      ...context
    }, rulesEngineService);
  }, [executeRulesWithAcknowledgments]);

  /**
   * Execute rules for checkout terms and handle acknowledgments
   */
  const handleCheckoutTermsAcknowledgments = useCallback(async (context = {}, rulesEngineService) => {
    return executeRulesWithAcknowledgments('checkout_terms', context, rulesEngineService);
  }, [executeRulesWithAcknowledgments]);

  return {
    // State
    acknowledgmentModal,
    loading,
    error,

    // Actions
    showAcknowledgmentModal,
    closeAcknowledgmentModal,
    submitAcknowledgment,
    executeRulesWithAcknowledgments,
    hasAcknowledgment,
    validateCheckoutAcknowledgments,

    // Convenience methods for specific entry points
    handleAddToCartAcknowledgments,
    handleCheckoutTermsAcknowledgments,

    // Reset error
    clearError: () => setError(null)
  };
};

export default useRulesEngineAcknowledgments;