/**
 * Tests for acknowledgmentService
 *
 * @module services/__tests__/acknowledgmentService.test
 *
 * Tests acknowledgment operations including:
 * - validateComprehensiveCheckout: Validate all acknowledgments
 * - collectAllRequiredAcknowledgments: Get required acknowledgments
 * - canProceedWithCheckout: Check if checkout can proceed
 * - getMissingAcknowledgments: Get missing acknowledgments details
 * - generateMissingAcknowledgmentsMessage: Generate user message
 * - buildValidationContext: Build context for validation
 * - validateCheckoutReadiness: Combined validation check
 */

jest.mock('../httpService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import acknowledgmentService from '../acknowledgmentService';
import httpService from '../httpService';

describe('acknowledgmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('validateComprehensiveCheckout', () => {
    test('should return successful validation result', async () => {
      const mockResponse = {
        data: {
          success: true,
          blocked: false,
          can_proceed: true,
          summary: {
            total_required: 2,
            total_satisfied: 2,
            total_missing: 0
          },
          all_required_acknowledgments: [
            { ackKey: 'terms_conditions_v1', entry_point: 'checkout_terms' },
            { ackKey: 'digital_content_v1', entry_point: 'digital_content' }
          ],
          missing_acknowledgments: [],
          satisfied_acknowledgments: [
            { ackKey: 'terms_conditions_v1' },
            { ackKey: 'digital_content_v1' }
          ],
          blocking_rules: []
        }
      };
      httpService.post.mockResolvedValue(mockResponse);

      const result = await acknowledgmentService.validateComprehensiveCheckout({ cart: {} });

      expect(result.success).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.summary.total_required).toBe(2);
      expect(result.summary.total_satisfied).toBe(2);
      expect(result.allRequiredAcknowledgments).toHaveLength(2);
      expect(result.missingAcknowledgments).toHaveLength(0);
      expect(httpService.post).toHaveBeenCalledWith(
        '/api/rules/validate-comprehensive-checkout/',
        { context: { cart: {} } }
      );
    });

    test('should return blocked state when acknowledgments missing', async () => {
      const mockResponse = {
        data: {
          success: true,
          blocked: true,
          can_proceed: false,
          summary: {
            total_required: 2,
            total_satisfied: 1,
            total_missing: 1
          },
          all_required_acknowledgments: [
            { ackKey: 'terms_conditions_v1' },
            { ackKey: 'digital_content_v1' }
          ],
          missing_acknowledgments: [
            { ackKey: 'digital_content_v1', entry_point: 'digital_content' }
          ],
          satisfied_acknowledgments: [
            { ackKey: 'terms_conditions_v1' }
          ],
          blocking_rules: [{ rule_id: 'digital_content_rule' }]
        }
      };
      httpService.post.mockResolvedValue(mockResponse);

      const result = await acknowledgmentService.validateComprehensiveCheckout({});

      expect(result.blocked).toBe(true);
      expect(result.canProceed).toBe(false);
      expect(result.missingAcknowledgments).toHaveLength(1);
      expect(result.blockingRules).toHaveLength(1);
    });

    test('should use default values for missing response fields', async () => {
      const mockResponse = {
        data: {
          success: true,
          blocked: false,
          can_proceed: true
          // No summary, acknowledgments arrays, etc
        }
      };
      httpService.post.mockResolvedValue(mockResponse);

      const result = await acknowledgmentService.validateComprehensiveCheckout({});

      expect(result.summary).toEqual({
        total_required: 0,
        total_satisfied: 0,
        total_missing: 0
      });
      expect(result.allRequiredAcknowledgments).toEqual([]);
      expect(result.missingAcknowledgments).toEqual([]);
      expect(result.satisfiedAcknowledgments).toEqual([]);
      expect(result.blockingRules).toEqual([]);
    });

    test('should return blocked state on API error', async () => {
      const mockError = new Error('Network error');
      httpService.post.mockRejectedValue(mockError);

      const result = await acknowledgmentService.validateComprehensiveCheckout({});

      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.canProceed).toBe(false);
      expect(result.error).toBe('Network error');
      expect(console.error).toHaveBeenCalled();
    });

    test('should extract error message from response data', async () => {
      const mockError = {
        message: 'Request failed',
        response: {
          data: {
            error: 'Validation service unavailable'
          }
        }
      };
      httpService.post.mockRejectedValue(mockError);

      const result = await acknowledgmentService.validateComprehensiveCheckout({});

      expect(result.error).toBe('Validation service unavailable');
    });

    test('should call API with empty context by default', async () => {
      httpService.post.mockResolvedValue({ data: { success: true, blocked: false, can_proceed: true } });

      await acknowledgmentService.validateComprehensiveCheckout();

      expect(httpService.post).toHaveBeenCalledWith(
        '/api/rules/validate-comprehensive-checkout/',
        { context: {} }
      );
    });
  });

  describe('collectAllRequiredAcknowledgments', () => {
    test('should return all required acknowledgments', async () => {
      const mockResponse = {
        data: {
          success: true,
          blocked: false,
          can_proceed: true,
          all_required_acknowledgments: [
            { ackKey: 'terms_conditions_v1' },
            { ackKey: 'digital_content_v1' }
          ]
        }
      };
      httpService.post.mockResolvedValue(mockResponse);

      const result = await acknowledgmentService.collectAllRequiredAcknowledgments({ cart: {} });

      expect(result).toHaveLength(2);
      expect(result[0].ackKey).toBe('terms_conditions_v1');
    });

    test('should return empty array when validateComprehensiveCheckout throws', async () => {
      // Mock the method to throw directly (bypassing internal error handling)
      const originalMethod = acknowledgmentService.validateComprehensiveCheckout;
      acknowledgmentService.validateComprehensiveCheckout = jest.fn().mockRejectedValue(new Error('Direct throw'));

      const result = await acknowledgmentService.collectAllRequiredAcknowledgments({});

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();

      // Restore original method
      acknowledgmentService.validateComprehensiveCheckout = originalMethod;
    });

    test('should return empty array on API error', async () => {
      httpService.post.mockRejectedValue(new Error('API error'));

      const result = await acknowledgmentService.collectAllRequiredAcknowledgments({});

      // Since validateComprehensiveCheckout catches errors internally,
      // result comes from its error return value
      expect(result).toEqual([]);
    });
  });

  describe('canProceedWithCheckout', () => {
    test('should return true when can proceed and not blocked', async () => {
      httpService.post.mockResolvedValue({
        data: {
          success: true,
          blocked: false,
          can_proceed: true
        }
      });

      const result = await acknowledgmentService.canProceedWithCheckout({ cart: {} });

      expect(result).toBe(true);
    });

    test('should return false when blocked', async () => {
      httpService.post.mockResolvedValue({
        data: {
          success: true,
          blocked: true,
          can_proceed: false
        }
      });

      const result = await acknowledgmentService.canProceedWithCheckout({});

      expect(result).toBe(false);
    });

    test('should return false when cannot proceed', async () => {
      httpService.post.mockResolvedValue({
        data: {
          success: true,
          blocked: false,
          can_proceed: false
        }
      });

      const result = await acknowledgmentService.canProceedWithCheckout({});

      expect(result).toBe(false);
    });

    test('should return false when validateComprehensiveCheckout throws', async () => {
      // Mock the method to throw directly (bypassing internal error handling)
      const originalMethod = acknowledgmentService.validateComprehensiveCheckout;
      acknowledgmentService.validateComprehensiveCheckout = jest.fn().mockRejectedValue(new Error('Direct throw'));

      const result = await acknowledgmentService.canProceedWithCheckout({});

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();

      // Restore original method
      acknowledgmentService.validateComprehensiveCheckout = originalMethod;
    });

    test('should return false on API error', async () => {
      httpService.post.mockRejectedValue(new Error('API error'));

      const result = await acknowledgmentService.canProceedWithCheckout({});

      expect(result).toBe(false);
    });
  });

  describe('getMissingAcknowledgments', () => {
    test('should return detailed missing acknowledgments info', async () => {
      httpService.post.mockResolvedValue({
        data: {
          success: true,
          blocked: true,
          can_proceed: false,
          missing_acknowledgments: [
            { ackKey: 'terms_conditions_v1', entry_point: 'checkout_terms' },
            { ackKey: 'digital_content_v1', entry_point: 'checkout_terms' },
            { ackKey: 'tutorial_credit_card_v1', entry_point: 'payment_step' }
          ]
        }
      });

      const result = await acknowledgmentService.getMissingAcknowledgments({});

      expect(result.total).toBe(3);
      expect(result.byEntryPoint['checkout_terms']).toHaveLength(2);
      expect(result.byEntryPoint['payment_step']).toHaveLength(1);
      expect(result.details).toHaveLength(3);
      expect(result.message).toContain('Terms & Conditions');
    });

    test('should group by unknown entry point if missing', async () => {
      httpService.post.mockResolvedValue({
        data: {
          success: true,
          blocked: true,
          can_proceed: false,
          missing_acknowledgments: [
            { ackKey: 'some_ack' } // No entry_point
          ]
        }
      });

      const result = await acknowledgmentService.getMissingAcknowledgments({});

      expect(result.byEntryPoint['unknown']).toHaveLength(1);
    });

    test('should return empty result when API returns error state', async () => {
      // Note: validateComprehensiveCheckout catches API errors internally
      // and returns a safe default with empty missingAcknowledgments
      httpService.post.mockRejectedValue(new Error('API error'));

      const result = await acknowledgmentService.getMissingAcknowledgments({});

      // The error is caught by validateComprehensiveCheckout, which returns
      // missingAcknowledgments: [] - so generateMissingAcknowledgmentsMessage returns ''
      expect(result.total).toBe(0);
      expect(result.byEntryPoint).toEqual({});
      expect(result.details).toEqual([]);
      expect(result.message).toBe(''); // Empty because missingAcknowledgments is []
    });

    test('should return error result when validateComprehensiveCheckout throws', async () => {
      // Mock the method to throw directly (bypassing internal error handling)
      const originalMethod = acknowledgmentService.validateComprehensiveCheckout;
      acknowledgmentService.validateComprehensiveCheckout = jest.fn().mockRejectedValue(new Error('Direct throw'));

      const result = await acknowledgmentService.getMissingAcknowledgments({});

      expect(result.total).toBe(0);
      expect(result.byEntryPoint).toEqual({});
      expect(result.details).toEqual([]);
      expect(result.message).toBe('Unable to validate acknowledgments. Please try again.');
      expect(console.error).toHaveBeenCalled();

      // Restore original method
      acknowledgmentService.validateComprehensiveCheckout = originalMethod;
    });
  });

  describe('generateMissingAcknowledgmentsMessage', () => {
    test('should return empty string for no missing acknowledgments', () => {
      const result = acknowledgmentService.generateMissingAcknowledgmentsMessage([]);

      expect(result).toBe('');
    });

    test('should generate message for known ackKeys', () => {
      const missing = [
        { ackKey: 'terms_conditions_v1', entry_point: 'checkout_terms' },
        { ackKey: 'digital_content_v1', entry_point: 'digital_content' }
      ];

      const result = acknowledgmentService.generateMissingAcknowledgmentsMessage(missing);

      expect(result).toContain('Terms & Conditions');
      expect(result).toContain('Digital Content Agreement');
      expect(result).toContain('checkout_terms');
      expect(result).toContain('digital_content');
    });

    test('should generate message for tutorial credit card acknowledgment', () => {
      const missing = [
        { ackKey: 'tutorial_credit_card_v1', entry_point: 'payment_step' }
      ];

      const result = acknowledgmentService.generateMissingAcknowledgmentsMessage(missing);

      expect(result).toContain('Tutorial Credit Card Fee Acknowledgment');
    });

    test('should use ackKey as description for unknown keys', () => {
      const missing = [
        { ackKey: 'custom_acknowledgment', entry_point: 'custom_step' }
      ];

      const result = acknowledgmentService.generateMissingAcknowledgmentsMessage(missing);

      expect(result).toContain('custom_acknowledgment');
    });

    test('should handle missing ackKey and entry_point', () => {
      const missing = [{}]; // Missing both

      const result = acknowledgmentService.generateMissingAcknowledgmentsMessage(missing);

      expect(result).toContain('unknown');
    });
  });

  describe('buildValidationContext', () => {
    test('should build context with all cart data', () => {
      const cartData = {
        id: 123,
        has_digital: true,
        has_material: true,
        has_tutorial: false,
        has_marking: false
      };
      const cartItems = [
        { actual_price: '50.00', quantity: 2 },
        { actual_price: '30.00', quantity: 1 }
      ];
      const paymentMethod = 'card';

      const result = acknowledgmentService.buildValidationContext(cartData, cartItems, paymentMethod);

      expect(result.cart.id).toBe(123);
      expect(result.cart.items).toHaveLength(2);
      expect(result.cart.total).toBe(130); // 50*2 + 30*1
      expect(result.cart.has_digital).toBe(true);
      expect(result.cart.has_material).toBe(true);
      expect(result.cart.has_tutorial).toBe(false);
      expect(result.payment.method).toBe('card');
      expect(result.payment.is_card).toBe(true);
    });

    test('should include user context when provided', () => {
      const cartData = { id: 123 };
      const cartItems = [];
      const paymentMethod = 'invoice';
      const userProfile = {
        id: 456,
        email: 'test@example.com',
        home_country: 'UK',
        work_country: 'US'
      };

      const result = acknowledgmentService.buildValidationContext(
        cartData, cartItems, paymentMethod, userProfile
      );

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(456);
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.is_authenticated).toBe(true);
      expect(result.user.home_country).toBe('UK');
      expect(result.user.work_country).toBe('US');
      expect(result.payment.is_card).toBe(false);
    });

    test('should handle null/undefined cart data', () => {
      const result = acknowledgmentService.buildValidationContext(null, null, null);

      expect(result.cart.id).toBeUndefined();
      expect(result.cart.items).toEqual([]);
      expect(result.cart.total).toBe(0);
      expect(result.cart.has_digital).toBe(false);
      expect(result.payment.method).toBe('card'); // Default
    });

    test('should calculate total correctly with missing prices', () => {
      const cartItems = [
        { actual_price: '50.00', quantity: 2 },
        { quantity: 1 }, // Missing actual_price
        { actual_price: null, quantity: 3 }
      ];

      const result = acknowledgmentService.buildValidationContext({}, cartItems, 'card');

      expect(result.cart.total).toBe(100); // Only first item contributes
    });

    test('should not include user context when not provided', () => {
      const result = acknowledgmentService.buildValidationContext({}, [], 'card');

      expect(result.user).toBeUndefined();
    });
  });

  describe('validateCheckoutReadiness', () => {
    test('should return combined validation result', async () => {
      httpService.post.mockResolvedValue({
        data: {
          success: true,
          blocked: false,
          can_proceed: true,
          summary: {
            total_required: 1,
            total_satisfied: 1,
            total_missing: 0
          },
          all_required_acknowledgments: [{ ackKey: 'terms_conditions_v1' }],
          missing_acknowledgments: [],
          satisfied_acknowledgments: [{ ackKey: 'terms_conditions_v1' }]
        }
      });

      const cartData = { id: 1, has_digital: true };
      const cartItems = [{ actual_price: '50', quantity: 1 }];
      const paymentMethod = 'card';

      const result = await acknowledgmentService.validateCheckoutReadiness(
        cartData, cartItems, paymentMethod
      );

      expect(result.canProceed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.summary.total_required).toBe(1);
      expect(result.missingAcknowledgments.total).toBe(0);
      expect(result.satisfiedAcknowledgments).toHaveLength(1);
      expect(result.allRequiredAcknowledgments).toHaveLength(1);
    });

    test('should include user profile in context when provided', async () => {
      httpService.post.mockResolvedValue({
        data: {
          success: true,
          blocked: false,
          can_proceed: true
        }
      });

      const userProfile = { id: 1, email: 'test@example.com' };

      await acknowledgmentService.validateCheckoutReadiness(
        {}, [], 'card', userProfile
      );

      expect(httpService.post).toHaveBeenCalledWith(
        '/api/rules/validate-comprehensive-checkout/',
        expect.objectContaining({
          context: expect.objectContaining({
            user: expect.objectContaining({
              id: 1,
              email: 'test@example.com'
            })
          })
        })
      );
    });

    test('should return validation message for missing acknowledgments', async () => {
      httpService.post.mockResolvedValue({
        data: {
          success: true,
          blocked: true,
          can_proceed: false,
          missing_acknowledgments: [
            { ackKey: 'terms_conditions_v1', entry_point: 'checkout_terms' }
          ]
        }
      });

      const result = await acknowledgmentService.validateCheckoutReadiness({}, [], 'card');

      expect(result.validationMessage).toContain('Terms & Conditions');
      expect(result.blocked).toBe(true);
    });
  });
});
