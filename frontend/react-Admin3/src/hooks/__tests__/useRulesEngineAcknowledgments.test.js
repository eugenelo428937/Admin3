/**
 * Tests for useRulesEngineAcknowledgments hook
 *
 * @module hooks/__tests__/useRulesEngineAcknowledgments.test
 *
 * Tests hook operations including:
 * - Initial state values
 * - showAcknowledgmentModal: Display acknowledgment modal
 * - closeAcknowledgmentModal: Close modal with optional callback
 * - submitAcknowledgment: Submit acknowledgment data
 * - executeRulesWithAcknowledgments: Execute rules and handle acks
 * - hasAcknowledgment: Check if acknowledgment exists
 * - validateCheckoutAcknowledgments: Validate checkout acks
 * - handleAddToCartAcknowledgments: Add to cart convenience method
 * - handleCheckoutTermsAcknowledgments: Checkout terms convenience method
 * - clearError: Reset error state
 */

import { renderHook, act } from '@testing-library/react';
import useRulesEngineAcknowledgments from '../useRulesEngineAcknowledgments';

// Mock dependencies
jest.mock('../../services/AcknowledgmentService', () => ({
  __esModule: true,
  default: {
    submitAcknowledgment: jest.fn(),
    hasAcknowledgment: jest.fn(),
    validateCheckoutAcknowledgments: jest.fn(),
  },
}));

jest.mock('../../utils/rulesEngineUtils', () => ({
  __esModule: true,
  rulesEngineHelpers: {},
  executeAndProcessRules: jest.fn(),
  buildRulesContext: jest.fn(),
}));

import acknowledgmentService from '../../services/AcknowledgmentService';
import { executeAndProcessRules } from '../../utils/rulesEngineUtils';

