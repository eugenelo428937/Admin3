import { useEffect, useState } from 'react';
import { rulesEngineHelpers, buildRulesContext } from '../utils/rulesEngineUtils.js';
import rulesEngineService from '../services/rulesEngineService.js';
import type { CartData, CartItem } from '../types/cart';
import type { RulesEngineResult, AcknowledgmentMessage, RulesMessage } from '../types/checkout';

interface UseCheckoutRulesEngineReturn {
  rulesResult: RulesEngineResult | null;
  loading: boolean;
  error: string | null;
  getInlineAcknowledgments: () => AcknowledgmentMessage[];
  getModalAcknowledgments: () => AcknowledgmentMessage[];
  getDisplayMessages: () => RulesMessage[];
  hasBlockingMessages: () => boolean;
  requiresAcknowledgment: () => boolean;
}

const useCheckoutRulesEngine = (cartData: CartData | null, cartItems: CartItem[]): UseCheckoutRulesEngineReturn => {
    const [rulesResult, setRulesResult] = useState<RulesEngineResult | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const executeRules = async () => {
            if (!cartData || !cartItems || cartItems.length === 0) {
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const result = await rulesEngineHelpers.executeCheckoutTerms(cartData, cartItems, rulesEngineService);
                setRulesResult(result);
            } catch (err: any) {
                console.error('Error executing checkout rules:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        executeRules();
    }, [cartData, cartItems]);

    return {
        rulesResult,
        loading,
        error,
        getInlineAcknowledgments: () => rulesResult?.messages?.classified?.acknowledgments?.inline || [],
        getModalAcknowledgments: () => rulesResult?.messages?.classified?.acknowledgments?.modal || [],
        getDisplayMessages: () => rulesResult?.messages?.classified?.displays?.all || [],
        hasBlockingMessages: () => rulesResult?.blocked || false,
        requiresAcknowledgment: () => rulesResult?.requires_acknowledgment || false
    };
};

export default useCheckoutRulesEngine;
