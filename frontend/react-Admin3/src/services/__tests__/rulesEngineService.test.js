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
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('ENTRY_POINTS', () => {
        test('should export ENTRY_POINTS constants', () => {
            expect(rulesEngineService.ENTRY_POINTS).toBeDefined();
            expect(rulesEngineService.ENTRY_POINTS.CHECKOUT_START).toBe('checkout_start');
            expect(rulesEngineService.ENTRY_POINTS.CHECKOUT_TERMS).toBe('checkout_terms');
            expect(rulesEngineService.ENTRY_POINTS.CHECKOUT_PREFERENCE).toBe('checkout_preference');
            expect(rulesEngineService.ENTRY_POINTS.CHECKOUT_PAYMENT).toBe('checkout_payment');
            expect(rulesEngineService.ENTRY_POINTS.PRODUCT_CARD_MOUNT).toBe('product_card_mount');
            expect(rulesEngineService.ENTRY_POINTS.PRODUCT_LIST_MOUNT).toBe('product_list_mount');
            expect(rulesEngineService.ENTRY_POINTS.HOME_PAGE_MOUNT).toBe('home_page_mount');
            expect(rulesEngineService.ENTRY_POINTS.USER_REGISTRATION).toBe('user_registration');
        });
    });

    describe('executeRules', () => {
        test('should call POST /api/rules/engine/execute/ with correct parameters', async () => {
            httpService.post.mockResolvedValue(mockResponse);
            const entryPoint = 'checkout_start';

            const result = await rulesEngineService.executeRules(entryPoint, mockContext);

            expect(httpService.post).toHaveBeenCalledWith('/api/rules/engine/execute/', {
                entryPoint: 'checkout_start',
                context: mockContext
            });
            expect(result).toEqual(mockResponse.data);
        });

        test('should use empty object as default context', async () => {
            httpService.post.mockResolvedValue(mockResponse);

            await rulesEngineService.executeRules('checkout_start');

            expect(httpService.post).toHaveBeenCalledWith('/api/rules/engine/execute/', {
                entryPoint: 'checkout_start',
                context: {}
            });
        });

        test('should throw SchemaValidationError for schema validation failures', async () => {
            const schemaError = {
                response: {
                    status: 400,
                    data: {
                        schema_validation_errors: [
                            { field: 'cart.items', message: 'Required field missing' }
                        ],
                        details: 'Cart context is invalid'
                    }
                }
            };
            httpService.post.mockRejectedValue(schemaError);

            try {
                await rulesEngineService.executeRules('checkout_start', {});
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.name).toBe('SchemaValidationError');
                expect(error.message).toBe('Schema validation failed');
                expect(error.schemaErrors).toEqual([
                    { field: 'cart.items', message: 'Required field missing' }
                ]);
                expect(error.entryPoint).toBe('checkout_start');
                expect(error.context).toEqual({});
                expect(error.details).toBe('Cart context is invalid');
            }
        });

        test('should use default details message for schema errors without details', async () => {
            const schemaError = {
                response: {
                    status: 400,
                    data: {
                        schema_validation_errors: ['error']
                    }
                }
            };
            httpService.post.mockRejectedValue(schemaError);

            try {
                await rulesEngineService.executeRules('checkout_start', {});
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.details).toBe('Context schema validation failed');
            }
        });

        test('should re-throw non-schema errors', async () => {
            const networkError = new Error('Network error');
            httpService.post.mockRejectedValue(networkError);

            await expect(
                rulesEngineService.executeRules('checkout_start', mockContext)
            ).rejects.toThrow('Network error');
        });

        test('should re-throw 400 errors without schema_validation_errors', async () => {
            const badRequestError = {
                response: {
                    status: 400,
                    data: { error: 'Bad request' }
                }
            };
            httpService.post.mockRejectedValue(badRequestError);

            await expect(
                rulesEngineService.executeRules('checkout_start', mockContext)
            ).rejects.toEqual(badRequestError);
        });

        test('should re-throw errors with other status codes', async () => {
            const serverError = {
                response: {
                    status: 500,
                    data: { error: 'Internal server error' }
                }
            };
            httpService.post.mockRejectedValue(serverError);

            await expect(
                rulesEngineService.executeRules('checkout_start', mockContext)
            ).rejects.toEqual(serverError);
        });
    });

    describe('acknowledgeRule', () => {
        test('should call POST /api/rules/acknowledge/ with acknowledgment data', async () => {
            const mockAckResponse = { data: { success: true } };
            httpService.post.mockResolvedValue(mockAckResponse);

            const acknowledgmentData = {
                ackKey: 'terms_v1',
                message_id: 'msg_123',
                acknowledged: true,
                entry_point_location: 'checkout_terms'
            };

            const result = await rulesEngineService.acknowledgeRule(acknowledgmentData);

            expect(httpService.post).toHaveBeenCalledWith(
                '/api/rules/acknowledge/',
                acknowledgmentData
            );
            expect(result).toEqual({ success: true });
        });

        test('should throw error on API failure', async () => {
            const apiError = new Error('API error');
            httpService.post.mockRejectedValue(apiError);

            await expect(
                rulesEngineService.acknowledgeRule({ ackKey: 'test' })
            ).rejects.toThrow('API error');

            expect(console.error).toHaveBeenCalledWith('Error acknowledging rule:', apiError);
        });
    });
});