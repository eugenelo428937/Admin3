/**
 * useCheckoutRulesEngine Hook Tests
 * 
 * Tests for the custom hook that calls rules engine at checkout_start entry point
 */

// Mock rulesEngineService
jest.mock('../../services/rulesEngineService', () => ({
    executeRules: jest.fn(),
    ENTRY_POINTS: {
        CHECKOUT_START: 'checkout_start'
    }
}));

import { renderHook, waitFor } from '@testing-library/react';
import useCheckoutRulesEngine from '../useCheckoutRulesEngine';
import rulesEngineService from '../../services/rulesEngineService';

describe('useCheckoutRulesEngine Hook', () => {
    const mockCartItems = [
        {
            id: 1,
            product_id: 72,
            subject_code: "CM1",
            product_name: "CM1 ASET",
            product_type: "Material",
            current_product: 72,
            quantity: 1,
            price_type: "standard",
            actual_price: "150.00",
            metadata: { variationId: 1 }
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        rulesEngineService.executeRules.mockResolvedValue({
            success: true,
            messages: [],
            blocked: false
        });
    });

    test('should call rules engine with checkout_start entry point and cart context', async () => {
        // Act
        renderHook(() => useCheckoutRulesEngine(mockCartItems));

        // Assert
        await waitFor(() => {
            expect(rulesEngineService.executeRules).toHaveBeenCalledWith(
                'checkout_start',
                expect.objectContaining({
                    cart: expect.objectContaining({
                        items: expect.arrayContaining([
                            expect.objectContaining({
                                product_id: 72,
                                subject_code: "CM1",
                                product_name: "CM1 ASET"
                            })
                        ])
                    })
                })
            );
        });
    });
});