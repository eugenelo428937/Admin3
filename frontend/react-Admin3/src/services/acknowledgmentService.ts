import httpService from './httpService';
import type {
  ComprehensiveValidationResult,
  MissingAcknowledgmentsResult,
  AcknowledgmentInfo,
  ValidationSummary,
  ValidationContext,
} from '../types/checkout';
import type { CartItem, CartData } from '../types/cart';

interface UserProfileParam {
  id?: number;
  email?: string;
  home_country?: string;
  work_country?: string;
  [key: string]: any;
}

interface CheckoutReadinessResult {
  canProceed: boolean;
  blocked: boolean;
  summary: ValidationSummary;
  missingAcknowledgments: MissingAcknowledgmentsResult;
  satisfiedAcknowledgments: AcknowledgmentInfo[];
  allRequiredAcknowledgments: AcknowledgmentInfo[];
  validationMessage: string;
}

interface AckDescriptionMap {
  [ackKey: string]: string;
}

/**
 * Acknowledgment Service
 *
 * Manages acknowledgments across all entry points for proper checkout blocking
 */
class AcknowledgmentService {
  /**
   * Validate all acknowledgments across all entry points before checkout
   */
  async validateComprehensiveCheckout(context: Record<string, any> = {}): Promise<ComprehensiveValidationResult> {
    try {
      console.log('[AcknowledgmentService] Validating checkout with context:', context);

      const response = await httpService.post('/api/rules/validate-comprehensive-checkout/', {
        context,
      });

      const result = response.data;
      console.log('[AcknowledgmentService] Validation response:', result);
      console.log('[AcknowledgmentService] Missing acknowledgments:', result.missing_acknowledgments);
      console.log('[AcknowledgmentService] Satisfied acknowledgments:', result.satisfied_acknowledgments);

      return {
        success: result.success,
        blocked: result.blocked,
        canProceed: result.can_proceed,
        summary: result.summary || {
          total_required: 0,
          total_satisfied: 0,
          total_missing: 0,
        },
        allRequiredAcknowledgments: result.all_required_acknowledgments || [],
        missingAcknowledgments: result.missing_acknowledgments || [],
        satisfiedAcknowledgments: result.satisfied_acknowledgments || [],
        blockingRules: result.blocking_rules || [],
      };
    } catch (error: unknown) {
      console.error('[Comprehensive Validation] Error:', error);

      const axiosError = error as { response?: { data?: { error?: string } }; message?: string };

      // Return blocked state on error for safety
      return {
        success: false,
        blocked: true,
        canProceed: false,
        error: axiosError.response?.data?.error || axiosError.message,
        summary: {
          total_required: 0,
          total_satisfied: 0,
          total_missing: 0,
        },
        allRequiredAcknowledgments: [],
        missingAcknowledgments: [],
        satisfiedAcknowledgments: [],
        blockingRules: [],
      };
    }
  }

  /**
   * Collect all required acknowledgments from all entry points for a given context
   */
  async collectAllRequiredAcknowledgments(context: Record<string, any> = {}): Promise<AcknowledgmentInfo[]> {
    try {
      const result = await this.validateComprehensiveCheckout(context);
      return result.allRequiredAcknowledgments;
    } catch (error: unknown) {
      console.error('[Collect Acknowledgments] Error:', error);
      return [];
    }
  }

  /**
   * Check if all required acknowledgments are satisfied for checkout
   */
  async canProceedWithCheckout(context: Record<string, any> = {}): Promise<boolean> {
    try {
      const result = await this.validateComprehensiveCheckout(context);
      return result.canProceed && !result.blocked;
    } catch (error: unknown) {
      console.error('[Can Proceed Check] Error:', error);
      return false; // Block on error
    }
  }

