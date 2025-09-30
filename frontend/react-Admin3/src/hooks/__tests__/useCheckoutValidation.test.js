import { renderHook, act } from '@testing-library/react';
import useCheckoutValidation from '../useCheckoutValidation';

// Mock the services
jest.mock('../../services/acknowledgmentService', () => ({
  validateCheckoutReadiness: jest.fn(),
  buildValidationContext: jest.fn(),
  canProceedWithCheckout: jest.fn(),
  getMissingAcknowledgments: jest.fn(),
  collectAllRequiredAcknowledgments: jest.fn()
}));

jest.mock('../../services/phoneValidationService', () => ({
  default: {
    validatePhoneNumber: jest.fn((phone, countryCode) => {
      if (!phone) return { isValid: false, error: 'Phone number is required' };
      if (phone === '07712345678' || phone === '02071234567') {
        return { isValid: true, error: null };
      }
      return { isValid: false, error: 'Invalid phone number format' };
    })
  }
}));

describe('useCheckoutValidation', () => {
  describe('Email Validation', () => {
    it('should validate email correctly', () => {
      const { result } = renderHook(() => useCheckoutValidation());

      // Valid email
      expect(result.current.validateEmail('test@example.com')).toEqual({
        isValid: true,
        error: null
      });

      // Invalid email
      expect(result.current.validateEmail('invalid-email')).toEqual({
        isValid: false,
        error: 'Please enter a valid email address'
      });

      // Empty email
      expect(result.current.validateEmail('')).toEqual({
        isValid: false,
        error: 'Email address is required'
      });
    });
  });

  describe('Phone Validation', () => {
    it('should validate required phone numbers', () => {
      const { result } = renderHook(() => useCheckoutValidation());

      // Valid phone
      expect(result.current.validatePhone('07712345678', 'GB', true)).toEqual({
        isValid: true,
        error: null
      });

      // Empty required phone
      expect(result.current.validatePhone('', 'GB', true)).toEqual({
        isValid: false,
        error: 'Phone number is required'
      });

      // Invalid phone
      expect(result.current.validatePhone('123', 'GB', true)).toEqual({
        isValid: false,
        error: 'Invalid phone number format'
      });
    });

    it('should allow empty optional phone numbers', () => {
      const { result } = renderHook(() => useCheckoutValidation());

      expect(result.current.validatePhone('', 'GB', false)).toEqual({
        isValid: true,
        error: null
      });
    });
  });

  describe('Address Validation', () => {
    it('should validate address completeness', () => {
      const { result } = renderHook(() => useCheckoutValidation());

      // Valid address
      const validAddress = {
        address_line_1: '123 Main St',
        address_line_2: 'Apt 4',
        city: 'London',
        postal_code: 'SW1A 1AA',
        country: 'United Kingdom'
      };
      expect(result.current.validateAddress(validAddress, 'Delivery')).toEqual({
        isValid: true,
        error: null
      });

      // Missing required fields
      const invalidAddress = {
        address_line_1: '123 Main St',
        city: '',
        postal_code: '',
        country: 'United Kingdom'
      };
      expect(result.current.validateAddress(invalidAddress, 'Delivery')).toEqual({
        isValid: false,
        error: 'Delivery address is incomplete. Missing: City, Postal Code'
      });

      // Empty address
      expect(result.current.validateAddress(null, 'Invoice')).toEqual({
        isValid: false,
        error: 'Invoice address is required'
      });
    });

    it('should validate address with real user profile field names', () => {
      const { result } = renderHook(() => useCheckoutValidation());

      // Valid address using real user profile field names (street instead of address_line_1)
      const userProfileAddress = {
        street: '123 Main St',
        town: 'London',
        postcode: 'SW1A 1AA',
        country: 'United Kingdom'
      };
      expect(result.current.validateAddress(userProfileAddress, 'Delivery')).toEqual({
        isValid: true,
        error: null
      });

      // Valid address with building field
      const addressWithBuilding = {
        building: '42',
        street: 'Baker Street',
        city: 'London',
        postal_code: 'NW1 6XE',
        country: 'United Kingdom'
      };
      expect(result.current.validateAddress(addressWithBuilding, 'Invoice')).toEqual({
        isValid: true,
        error: null
      });

      // Invalid address missing street/address_line_1
      const addressMissingStreet = {
        town: 'London',
        postcode: 'SW1A 1AA',
        country: 'United Kingdom'
      };
      expect(result.current.validateAddress(addressMissingStreet, 'Delivery')).toEqual({
        isValid: false,
        error: 'Delivery address is incomplete. Missing: Address Line 1'
      });
    });
  });

  describe('Step 1 Validation', () => {
    it('should validate all Step 1 fields', () => {
      const { result } = renderHook(() => useCheckoutValidation());

      const validContactData = {
        mobile_phone: '07712345678',
        email_address: 'test@example.com',
        home_phone: '',
        work_phone: ''
      };

      const validDeliveryAddress = {
        addressType: 'HOME',
        addressData: {
          address_line_1: '123 Main St',
          city: 'London',
          postal_code: 'SW1A 1AA',
          country: 'United Kingdom'
        }
      };

      const validInvoiceAddress = {
        addressType: 'WORK',
        addressData: {
          address_line_1: '456 Office Blvd',
          city: 'London',
          postal_code: 'EC1A 1BB',
          country: 'United Kingdom'
        }
      };

      act(() => {
        const result = result.current.validateStep1(
          validContactData,
          validDeliveryAddress,
          validInvoiceAddress
        );

        expect(result.canProceed).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    it('should fail validation with missing required fields', () => {
      const { result } = renderHook(() => useCheckoutValidation());

      const invalidContactData = {
        mobile_phone: '',
        email_address: 'invalid-email',
        home_phone: '',
        work_phone: ''
      };

      const invalidDeliveryAddress = {
        addressType: 'HOME',
        addressData: {}
      };

      const validInvoiceAddress = {
        addressType: 'WORK',
        addressData: {
          address_line_1: '456 Office Blvd',
          city: 'London',
          postal_code: 'EC1A 1BB',
          country: 'United Kingdom'
        }
      };

      act(() => {
        const validationResult = result.current.validateStep1(
          invalidContactData,
          invalidDeliveryAddress,
          validInvoiceAddress
        );

        expect(validationResult.canProceed).toBe(false);
        expect(validationResult.errors.length).toBeGreaterThan(0);
        expect(validationResult.errors).toContain('Phone number is required');
        expect(validationResult.errors).toContain('Please enter a valid email address');
      });
    });
  });

  describe('Contact Info Validation', () => {
    it('should validate all contact fields', () => {
      const { result } = renderHook(() => useCheckoutValidation());

      const validContactData = {
        mobile_phone: '07712345678',
        email_address: 'test@example.com',
        home_phone: '02071234567',
        work_phone: ''
      };

      const validationResult = result.current.validateContactInfo(validContactData);
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toEqual([]);
      expect(validationResult.validations.mobilePhone.isValid).toBe(true);
      expect(validationResult.validations.email.isValid).toBe(true);
    });
  });

  describe('Addresses Validation', () => {
    it('should validate both delivery and invoice addresses', () => {
      const { result } = renderHook(() => useCheckoutValidation());

      const validDeliveryAddress = {
        addressType: 'HOME',
        addressData: {
          address_line_1: '123 Main St',
          city: 'London',
          postal_code: 'SW1A 1AA',
          country: 'United Kingdom'
        }
      };

      const validInvoiceAddress = {
        addressType: 'WORK',
        addressData: {
          address_line_1: '456 Office Blvd',
          city: 'London',
          postal_code: 'EC1A 1BB',
          country: 'United Kingdom'
        }
      };

      const validationResult = result.current.validateAddresses(
        validDeliveryAddress,
        validInvoiceAddress
      );

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toEqual([]);
      expect(validationResult.validations.deliveryAddress.isValid).toBe(true);
      expect(validationResult.validations.invoiceAddress.isValid).toBe(true);
    });

    it('should allow identical delivery and invoice addresses', () => {
      const { result } = renderHook(() => useCheckoutValidation());

      const sameAddress = {
        addressType: 'HOME',
        addressData: {
          address_line_1: '123 Main St',
          city: 'London',
          postal_code: 'SW1A 1AA',
          country: 'United Kingdom'
        }
      };

      const validationResult = result.current.validateAddresses(sameAddress, sameAddress);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toEqual([]);
    });
  });
});