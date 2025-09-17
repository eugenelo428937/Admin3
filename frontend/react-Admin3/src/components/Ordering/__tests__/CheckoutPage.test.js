/**
 * CheckoutPage Rules Engine Integration Tests
 * 
 * Tests for CheckoutPage component rules engine integration at checkout_start entry point
 */

// Mock dependencies
jest.mock('react-router-dom', () => ({
    useNavigate: () => jest.fn()
}));

jest.mock('../../../contexts/CartContext', () => ({
    useCart: () => ({
        cartItems: [
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
        ],
        clearCart: jest.fn()
    })
}));

// Mock rulesEngineService 
jest.mock('../../../services/rulesEngineService', () => ({
    executeRules: jest.fn(),
    ENTRY_POINTS: {
        CHECKOUT_START: 'checkout_start'
    }
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import CheckoutPage from '../CheckoutPage';
import rulesEngineService from '../../../services/rulesEngineService';

describe('CheckoutPage Rules Engine Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        rulesEngineService.executeRules.mockResolvedValue({
            success: true,
            messages: [],
            blocked: false
        });
    });

    test('should call rules engine at checkout_start when component mounts', async () => {
        // Act
        render(<CheckoutPage />);

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