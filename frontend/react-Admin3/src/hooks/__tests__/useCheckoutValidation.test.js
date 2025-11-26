/**
 * Tests for useCheckoutValidation hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import useCheckoutValidation from '../useCheckoutValidation';

// Mock dependencies
jest.mock('../../services/acknowledgmentService', () => ({
  __esModule: true,
  default: {
    validateCheckoutReadiness: jest.fn(),
    buildValidationContext: jest.fn(),
    canProceedWithCheckout: jest.fn(),
    getMissingAcknowledgments: jest.fn(),
    collectAllRequiredAcknowledgments: jest.fn()
  }
}));

jest.mock('libphonenumber-js', () => ({
  parsePhoneNumber: jest.fn()
}));

const acknowledgmentService = require('../../services/acknowledgmentService').default;
const { parsePhoneNumber } = require('libphonenumber-js');

describe('useCheckoutValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial state', () => {
    test('should return initial validation state', () => {
      const { result } = renderHook(() => useCheckoutValidation());

      expect(result.current.isValidating).toBe(false);
      expect(result.current.canProceed).toBe(false);
      expect(result.current.blocked).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('validateEmail', () => {
    test('should return error for empty email', () => {
      const { result } = renderHook(() => useCheckoutValidation());
      
      expect(result.current.validateEmail('')).toEqual({
        isValid: false,
        error: 'Email address is required'
      });
    });

    test('should return error for invalid email format', () => {
      const { result } = renderHook(() => useCheckoutValidation());
      
      expect(result.current.validateEmail('invalid-email')).toEqual({
        isValid: false,
        error: 'Please enter a valid email address'
      });
    });

    test('should return valid for correct email', () => {
      const { result } = renderHook(() => useCheckoutValidation());
      
      expect(result.current.validateEmail('test@example.com')).toEqual({
        isValid: true,
        error: null
      });
    });
  });

  describe('validatePhone', () => {
    test('should return valid for empty optional phone', () => {
      const { result } = renderHook(() => useCheckoutValidation());
      
      expect(result.current.validatePhone('', 'GB', false)).toEqual({
        isValid: true,
        error: null
      });
    });

    test('should return error for empty required phone', () => {
      const { result } = renderHook(() => useCheckoutValidation());
      
      expect(result.current.validatePhone('', 'GB', true)).toEqual({
        isValid: false,
        error: 'Phone number is required'
      });
    });

    test('should return error when parsePhoneNumber returns null', () => {
      parsePhoneNumber.mockReturnValue(null);
      const { result } = renderHook(() => useCheckoutValidation());
      
      expect(result.current.validatePhone('123', 'GB', true)).toEqual({
        isValid: false,
        error: 'Invalid phone number format'
      });
    });

    test('should return error for invalid phone number', () => {
      parsePhoneNumber.mockReturnValue({
        isValid: () => false
      });
      const { result } = renderHook(() => useCheckoutValidation());
      
      expect(result.current.validatePhone('123456', 'GB', true)).toEqual({
        isValid: false,
        error: 'Please enter a valid phone number'
      });
    });

    test('should return valid for correct phone number', () => {
      parsePhoneNumber.mockReturnValue({
        isValid: () => true,
        formatNational: () => '07700 900000'
      });
      const { result } = renderHook(() => useCheckoutValidation());
      
      const validation = result.current.validatePhone('+447700900000', 'GB', true);
      expect(validation.isValid).toBe(true);
      expect(validation.formattedNumber).toBe('07700 900000');
    });

    test('should handle parsePhoneNumber errors', () => {
      parsePhoneNumber.mockImplementation(() => { throw new Error('Parse error'); });
      const { result } = renderHook(() => useCheckoutValidation());
      
      expect(result.current.validatePhone('invalid', 'GB', true)).toEqual({
        isValid: false,
        error: 'Invalid phone number format'
      });
    });
  });

  describe('validateAddress', () => {
    test('should return error for null address', () => {
      const { result } = renderHook(() => useCheckoutValidation());
      
      expect(result.current.validateAddress(null, 'Delivery')).toEqual({
        isValid: false,
        error: 'Delivery address is required'
      });
    });

    test('should return error for missing required fields', () => {
      const { result } = renderHook(() => useCheckoutValidation());
      
      const validation = result.current.validateAddress({}, 'Delivery');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Address Line 1');
      expect(validation.error).toContain('City');
      expect(validation.error).toContain('Postal Code');
      expect(validation.error).toContain('Country');
    });

    test('should accept address_line_1 as address field', () => {
      const { result } = renderHook(() => useCheckoutValidation());
      
      const validation = result.current.validateAddress({
        address_line_1: '123 Main St',
        city: 'London',
        postal_code: 'SW1A 1AA',
        country: 'UK'
      }, 'Delivery');
      expect(validation.isValid).toBe(true);
    });

    test('should accept street as address field', () => {
      const { result } = renderHook(() => useCheckoutValidation());
      
      const validation = result.current.validateAddress({
        street: '123 Main St',
        town: 'London',
        postcode: 'SW1A 1AA',
        country: 'UK'
      }, 'Delivery');
      expect(validation.isValid).toBe(true);
    });
  });

  describe('validateContactInfo', () => {
    test('should validate required contact fields', () => {
      parsePhoneNumber.mockReturnValue({
        isValid: () => true,
        formatNational: () => '07700 900000'
      });
      const { result } = renderHook(() => useCheckoutValidation());
      
      const validation = result.current.validateContactInfo({
        mobile_phone: '+447700900000',
        email_address: 'test@example.com'
      });
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should return errors for invalid contact info', () => {
      parsePhoneNumber.mockReturnValue(null);
      const { result } = renderHook(() => useCheckoutValidation());
      
      const validation = result.current.validateContactInfo({
        mobile_phone: 'invalid',
        email_address: 'invalid'
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should validate optional phone numbers', () => {
      parsePhoneNumber.mockImplementation((phone) => {
        if (phone === '+447700900000') {
          return { isValid: () => true, formatNational: () => '07700 900000' };
        }
        return null;
      });
      const { result } = renderHook(() => useCheckoutValidation());
      
      const validation = result.current.validateContactInfo({
        mobile_phone: '+447700900000',
        email_address: 'test@example.com',
        home_phone: 'invalid',
        work_phone: 'invalid'
      });
      
      expect(validation.errors).toContain('Home phone: Invalid phone number format');
      expect(validation.errors).toContain('Work phone: Invalid phone number format');
    });
  });

  describe('validateAddresses', () => {
    test('should validate delivery and invoice addresses', () => {
      const { result } = renderHook(() => useCheckoutValidation());
      
      const validation = result.current.validateAddresses(
        { addressData: { address_line_1: '123 Main St', city: 'London', postal_code: 'SW1A 1AA', country: 'UK' } },
        { addressData: { address_line_1: '456 Oak Ave', city: 'Manchester', postal_code: 'M1 1AA', country: 'UK' } }
      );
      
      expect(validation.isValid).toBe(true);
    });

    test('should return errors for invalid addresses', () => {
      const { result } = renderHook(() => useCheckoutValidation());
      
      const validation = result.current.validateAddresses(
        { addressData: {} },
        { addressData: {} }
      );
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBe(2);
    });
  });

  describe('validateCheckout', () => {
    test('should call acknowledgmentService.validateCheckoutReadiness', async () => {
      const mockResult = {
        canProceed: true,
        blocked: false,
        summary: { total_required: 1, total_satisfied: 1, total_missing: 0 },
        allRequiredAcknowledgments: [],
        missingAcknowledgments: { details: [] },
        satisfiedAcknowledgments: [],
        validationMessage: ''
      };
      acknowledgmentService.validateCheckoutReadiness.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCheckoutValidation());

      await act(async () => {
        await result.current.validateCheckout({ id: 1 }, [{ id: 1 }], 'card');
      });

      expect(acknowledgmentService.validateCheckoutReadiness).toHaveBeenCalled();
      expect(result.current.canProceed).toBe(true);
    });

    test('should handle validation errors', async () => {
      acknowledgmentService.validateCheckoutReadiness.mockRejectedValue(new Error('Validation failed'));

      const { result } = renderHook(() => useCheckoutValidation());

      await act(async () => {
        await result.current.validateCheckout({ id: 1 }, [{ id: 1 }], 'card');
      });

      expect(result.current.error).toBe('Validation failed');
      expect(result.current.blocked).toBe(true);
    });
  });

  describe('quickCanProceedCheck', () => {
    test('should return canProceed result', async () => {
      acknowledgmentService.buildValidationContext.mockReturnValue({});
      acknowledgmentService.canProceedWithCheckout.mockResolvedValue(true);

      const { result } = renderHook(() => useCheckoutValidation());

      let canProceed;
      await act(async () => {
        canProceed = await result.current.quickCanProceedCheck({ id: 1 }, [{ id: 1 }], 'card');
      });

      expect(canProceed).toBe(true);
    });

    test('should return false on error', async () => {
      acknowledgmentService.buildValidationContext.mockImplementation(() => { throw new Error('Error'); });

      const { result } = renderHook(() => useCheckoutValidation());

      let canProceed;
      await act(async () => {
        canProceed = await result.current.quickCanProceedCheck({ id: 1 }, [{ id: 1 }], 'card');
      });

      expect(canProceed).toBe(false);
    });
  });

  describe('getMissingAcknowledgments', () => {
    test('should return missing acknowledgments', async () => {
      const mockMissing = { total: 1, byEntryPoint: {}, details: [{ id: 1 }], message: '' };
      acknowledgmentService.buildValidationContext.mockReturnValue({});
      acknowledgmentService.getMissingAcknowledgments.mockResolvedValue(mockMissing);

      const { result } = renderHook(() => useCheckoutValidation());

      let missing;
      await act(async () => {
        missing = await result.current.getMissingAcknowledgments({ id: 1 }, [{ id: 1 }], 'card');
      });

      expect(missing).toEqual(mockMissing);
    });

    test('should return default on error', async () => {
      acknowledgmentService.buildValidationContext.mockImplementation(() => { throw new Error('Error'); });

      const { result } = renderHook(() => useCheckoutValidation());

      let missing;
      await act(async () => {
        missing = await result.current.getMissingAcknowledgments({ id: 1 }, [{ id: 1 }], 'card');
      });

      expect(missing.total).toBe(0);
    });
  });

  describe('collectAllRequiredAcknowledgments', () => {
    test('should return required acknowledgments', async () => {
      const mockRequired = [{ id: 1 }];
      acknowledgmentService.buildValidationContext.mockReturnValue({});
      acknowledgmentService.collectAllRequiredAcknowledgments.mockResolvedValue(mockRequired);

      const { result } = renderHook(() => useCheckoutValidation());

      let required;
      await act(async () => {
        required = await result.current.collectAllRequiredAcknowledgments({ id: 1 }, [{ id: 1 }], 'card');
      });

      expect(required).toEqual(mockRequired);
    });

    test('should return empty array on error', async () => {
      acknowledgmentService.buildValidationContext.mockImplementation(() => { throw new Error('Error'); });

      const { result } = renderHook(() => useCheckoutValidation());

      let required;
      await act(async () => {
        required = await result.current.collectAllRequiredAcknowledgments({ id: 1 }, [{ id: 1 }], 'card');
      });

      expect(required).toEqual([]);
    });
  });

  describe('validateStep1', () => {
    test('should validate step 1 and update state', () => {
      parsePhoneNumber.mockReturnValue({
        isValid: () => true,
        formatNational: () => '07700 900000'
      });
      const { result } = renderHook(() => useCheckoutValidation());

      act(() => {
        result.current.validateStep1(
          { mobile_phone: '+447700900000', email_address: 'test@example.com' },
          { addressData: { address_line_1: '123 Main', city: 'London', postal_code: 'SW1A 1AA', country: 'UK' } },
          { addressData: { address_line_1: '456 Oak', city: 'Manchester', postal_code: 'M1 1AA', country: 'UK' } }
        );
      });

      expect(result.current.contactValidation.mobilePhone.isValid).toBe(true);
      expect(result.current.addressValidation.deliveryAddress.isValid).toBe(true);
    });

    test('should return errors for invalid step 1 data', () => {
      parsePhoneNumber.mockReturnValue(null);
      const { result } = renderHook(() => useCheckoutValidation());

      let validation;
      act(() => {
        validation = result.current.validateStep1(
          { mobile_phone: 'invalid', email_address: 'invalid' },
          { addressData: {} },
          { addressData: {} }
        );
      });

      expect(validation.canProceed).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('resetValidation', () => {
    test('should reset validation state', async () => {
      const mockResult = {
        canProceed: true,
        blocked: false,
        summary: { total_required: 1, total_satisfied: 1, total_missing: 0 }
      };
      acknowledgmentService.validateCheckoutReadiness.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCheckoutValidation());

      await act(async () => {
        await result.current.validateCheckout({ id: 1 }, [{ id: 1 }], 'card');
      });

      expect(result.current.canProceed).toBe(true);

      act(() => {
        result.current.resetValidation();
      });

      expect(result.current.canProceed).toBe(false);
      expect(result.current.isValidating).toBe(false);
    });
  });

  describe('getStatusMessage', () => {
    test('should return validating message', async () => {
      let resolvePromise;
      acknowledgmentService.validateCheckoutReadiness.mockImplementation(
        () => new Promise(resolve => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useCheckoutValidation());

      act(() => {
        result.current.validateCheckout({ id: 1 }, [{ id: 1 }], 'card');
      });

      expect(result.current.statusMessage).toBe('Validating acknowledgments...');

      await act(async () => {
        resolvePromise({ canProceed: true, blocked: false, summary: {} });
      });
    });

    test('should return error message', async () => {
      acknowledgmentService.validateCheckoutReadiness.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useCheckoutValidation());

      await act(async () => {
        await result.current.validateCheckout({ id: 1 }, [{ id: 1 }], 'card');
      });

      expect(result.current.statusMessage).toContain('Validation error');
    });

    test('should return blocked message', async () => {
      const mockResult = {
        canProceed: false,
        blocked: true,
        summary: { total_required: 2, total_satisfied: 0, total_missing: 2 }
      };
      acknowledgmentService.validateCheckoutReadiness.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCheckoutValidation());

      await act(async () => {
        await result.current.validateCheckout({ id: 1 }, [{ id: 1 }], 'card');
      });

      expect(result.current.statusMessage).toContain('Checkout blocked');
    });

    test('should return ready message', async () => {
      const mockResult = {
        canProceed: true,
        blocked: false,
        summary: { total_required: 1, total_satisfied: 1, total_missing: 0 }
      };
      acknowledgmentService.validateCheckoutReadiness.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCheckoutValidation());

      await act(async () => {
        await result.current.validateCheckout({ id: 1 }, [{ id: 1 }], 'card');
      });

      expect(result.current.statusMessage).toContain('Ready to proceed');
    });
  });
});
