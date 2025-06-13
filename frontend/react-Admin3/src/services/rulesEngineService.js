import httpService from "./httpService";

const BASE_URL = "/api/rules";

const rulesEngineService = {
  /**
   * Evaluate rules for a given trigger
   */
  evaluateRules: async (triggerType, context = {}) => {
    try {
      const response = await httpService.post(`${BASE_URL}/engine/evaluate/`, {
        trigger_type: triggerType,
        context: context
      });
      return response.data;
    } catch (error) {
      console.error("Error evaluating rules:", error);
      throw error;
    }
  },

  /**
   * Calculate VAT for checkout using rules engine
   */
  calculateVAT: async (cartItems = [], userCountry = 'GB', customerType = 'individual') => {
    try {
      const response = await httpService.post(`${BASE_URL}/engine/calculate-vat/`, {
        cart_items: cartItems,
        user_country: userCountry,
        customer_type: customerType
      });
      return response.data;
    } catch (error) {
      console.error("Error calculating VAT:", error);
      throw error;
    }
  },

  /**
   * Acknowledge a rule (for required acknowledgments)
   */
  acknowledgeRule: async (ruleId, templateId = null, acknowledgmentType = 'required') => {
    try {
      const response = await httpService.post(`${BASE_URL}/engine/acknowledge/`, {
        rule_id: ruleId,
        template_id: templateId,
        acknowledgment_type: acknowledgmentType,
        is_selected: acknowledgmentType === 'required' ? true : false
      });
      return response.data;
    } catch (error) {
      console.error("Error acknowledging rule:", error);
      throw error;
    }
  },

  /**
   * Select/deselect an optional rule
   */
  selectOptionalRule: async (ruleId, templateId = null, isSelected = true) => {
    try {
      const response = await httpService.post(`${BASE_URL}/engine/acknowledge/`, {
        rule_id: ruleId,
        template_id: templateId,
        acknowledgment_type: 'optional',
        is_selected: isSelected
      });
      return response.data;
    } catch (error) {
      console.error("Error selecting optional rule:", error);
      throw error;
    }
  },

  /**
   * Get pending acknowledgments for the current user
   */
  getPendingAcknowledgments: async (triggerType = null) => {
    try {
      const params = triggerType ? { trigger_type: triggerType } : {};
      const response = await httpService.get(`${BASE_URL}/engine/pending-acknowledgments/`, {
        params
      });
      return response.data;
    } catch (error) {
      console.error("Error getting pending acknowledgments:", error);
      throw error;
    }
  },

  /**
   * Get user's previous selections for optional rules
   */
  getUserSelections: async (triggerType = null) => {
    try {
      const params = triggerType ? { trigger_type: triggerType } : {};
      const response = await httpService.get(`${BASE_URL}/engine/user-selections/`, {
        params
      });
      return response.data;
    } catch (error) {
      console.error("Error getting user selections:", error);
      throw error;
    }
  },

  /**
   * Validate checkout and get any required acknowledgments
   */
  validateCheckout: async () => {
    try {
      const response = await httpService.post(`${BASE_URL}/engine/checkout-validation/`);
      return response.data;
    } catch (error) {
      console.error("Error validating checkout:", error);
      throw error;
    }
  },

  /**
   * Evaluate rules for adding item to cart
   */
  evaluateCartAdd: async (productId, context = {}) => {
    try {
      return await rulesEngineService.evaluateRules('cart_add', {
        product: { id: productId },
        ...context
      });
    } catch (error) {
      console.error("Error evaluating cart add rules:", error);
      throw error;
    }
  },

  /**
   * Evaluate rules for checkout start
   */
  evaluateCheckoutStart: async (cartItems = [], context = {}) => {
    try {
      return await rulesEngineService.evaluateRules('checkout_start', {
        cart_items: cartItems.map(item => item.id),
        cart_item_count: cartItems.length,
        ...context
      });
    } catch (error) {
      console.error("Error evaluating checkout start rules:", error);
      throw error;
    }
  },

  /**
   * Evaluate rules for product view
   */
  evaluateProductView: async (productId, context = {}) => {
    try {
      return await rulesEngineService.evaluateRules('product_view', {
        product: { id: productId },
        ...context
      });
    } catch (error) {
      console.error("Error evaluating product view rules:", error);
      throw error;
    }
  }
};

export default rulesEngineService; 