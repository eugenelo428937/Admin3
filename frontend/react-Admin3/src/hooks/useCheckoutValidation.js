import { useState, useCallback, useEffect } from 'react';
import acknowledgmentService from '../services/AcknowledgmentService';

/**
 * Hook for checkout validation
 *
 * Manages validation of ALL acknowledgments from ALL entry points
 * before allowing checkout to proceed.
 */
const useCheckoutValidation = () => {
  const [validationState, setValidationState] = useState({
    isValidating: false,
    canProceed: false,
    blocked: false,
    summary: {
      total_required: 0,
      total_satisfied: 0,
      total_missing: 0
    },
    allRequiredAcknowledgments: [],
    missingAcknowledgments: [],
    satisfiedAcknowledgments: [],
    validationMessage: '',
    lastValidated: null,
    error: null
  });

  /**
   * Validate checkout comprehensively
   */
  const validateCheckout = useCallback(async (cartData, cartItems, paymentMethod, userProfile = null) => {
    console.log('🔍 [useCheckoutValidation] Starting validation...', {
      cartHasDigital: cartData?.has_digital,
      cartHasTutorial: cartData?.has_tutorial,
      paymentMethod
    });

    setValidationState(prev => ({
      ...prev,
      isValidating: true,
      error: null
    }));

    try {
      const result = await acknowledgmentService.validateCheckoutReadiness(
        cartData,
        cartItems,
        paymentMethod,
        userProfile
      );

      console.log('🎯 [useCheckoutValidation] Validation result:', {
        canProceed: result.canProceed,
        blocked: result.blocked,
        totalRequired: result.summary?.total_required || 0,
        totalMissing: result.missingAcknowledgments?.total || 0
      });

      setValidationState({
        isValidating: false,
        canProceed: result.canProceed,
        blocked: result.blocked,
        summary: result.summary || {
          total_required: 0,
          total_satisfied: 0,
          total_missing: 0
        },
        allRequiredAcknowledgments: result.allRequiredAcknowledgments || [],
        missingAcknowledgments: result.missingAcknowledgments?.details || [],
        satisfiedAcknowledgments: result.satisfiedAcknowledgments || [],
        validationMessage: result.validationMessage || '',
        lastValidated: new Date(),
        error: null
      });

      return result;
    } catch (error) {
      console.error('❌ [useCheckoutValidation] Error:', error);

      setValidationState(prev => ({
        ...prev,
        isValidating: false,
        canProceed: false,
        blocked: true,
        error: error.message,
        lastValidated: new Date()
      }));

      return {
        canProceed: false,
        blocked: true,
        error: error.message
      };
    }
  }, []);

  /**
   * Quick check if checkout can proceed (without detailed validation)
   */
  const quickCanProceedCheck = useCallback(async (cartData, cartItems, paymentMethod) => {
    try {
      const context = acknowledgmentService.buildValidationContext(
        cartData,
        cartItems,
        paymentMethod
      );

      return await acknowledgmentService.canProceedWithCheckout(context);
    } catch (error) {
      console.error('❌ [quickCanProceedCheck] Error:', error);
      return false;
    }
  }, []);

  /**
   * Get missing acknowledgments details
   */
  const getMissingAcknowledgments = useCallback(async (cartData, cartItems, paymentMethod) => {
    try {
      const context = acknowledgmentService.buildValidationContext(
        cartData,
        cartItems,
        paymentMethod
      );

      return await acknowledgmentService.getMissingAcknowledgments(context);
    } catch (error) {
      console.error('❌ [getMissingAcknowledgments] Error:', error);
      return {
        total: 0,
        byEntryPoint: {},
        details: [],
        message: 'Unable to check missing acknowledgments.'
      };
    }
  }, []);

  /**
   * Collect all required acknowledgments for given context
   */
  const collectAllRequiredAcknowledgments = useCallback(async (cartData, cartItems, paymentMethod) => {
    try {
      const context = acknowledgmentService.buildValidationContext(
        cartData,
        cartItems,
        paymentMethod
      );

      return await acknowledgmentService.collectAllRequiredAcknowledgments(context);
    } catch (error) {
      console.error('❌ [collectAllRequiredAcknowledgments] Error:', error);
      return [];
    }
  }, []);

  /**
   * Reset validation state
   */
  const resetValidation = useCallback(() => {
    setValidationState({
      isValidating: false,
      canProceed: false,
      blocked: false,
      summary: {
        total_required: 0,
        total_satisfied: 0,
        total_missing: 0
      },
      allRequiredAcknowledgments: [],
      missingAcknowledgments: [],
      satisfiedAcknowledgments: [],
      validationMessage: '',
      lastValidated: null,
      error: null
    });
  }, []);

  /**
   * Get user-friendly status message
   */
  const getStatusMessage = useCallback(() => {
    if (validationState.isValidating) {
      return 'Validating acknowledgments...';
    }

    if (validationState.error) {
      return `Validation error: ${validationState.error}`;
    }

    if (validationState.blocked) {
      const missingCount = validationState.summary.total_missing;
      return `Checkout blocked: ${missingCount} required acknowledgment${missingCount !== 1 ? 's' : ''} missing`;
    }

    if (validationState.canProceed) {
      const satisfiedCount = validationState.summary.total_satisfied;
      return `Ready to proceed: All ${satisfiedCount} acknowledgment${satisfiedCount !== 1 ? 's' : ''} satisfied`;
    }

    return 'Checkout validation pending';
  }, [validationState]);

  return {
    // State
    ...validationState,
    statusMessage: getStatusMessage(),

    // Actions
    validateCheckout,
    quickCanProceedCheck,
    getMissingAcknowledgments,
    collectAllRequiredAcknowledgments,
    resetValidation
  };
};

export default useCheckoutValidation;