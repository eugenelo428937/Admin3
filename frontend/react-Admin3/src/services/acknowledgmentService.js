import httpService from './httpService';

/**
 * Acknowledgment Service
 *
 * Manages acknowledgments across all entry points for proper checkout blocking
 */
class AcknowledgmentService {
  /**
   * Validate all acknowledgments across all entry points before checkout
   * @param {Object} context - Context for validation (cart, payment info, etc)
   * @returns {Promise<Object>} Comprehensive validation result
   */
  async validateComprehensiveCheckout(context = {}) {
    try {
      console.log('🔍 [AcknowledgmentService] Validating checkout with context:', context);

      const response = await httpService.post('/api/rules/validate-comprehensive-checkout/', {
        context
      });

      const result = response.data;
      console.log('🔍 [AcknowledgmentService] Validation response:', result);
      console.log('🔍 [AcknowledgmentService] Missing acknowledgments:', result.missing_acknowledgments);
      console.log('🔍 [AcknowledgmentService] Satisfied acknowledgments:', result.satisfied_acknowledgments);

      

      return {
        success: result.success,
        blocked: result.blocked,
        canProceed: result.can_proceed,
        summary: result.summary || {
          total_required: 0,
          total_satisfied: 0,
          total_missing: 0
        },
        allRequiredAcknowledgments: result.all_required_acknowledgments || [],
        missingAcknowledgments: result.missing_acknowledgments || [],
        satisfiedAcknowledgments: result.satisfied_acknowledgments || [],
        blockingRules: result.blocking_rules || []
      };
    } catch (error) {
      console.error('❌ [Comprehensive Validation] Error:', error);

      // Return blocked state on error for safety
      return {
        success: false,
        blocked: true,
        canProceed: false,
        error: error.response?.data?.error || error.message,
        summary: {
          total_required: 0,
          total_satisfied: 0,
          total_missing: 0
        },
        allRequiredAcknowledgments: [],
        missingAcknowledgments: [],
        satisfiedAcknowledgments: [],
        blockingRules: []
      };
    }
  }

  /**
   * Collect all required acknowledgments from all entry points for a given context
   * @param {Object} context - Context to check (cart info, payment method, etc)
   * @returns {Promise<Array>} List of all required acknowledgments
   */
  async collectAllRequiredAcknowledgments(context = {}) {
    try {
      const result = await this.validateComprehensiveCheckout(context);
      return result.allRequiredAcknowledgments;
    } catch (error) {
      console.error('❌ [Collect Acknowledgments] Error:', error);
      return [];
    }
  }

  /**
   * Check if all required acknowledgments are satisfied for checkout
   * @param {Object} context - Context to validate
   * @returns {Promise<boolean>} Whether checkout can proceed
   */
  async canProceedWithCheckout(context = {}) {
    try {
      const result = await this.validateComprehensiveCheckout(context);
      return result.canProceed && !result.blocked;
    } catch (error) {
      console.error('❌ [Can Proceed Check] Error:', error);
      return false; // Block on error
    }
  }

  /**
   * Get detailed information about missing acknowledgments
   * @param {Object} context - Context to validate
   * @returns {Promise<Object>} Detailed missing acknowledgments info
   */
  async getMissingAcknowledgments(context = {}) {
    try {
      const result = await this.validateComprehensiveCheckout(context);

      const missingByEntryPoint = {};
      result.missingAcknowledgments.forEach(missing => {
        const entryPoint = missing.entry_point || 'unknown';
        if (!missingByEntryPoint[entryPoint]) {
          missingByEntryPoint[entryPoint] = [];
        }
        missingByEntryPoint[entryPoint].push(missing);
      });

      return {
        total: result.missingAcknowledgments.length,
        byEntryPoint: missingByEntryPoint,
        details: result.missingAcknowledgments,
        message: this.generateMissingAcknowledgmentsMessage(result.missingAcknowledgments)
      };
    } catch (error) {
      console.error('❌ [Missing Acknowledgments] Error:', error);
      return {
        total: 0,
        byEntryPoint: {},
        details: [],
        message: 'Unable to validate acknowledgments. Please try again.'
      };
    }
  }

  /**
   * Generate a user-friendly message about missing acknowledgments
   * @param {Array} missingAcknowledgments - List of missing acknowledgments
   * @returns {string} User-friendly message
   */
  generateMissingAcknowledgmentsMessage(missingAcknowledgments) {
    if (missingAcknowledgments.length === 0) {
      return '';
    }

    const messages = missingAcknowledgments.map(missing => {
      const entryPoint = missing.entry_point || 'unknown';
      const ackKey = missing.ackKey || 'unknown';

      // Create user-friendly descriptions
      const descriptions = {
        'terms_conditions_v1': 'Terms & Conditions',
        'digital_content_v1': 'Digital Content Agreement',
        'tutorial_credit_card_v1': 'Tutorial Credit Card Fee Acknowledgment'
      };

      const description = descriptions[ackKey] || ackKey;
      return `• ${description} (${entryPoint})`;
    });

    return `Please complete the following required acknowledgments before checkout:\n${messages.join('\n')}`;
  }

  /**
   * Build context for comprehensive validation from cart and user data
   * @param {Object} cartData - Cart data
   * @param {Array} cartItems - Cart items
   * @param {string} paymentMethod - Payment method
   * @param {Object} userProfile - User profile data (optional)
   * @returns {Object} Context for validation
   */
  buildValidationContext(cartData, cartItems, paymentMethod, userProfile = null) {
    const context = {
      cart: {
        id: cartData?.id,
        items: cartItems || [],
        total: cartItems?.reduce((sum, item) => sum + (parseFloat(item.actual_price || 0) * item.quantity), 0) || 0,
        has_digital: cartData?.has_digital || false,
        has_material: cartData?.has_material || false,
        has_tutorial: cartData?.has_tutorial || false,
        has_marking: cartData?.has_marking || false
      },
      payment: {
        method: paymentMethod || 'card',
        is_card: paymentMethod === 'card'
      }
    };

    // Add user context if available
    if (userProfile) {
      context.user = {
        id: userProfile.id,
        email: userProfile.email,
        is_authenticated: true,
        home_country: userProfile.home_country,
        work_country: userProfile.work_country
      };
    }

    return context;
  }

  /**
   * Validate checkout readiness with detailed feedback
   * @param {Object} cartData - Cart data
   * @param {Array} cartItems - Cart items
   * @param {string} paymentMethod - Payment method
   * @param {Object} userProfile - User profile (optional)
   * @returns {Promise<Object>} Detailed checkout readiness result
   */
  async validateCheckoutReadiness(cartData, cartItems, paymentMethod, userProfile = null) {
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
      validationMessage: missing.message
    };
  }
}

// Export singleton instance
const acknowledgmentService = new AcknowledgmentService();
export default acknowledgmentService;