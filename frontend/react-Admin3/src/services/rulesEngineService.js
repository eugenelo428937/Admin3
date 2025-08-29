import httpService from "./httpService";

const BASE_URL = "/api/rules";

const rulesEngineService = {
  /**
   * Evaluate rules for a given entry point (core method with debug logging)
   */
  evaluateRulesAtEntryPoint: async (entryPointCode, context = {}) => {
    try {
      // console.log(`🎯 Rules Engine: Triggering entry point "${entryPointCode}"`, { context });
      
      const response = await httpService.post(`${BASE_URL}/engine/execute/`, {
        entry_point: entryPointCode,
        context: context
      });
      
      const rulesCount = response.data.rules_evaluated || 0;
      // console.log(`📊 Rules Engine: Entry point "${entryPointCode}" - ${rulesCount} rules fetched and evaluated`, response.data);
      
      return response.data;
    } catch (error) {
      console.error(`❌ Rules Engine: Error evaluating entry point "${entryPointCode}":`, error);
      throw error;
    }
  },

  /**
   * Evaluate rules for home page mount (Summer Holiday Display)
   */
  evaluateHomePage: async (context = {}) => {
    try {
      return await rulesEngineService.evaluateRulesAtEntryPoint('home_page_mount', context);
    } catch (error) {
      console.error("Error evaluating home page rules:", error);
      throw error;
    }
  },

  /**
   * Evaluate rules for checkout terms & conditions (T&C Acknowledge)
   */
  evaluateCheckoutTerms: async (context = {}) => {
    try {
      return await rulesEngineService.evaluateRulesAtEntryPoint('checkout_terms', context);
    } catch (error) {
      console.error("Error evaluating checkout terms rules:", error);
      throw error;
    }
  },

  /**
   * Evaluate rules for checkout start (expired deadlines and other warnings)
   */
  evaluateCheckoutStart: async (context = {}) => {
    try {
      return await rulesEngineService.evaluateRulesAtEntryPoint('checkout_start', context);
    } catch (error) {
      console.error("Error evaluating checkout start rules:", error);
      throw error;
    }
  },

  /**
   * Evaluate rules for product list mount
   */
  evaluateProductListMount: async (context = {}) => {
    try {
      return await rulesEngineService.evaluateRulesAtEntryPoint('product_list_mount', context);
    } catch (error) {
      console.error("Error evaluating product list mount rules:", error);
      throw error;
    }
  },

  /**
   * Evaluate rules for product card mount
   */
  evaluateProductCardMount: async (context = {}) => {
    try {
      return await rulesEngineService.evaluateRulesAtEntryPoint('product_card_mount', context);
    } catch (error) {
      console.error("Error evaluating product card mount rules:", error);
      throw error;
    }
  },

  /**
   * Evaluate rules for checkout preference
   */
  evaluateCheckoutPreference: async (context = {}) => {
    try {
      return await rulesEngineService.evaluateRulesAtEntryPoint('checkout_preference', context);
    } catch (error) {
      console.error("Error evaluating checkout preference rules:", error);
      throw error;
    }
  },

  /**
   * Evaluate rules for checkout payment
   */
  evaluateCheckoutPayment: async (context = {}) => {
    try {
      return await rulesEngineService.evaluateRulesAtEntryPoint('checkout_payment', context);
    } catch (error) {
      console.error("Error evaluating checkout payment rules:", error);
      throw error;
    }
  },

  /**
   * Acknowledge a rule by ID
   */
  acknowledgeRule: async (ruleId, templateId = null, acknowledgmentType = 'required') => {
    try {
      const response = await httpService.post(`${BASE_URL}/engine/acknowledge/`, {
        rule_id: ruleId,
        template_id: templateId,
        acknowledgment_type: acknowledgmentType,
        is_selected: true
      });
      return response.data;
    } catch (error) {
      console.error("Error acknowledging rule:", error);
      throw error;
    }
  }
};

export default rulesEngineService;

// Entry point constants for all functionality
export const ENTRY_POINTS = {
  HOME_PAGE_MOUNT: 'home_page_mount',           // Home page display
  PRODUCT_LIST_MOUNT: 'product_list_mount',     // Product list page
  PRODUCT_CARD_MOUNT: 'product_card_mount',     // Product card display
  CHECKOUT_START: 'checkout_start',             // Checkout initialization
  CHECKOUT_PREFERENCE: 'checkout_preference',   // Checkout preferences
  CHECKOUT_TERMS: 'checkout_terms',             // Terms & Conditions
  CHECKOUT_PAYMENT: 'checkout_payment'          // Payment process
}; 