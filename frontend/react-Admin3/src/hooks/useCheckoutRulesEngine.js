import { useEffect, useState } from 'react';
import { rulesEngineHelpers, buildRulesContext } from '../utils/rulesEngineUtils';
import rulesEngineService from '../services/rulesEngineService';

const useCheckoutRulesEngine = (cartData, cartItems) => {
    const [rulesResult, setRulesResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const executeRules = async () => {
            if (!cartData || !cartItems || cartItems.length === 0) {
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Use the new helper function for checkout rules
                const result = await rulesEngineHelpers.executeCheckoutTerms(cartData, cartItems, rulesEngineService);
                setRulesResult(result);
            } catch (err) {
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
        // Helper functions for specific data access
        getInlineAcknowledgments: () => rulesResult?.messages?.classified?.acknowledgments?.inline || [],
        getModalAcknowledgments: () => rulesResult?.messages?.classified?.acknowledgments?.modal || [],
        getDisplayMessages: () => rulesResult?.messages?.classified?.displays?.all || [],
        hasBlockingMessages: () => rulesResult?.blocked || false,
        requiresAcknowledgment: () => rulesResult?.requires_acknowledgment || false
    };
};

export default useCheckoutRulesEngine;