  /**
   * Get detailed information about missing acknowledgments
   */
  async getMissingAcknowledgments(context: Record<string, any> = {}): Promise<MissingAcknowledgmentsResult> {
    try {
      const result = await this.validateComprehensiveCheckout(context);

      const missingByEntryPoint: Record<string, AcknowledgmentInfo[]> = {};
      const missingList = Array.isArray(result.missingAcknowledgments)
        ? result.missingAcknowledgments
        : [];

      missingList.forEach((missing: AcknowledgmentInfo) => {
        const entryPoint = missing.entry_point || 'unknown';
        if (!missingByEntryPoint[entryPoint]) {
          missingByEntryPoint[entryPoint] = [];
        }
        missingByEntryPoint[entryPoint].push(missing);
      });

      return {
        total: missingList.length,
        byEntryPoint: missingByEntryPoint,
        details: missingList,
        message: this.generateMissingAcknowledgmentsMessage(missingList),
      };
    } catch (error: unknown) {
      console.error('[Missing Acknowledgments] Error:', error);
      return {
        total: 0,
        byEntryPoint: {},
        details: [],
        message: 'Unable to validate acknowledgments. Please try again.',
      };
    }
  }

  /**
   * Generate a user-friendly message about missing acknowledgments
   */
  generateMissingAcknowledgmentsMessage(missingAcknowledgments: AcknowledgmentInfo[]): string {
    if (missingAcknowledgments.length === 0) {
      return '';
    }

    const descriptions: AckDescriptionMap = {
      terms_conditions_v1: 'Terms & Conditions',
      digital_content_v1: 'Digital Content Agreement',
      tutorial_credit_card_v1: 'Tutorial Credit Card Fee Acknowledgment',
    };

    const messages = missingAcknowledgments.map((missing: AcknowledgmentInfo) => {
      const entryPoint = missing.entry_point || 'unknown';
      const ackKey = missing.ackKey || 'unknown';

      const description = descriptions[ackKey] || ackKey;
      return `\u2022 ${description} (${entryPoint})`;
    });

    return `Please complete the following required acknowledgments before checkout:\n${messages.join('\n')}`;
  }

  /**
   * Build context for comprehensive validation from cart and user data
   */
  buildValidationContext(
    cartData: CartData | null | undefined,
    cartItems: CartItem[] | null | undefined,
    paymentMethod: string | null | undefined,
    userProfile: UserProfileParam | null = null,
  ): ValidationContext {
    const context: ValidationContext = {
      cart: {
        id: cartData?.id,
        items: cartItems || [],
        total:
          cartItems?.reduce(
            (sum: number, item: CartItem) =>
              sum + parseFloat(String(item.actual_price || 0)) * item.quantity,
            0,
          ) || 0,
        has_digital: cartData?.has_digital || false,
        has_material: cartData?.has_material || false,
        has_tutorial: cartData?.has_tutorial || false,
        has_marking: cartData?.has_marking || false,
      },
      payment: {
        method: paymentMethod || 'card',
        is_card: paymentMethod === 'card',
      },
    };

    // Add user context if available
    if (userProfile) {
      context.user = {
        id: userProfile.id,
        email: userProfile.email,
        is_authenticated: true,
        home_country: userProfile.home_country,
        work_country: userProfile.work_country,
      };
    }

    return context;
  }

  /**
   * Validate checkout readiness with detailed feedback
   */
  async validateCheckoutReadiness(
    cartData: CartData | null | undefined,
    cartItems: CartItem[] | null | undefined,
    paymentMethod: string | null | undefined,
    userProfile: UserProfileParam | null = null,
  ): Promise<CheckoutReadinessResult> {
    const context = this.buildValidationContext(cartData, cartItems, paymentMethod, userProfile);

    const validation = await this.validateComprehensiveCheckout(context);
    const missing = await this.getMissingAcknowledgments(context);

    return {
      canProceed: validation.canProceed,
      blocked: validation.blocked,
      summary: validation.summary,
      missingAcknowledgments: missing,
      satisfiedAcknowledgments: validation.satisfiedAcknowledgments,
      allRequiredAcknowledgments: validation.allRequiredAcknowledgments,
      validationMessage: missing.message,
    };
  }
}

// Export singleton instance
const acknowledgmentService = new AcknowledgmentService();
export default acknowledgmentService;
