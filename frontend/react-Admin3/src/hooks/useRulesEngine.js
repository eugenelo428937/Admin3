import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import rulesEngineService, { ENTRY_POINTS } from '../services/rulesEngineService';

/**
 * Hook for Rules Engine integration with automatic entry point triggering
 * @param {string} entryPoint - The entry point to trigger
 * @param {object} context - Context data for rule evaluation
 * @param {boolean} autoTrigger - Whether to automatically trigger on mount (default: true)
 */
export const useRulesEngine = (entryPoint, context = {}, autoTrigger = true) => {
  const [rulesResult, setRulesResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasEvaluated = useRef(false);
  const lastCallTime = useRef(0);
  const THROTTLE_MS = 1000; // Prevent calls within 1 second

  // Memoize context to prevent unnecessary re-renders
  const memoizedContext = useMemo(() => context, [JSON.stringify(context)]);

  const evaluateRules = useCallback(async (overrideContext = {}) => {
    if (!entryPoint) return;
    
    // Throttle API calls to prevent spam
    const now = Date.now();
    if (now - lastCallTime.current < THROTTLE_MS) {
      console.log(`🚫 Rules Engine: Throttled call for ${entryPoint} (within ${THROTTLE_MS}ms)`);
      return;
    }
    lastCallTime.current = now;
    
    try {
      setLoading(true);
      setError(null);
      
      const finalContext = { ...memoizedContext, ...overrideContext };
      console.log(`🎯 Rules Engine: Evaluating ${entryPoint} with context:`, finalContext);
      const result = await rulesEngineService.evaluateRulesAtEntryPoint(entryPoint, finalContext);
      
      setRulesResult(result);
      return result;
    } catch (err) {
      setError(err);
      console.error(`Rules Engine Hook Error for ${entryPoint}:`, err);
    } finally {
      setLoading(false);
    }
  }, [entryPoint, memoizedContext]);

  // Auto-trigger on mount if enabled - only once
  useEffect(() => {
    if (autoTrigger && entryPoint && !hasEvaluated.current) {
      console.log(`🔄 Rules Engine: Initial evaluation for ${entryPoint}`);
      hasEvaluated.current = true;
      evaluateRules();
    }
  }, [autoTrigger, entryPoint]); // Removed evaluateRules from dependency array

  return {
    rulesResult,
    loading,
    error,
    evaluateRules,
    // Convenience flags
    hasMessages: rulesResult?.messages?.length > 0,
    hasBlockingMessages: rulesResult?.blocked || false,
    rulesCount: rulesResult?.rules_evaluated || 0,
    // Reset function for manual re-evaluation
    resetEvaluation: () => {
      hasEvaluated.current = false;
      lastCallTime.current = 0;
    }
  };
};

/**
 * Specific hooks for each entry point for convenience
 */
export const useHomePageRules = (context = {}, autoTrigger = true) => {
  return useRulesEngine(ENTRY_POINTS.HOME_PAGE_MOUNT, context, autoTrigger);
};

export const useProductListRules = (context = {}, autoTrigger = true) => {
  return useRulesEngine(ENTRY_POINTS.PRODUCT_LIST_MOUNT, context, autoTrigger);
};

export const useProductCardRules = (productContext = {}, autoTrigger = false) => {
  return useRulesEngine(ENTRY_POINTS.PRODUCT_CARD_MOUNT, productContext, autoTrigger);
};

export const useCheckoutStartRules = (cartContext = {}, autoTrigger = true) => {
  return useRulesEngine(ENTRY_POINTS.CHECKOUT_START, cartContext, autoTrigger);
};

export const useCheckoutPreferenceRules = (checkoutContext = {}, autoTrigger = true) => {
  return useRulesEngine(ENTRY_POINTS.CHECKOUT_PREFERENCE, checkoutContext, autoTrigger);
};

export const useCheckoutTermsRules = (checkoutContext = {}, autoTrigger = true) => {
  return useRulesEngine(ENTRY_POINTS.CHECKOUT_TERMS, checkoutContext, autoTrigger);
};

export const useCheckoutPaymentRules = (paymentContext = {}, autoTrigger = true) => {
  return useRulesEngine(ENTRY_POINTS.CHECKOUT_PAYMENT, paymentContext, autoTrigger);
};

/**
 * Hook for manual rule evaluation without auto-triggering
 */
export const useManualRulesEngine = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const evaluateEntryPoint = useCallback(async (entryPoint, context = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await rulesEngineService.evaluateRulesAtEntryPoint(entryPoint, context);
      return result;
    } catch (err) {
      setError(err);
      console.error(`Manual Rules Engine Error for ${entryPoint}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    evaluateEntryPoint,
    loading,
    error
  };
};

export default useRulesEngine;