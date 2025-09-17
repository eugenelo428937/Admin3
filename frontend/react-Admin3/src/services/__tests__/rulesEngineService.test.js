/**
 * Rules Engine Service Tests
 * 
 * Tests for the rulesEngineService that handles communication with
 * the backend rules engine API endpoint POST /api/rules/engine/execute/
 */

// Mock httpService before importing
jest.mock('../httpService', () => ({
    post: jest.fn()
}));

import rulesEngineService from '../rulesEngineService';
import httpService from '../httpService';

describe('rulesEngineService', () => {
    const mockContext = {
        cart: {
            id: 1,
            items: [
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
            ]
        }
    };

    const mockResponse = {
        data: {
            success: true,
            messages: [
                {
                    id: 'msg_1',
                    type: 'warning',
                    title: 'ASET Warning',
                    content: 'This product requires special handling',
                    actions: ['acknowledge']
                }
            ],
            blocked: false,
            required_acknowledgments: []
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('executeRules', () => {
        test('should call POST /api/rules/engine/execute/ with correct parameters', async () => {
            // Arrange
            httpService.post.mockResolvedValue(mockResponse);
            const entryPoint = 'checkout_start';

            // Act
            const result = await rulesEngineService.executeRules(entryPoint, mockContext);

            // Assert
            expect(httpService.post).toHaveBeenCalledWith('/api/rules/engine/execute/', {
                entryPoint: 'checkout_start',
                context: mockContext
            });
            expect(result).toEqual(mockResponse.data);
        });
    });
});