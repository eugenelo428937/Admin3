import httpService from "./httpService";

const BASE_URL = "/api/rules";

const rulesEngineService = {
  /**
   * Evaluate rules for a given entry point (core method)
   */
  evaluateRulesAtEntryPoint: async (entryPointCode, context = {}) => {
    try {
      const response = await httpService.post(`${BASE_URL}/engine/evaluate/`, {
        entry_point_code: entryPointCode,
        context: context
      });
      return response.data;
    } catch (error) {
      console.error("Error evaluating rules at entry point:", error);
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

// Entry point constants for the required functionality
export const ENTRY_POINTS = {
  HOME_PAGE_MOUNT: 'home_page_mount',        // Summer Holiday Display
  CHECKOUT_TERMS: 'checkout_terms',          // Terms & Conditions Acknowledge
  CHECKOUT_START: 'checkout_start'           // Checkout Start (expired deadlines, etc.)
}; 