describe('useRulesEngineAcknowledgments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    test('should have default acknowledgmentModal state', () => {
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      expect(result.current.acknowledgmentModal).toEqual({
        open: false,
        message: null,
        entryPointLocation: null,
        onAcknowledge: null,
        onClose: null,
        required: true,
      });
    });

    test('should have loading as false initially', () => {
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      expect(result.current.loading).toBe(false);
    });

    test('should have error as null initially', () => {
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      expect(result.current.error).toBeNull();
    });
  });

  describe('showAcknowledgmentModal', () => {
    test('should open modal with provided parameters', () => {
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      const message = { title: 'Test', content: 'Test content' };
      const onAcknowledge = jest.fn();
      const onClose = jest.fn();

      act(() => {
        result.current.showAcknowledgmentModal({
          message,
          entryPointLocation: 'checkout_terms',
          onAcknowledge,
          onClose,
          required: true,
        });
      });

      expect(result.current.acknowledgmentModal).toEqual({
        open: true,
        message,
        entryPointLocation: 'checkout_terms',
        onAcknowledge,
        onClose,
        required: true,
      });
    });

    test('should default required to true', () => {
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      act(() => {
        result.current.showAcknowledgmentModal({
          message: { title: 'Test' },
          entryPointLocation: 'test',
        });
      });

      expect(result.current.acknowledgmentModal.required).toBe(true);
    });

    test('should allow required to be false', () => {
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      act(() => {
        result.current.showAcknowledgmentModal({
          message: { title: 'Test' },
          entryPointLocation: 'test',
          required: false,
        });
      });

      expect(result.current.acknowledgmentModal.required).toBe(false);
    });
  });

  describe('closeAcknowledgmentModal', () => {
    test('should close modal', () => {
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      // First open the modal
      act(() => {
        result.current.showAcknowledgmentModal({
          message: { title: 'Test' },
          entryPointLocation: 'test',
        });
      });

      expect(result.current.acknowledgmentModal.open).toBe(true);

      // Then close it
      act(() => {
        result.current.closeAcknowledgmentModal();
      });

      expect(result.current.acknowledgmentModal.open).toBe(false);
    });

    test('should call onClose callback if provided', () => {
      const { result } = renderHook(() => useRulesEngineAcknowledgments());
      const onClose = jest.fn();

      act(() => {
        result.current.showAcknowledgmentModal({
          message: { title: 'Test' },
          entryPointLocation: 'test',
          onClose,
        });
      });

      act(() => {
        result.current.closeAcknowledgmentModal();
      });

      expect(onClose).toHaveBeenCalled();
    });

    test('should not throw if onClose is not provided', () => {
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      act(() => {
        result.current.showAcknowledgmentModal({
          message: { title: 'Test' },
          entryPointLocation: 'test',
        });
      });

      expect(() => {
        act(() => {
          result.current.closeAcknowledgmentModal();
        });
      }).not.toThrow();
    });
  });

  describe('submitAcknowledgment', () => {
    test('should submit acknowledgment successfully', async () => {
      acknowledgmentService.submitAcknowledgment.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      let submitResult;
      await act(async () => {
        submitResult = await result.current.submitAcknowledgment({ ackKey: 'terms_v1' });
      });

      expect(acknowledgmentService.submitAcknowledgment).toHaveBeenCalledWith({ ackKey: 'terms_v1' });
      expect(submitResult).toEqual({ success: true });
    });

    test('should set loading during submission', async () => {
      let resolvePromise;
      acknowledgmentService.submitAcknowledgment.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      act(() => {
        result.current.submitAcknowledgment({ ackKey: 'test' });
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise({ success: true });
      });

      expect(result.current.loading).toBe(false);
    });

    test('should call onAcknowledge callback on success', async () => {
      acknowledgmentService.submitAcknowledgment.mockResolvedValue({ success: true });
      const onAcknowledge = jest.fn();
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      act(() => {
        result.current.showAcknowledgmentModal({
          message: { title: 'Test' },
          entryPointLocation: 'test',
          onAcknowledge,
        });
      });

      await act(async () => {
        await result.current.submitAcknowledgment({ ackKey: 'test' });
      });

      expect(onAcknowledge).toHaveBeenCalledWith({ ackKey: 'test' });
    });

    test('should close modal on success', async () => {
      acknowledgmentService.submitAcknowledgment.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      act(() => {
        result.current.showAcknowledgmentModal({
          message: { title: 'Test' },
          entryPointLocation: 'test',
        });
      });

      expect(result.current.acknowledgmentModal.open).toBe(true);

      await act(async () => {
        await result.current.submitAcknowledgment({ ackKey: 'test' });
      });

      expect(result.current.acknowledgmentModal.open).toBe(false);
    });

    test('should set error on failure', async () => {
      acknowledgmentService.submitAcknowledgment.mockRejectedValue(new Error('Submission failed'));
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      await act(async () => {
        try {
          await result.current.submitAcknowledgment({ ackKey: 'test' });
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Submission failed');
    });

    test('should throw error on failure', async () => {
      const error = new Error('Submission failed');
      acknowledgmentService.submitAcknowledgment.mockRejectedValue(error);
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      await expect(
        act(async () => {
          await result.current.submitAcknowledgment({ ackKey: 'test' });
        })
      ).rejects.toThrow('Submission failed');
    });

    test('should reset loading on failure', async () => {
      acknowledgmentService.submitAcknowledgment.mockRejectedValue(new Error('Submission failed'));
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      await act(async () => {
        try {
          await result.current.submitAcknowledgment({ ackKey: 'test' });
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('executeRulesWithAcknowledgments', () => {
    test('should execute rules and return true on success', async () => {
      executeAndProcessRules.mockResolvedValue({
        success: true,
        blocked: false,
        messages: { classified: { acknowledgments: { modal: [] } } },
      });
      const mockService = { execute: jest.fn() };
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      let execResult;
      await act(async () => {
        execResult = await result.current.executeRulesWithAcknowledgments(
          'checkout_terms',
          { user: { id: '1' } },
          mockService
        );
      });

      expect(executeAndProcessRules).toHaveBeenCalledWith(
        'checkout_terms',
        { user: { id: '1' } },
        mockService,
        { processAcknowledgments: true, sortByPriority: true }
      );
      expect(execResult).toBe(true);
    });

    test('should return false when blocked', async () => {
      executeAndProcessRules.mockResolvedValue({
        success: true,
        blocked: true,
        messages: { classified: { acknowledgments: { modal: [] } } },
      });
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      let execResult;
      await act(async () => {
        execResult = await result.current.executeRulesWithAcknowledgments('checkout', {});
      });

      expect(execResult).toBe(false);
    });

    test('should return false when not successful', async () => {
      executeAndProcessRules.mockResolvedValue({
        success: false,
        blocked: false,
        messages: { classified: { acknowledgments: { modal: [] } } },
      });
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      let execResult;
      await act(async () => {
        execResult = await result.current.executeRulesWithAcknowledgments('checkout', {});
      });

      expect(execResult).toBe(false);
    });

    test('should show modal for each acknowledgment message', async () => {
      const mockMessages = [
        { title: 'Terms 1', content: 'Content 1', required: true },
        { title: 'Terms 2', content: 'Content 2', required: false },
      ];
      executeAndProcessRules.mockResolvedValue({
        success: true,
        blocked: false,
        messages: { classified: { acknowledgments: { modal: mockMessages } } },
      });
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      await act(async () => {
        await result.current.executeRulesWithAcknowledgments('checkout', {});
      });

      // The last modal should be shown
      expect(result.current.acknowledgmentModal.open).toBe(true);
    });

    test('should handle missing messages gracefully', async () => {
      executeAndProcessRules.mockResolvedValue({
        success: true,
        blocked: false,
        messages: null,
      });
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      await act(async () => {
        await result.current.executeRulesWithAcknowledgments('checkout', {});
      });

      // Should not throw
      expect(result.current.loading).toBe(false);
    });

    test('should handle missing classified messages gracefully', async () => {
      executeAndProcessRules.mockResolvedValue({
        success: true,
        blocked: false,
        messages: { classified: null },
      });
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      await act(async () => {
        await result.current.executeRulesWithAcknowledgments('checkout', {});
      });

      expect(result.current.loading).toBe(false);
    });

    test('should set loading during execution', async () => {
      let resolvePromise;
      executeAndProcessRules.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      act(() => {
        result.current.executeRulesWithAcknowledgments('checkout', {});
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise({ success: true, blocked: false, messages: {} });
      });

      expect(result.current.loading).toBe(false);
    });

    test('should set error and return false on exception', async () => {
      executeAndProcessRules.mockRejectedValue(new Error('Rules execution failed'));
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      let execResult;
      await act(async () => {
        execResult = await result.current.executeRulesWithAcknowledgments('checkout', {});
      });

      expect(execResult).toBe(false);
      expect(result.current.error).toBe('Rules execution failed');
    });
  });

  describe('hasAcknowledgment', () => {
    test('should check if acknowledgment exists', async () => {
      acknowledgmentService.hasAcknowledgment.mockResolvedValue(true);
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      let hasAck;
      await act(async () => {
        hasAck = await result.current.hasAcknowledgment('terms_v1', 'checkout_terms');
      });

      expect(acknowledgmentService.hasAcknowledgment).toHaveBeenCalledWith('terms_v1', 'checkout_terms');
      expect(hasAck).toBe(true);
    });

    test('should return false when acknowledgment does not exist', async () => {
      acknowledgmentService.hasAcknowledgment.mockResolvedValue(false);
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      let hasAck;
      await act(async () => {
        hasAck = await result.current.hasAcknowledgment('terms_v1', 'checkout_terms');
      });

      expect(hasAck).toBe(false);
    });

    test('should set error and return false on failure', async () => {
      acknowledgmentService.hasAcknowledgment.mockRejectedValue(new Error('Check failed'));
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      let hasAck;
      await act(async () => {
        hasAck = await result.current.hasAcknowledgment('terms_v1', 'checkout_terms');
      });

      expect(hasAck).toBe(false);
      expect(result.current.error).toBe('Check failed');
    });
  });

  describe('validateCheckoutAcknowledgments', () => {
    test('should validate checkout acknowledgments', async () => {
      const mockResult = {
        canProceed: true,
        blocking: false,
        requiredAcknowledgments: [],
        messages: [],
        success: true,
      };
      acknowledgmentService.validateCheckoutAcknowledgments.mockResolvedValue(mockResult);
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      let validateResult;
      await act(async () => {
        validateResult = await result.current.validateCheckoutAcknowledgments();
      });

      expect(acknowledgmentService.validateCheckoutAcknowledgments).toHaveBeenCalled();
      expect(validateResult).toEqual(mockResult);
    });

    test('should set loading during validation', async () => {
      let resolvePromise;
      acknowledgmentService.validateCheckoutAcknowledgments.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      act(() => {
        result.current.validateCheckoutAcknowledgments();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise({ canProceed: true });
      });

      expect(result.current.loading).toBe(false);
    });

    test('should return error result on failure', async () => {
      acknowledgmentService.validateCheckoutAcknowledgments.mockRejectedValue(
        new Error('Validation failed')
      );
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      let validateResult;
      await act(async () => {
        validateResult = await result.current.validateCheckoutAcknowledgments();
      });

      expect(validateResult).toEqual({
        canProceed: false,
        blocking: true,
        requiredAcknowledgments: [],
        messages: [],
        success: false,
        error: 'Validation failed',
      });
      expect(result.current.error).toBe('Validation failed');
    });
  });

  describe('handleAddToCartAcknowledgments', () => {
    test('should call executeRulesWithAcknowledgments with add_to_cart entry point', async () => {
      executeAndProcessRules.mockResolvedValue({
        success: true,
        blocked: false,
        messages: {},
      });
      const mockService = { execute: jest.fn() };
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      await act(async () => {
        await result.current.handleAddToCartAcknowledgments(123, { quantity: 1 }, mockService);
      });

      expect(executeAndProcessRules).toHaveBeenCalledWith(
        'add_to_cart',
        {
          product: { product_id: 123 },
          quantity: 1,
        },
        mockService,
        { processAcknowledgments: true, sortByPriority: true }
      );
    });

    test('should work without additional context', async () => {
      executeAndProcessRules.mockResolvedValue({
        success: true,
        blocked: false,
        messages: {},
      });
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      await act(async () => {
        await result.current.handleAddToCartAcknowledgments(456);
      });

      expect(executeAndProcessRules).toHaveBeenCalledWith(
        'add_to_cart',
        { product: { product_id: 456 } },
        undefined,
        expect.any(Object)
      );
    });
  });

  describe('handleCheckoutTermsAcknowledgments', () => {
    test('should call executeRulesWithAcknowledgments with checkout_terms entry point', async () => {
      executeAndProcessRules.mockResolvedValue({
        success: true,
        blocked: false,
        messages: {},
      });
      const mockService = { execute: jest.fn() };
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      await act(async () => {
        await result.current.handleCheckoutTermsAcknowledgments({ cart: { total: 100 } }, mockService);
      });

      expect(executeAndProcessRules).toHaveBeenCalledWith(
        'checkout_terms',
        { cart: { total: 100 } },
        mockService,
        { processAcknowledgments: true, sortByPriority: true }
      );
    });

    test('should work without context', async () => {
      executeAndProcessRules.mockResolvedValue({
        success: true,
        blocked: false,
        messages: {},
      });
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      await act(async () => {
        await result.current.handleCheckoutTermsAcknowledgments();
      });

      expect(executeAndProcessRules).toHaveBeenCalledWith(
        'checkout_terms',
        {},
        undefined,
        expect.any(Object)
      );
    });
  });

  describe('clearError', () => {
    test('should reset error to null', async () => {
      executeAndProcessRules.mockRejectedValue(new Error('Test error'));
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      // First create an error
      await act(async () => {
        await result.current.executeRulesWithAcknowledgments('test', {});
      });

      expect(result.current.error).toBe('Test error');

      // Then clear it
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('return values', () => {
    test('should return all expected properties and methods', () => {
      const { result } = renderHook(() => useRulesEngineAcknowledgments());

      // State
      expect(result.current).toHaveProperty('acknowledgmentModal');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');

      // Actions
      expect(result.current).toHaveProperty('showAcknowledgmentModal');
      expect(result.current).toHaveProperty('closeAcknowledgmentModal');
      expect(result.current).toHaveProperty('submitAcknowledgment');
      expect(result.current).toHaveProperty('executeRulesWithAcknowledgments');
      expect(result.current).toHaveProperty('hasAcknowledgment');
      expect(result.current).toHaveProperty('validateCheckoutAcknowledgments');

      // Convenience methods
      expect(result.current).toHaveProperty('handleAddToCartAcknowledgments');
      expect(result.current).toHaveProperty('handleCheckoutTermsAcknowledgments');

      // Reset
      expect(result.current).toHaveProperty('clearError');

      // All should be functions except state values
      expect(typeof result.current.showAcknowledgmentModal).toBe('function');
      expect(typeof result.current.closeAcknowledgmentModal).toBe('function');
      expect(typeof result.current.submitAcknowledgment).toBe('function');
      expect(typeof result.current.executeRulesWithAcknowledgments).toBe('function');
      expect(typeof result.current.hasAcknowledgment).toBe('function');
      expect(typeof result.current.validateCheckoutAcknowledgments).toBe('function');
      expect(typeof result.current.handleAddToCartAcknowledgments).toBe('function');
      expect(typeof result.current.handleCheckoutTermsAcknowledgments).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });
});
