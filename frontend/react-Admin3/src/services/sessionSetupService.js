import httpService from "./httpService";
import config from "../config";

const CATALOG_URL = `${config.catalogUrl}`;

const sessionSetupService = {
  /**
   * Get the previous exam session (most recently created before the given session).
   * Uses ordering=-id and page_size=2 to find the second result.
   * @param {number} currentSessionId - The newly created session ID
   * @returns {Promise<Object|null>} Previous session object or null
   */
  getPreviousSession: async (currentSessionId) => {
    const response = await httpService.get(`${CATALOG_URL}/exam-sessions/`, {
      params: { ordering: '-id', page_size: 2 },
    });
    const results = response.data.results || response.data;
    // Find first session that isn't the current one
    const previous = results.find((s) => s.id !== currentSessionId);
    return previous || null;
  },

  /**
   * Get subjects assigned to a specific exam session.
   * @param {number} sessionId - The exam session ID
   * @returns {Promise<Array>} List of ESS records
   */
  getSessionSubjects: async (sessionId) => {
    const response = await httpService.get(
      `${CATALOG_URL}/exam-session-subjects/`,
      { params: { exam_session: sessionId } }
    );
    return response.data.results || response.data;
  },

  /**
   * Copy products, prices, and create bundles from previous session.
   * @param {number} newSessionId - The new exam session ID
   * @param {number} previousSessionId - The previous session to copy from
   * @returns {Promise<Object>} Summary with counts
   */
  copyProducts: async (newSessionId, previousSessionId) => {
    const response = await httpService.post(
      `${CATALOG_URL}/session-setup/copy-products/`,
      {
        new_exam_session_id: newSessionId,
        previous_exam_session_id: previousSessionId,
      }
    );
    return response.data;
  },

  /**
   * Check if a session has existing data (subjects, products, bundles).
   * @param {number} sessionId - The exam session ID
   * @returns {Promise<Object>} Counts and has_data boolean
   */
  getSessionDataCounts: async (sessionId) => {
    const response = await httpService.get(
      `${CATALOG_URL}/session-setup/session-data-counts/${sessionId}/`
    );
    return response.data;
  },

  /**
   * Deactivate all subjects, products, prices, bundles, bundle products for a session.
   * @param {number} sessionId - The exam session ID
   * @returns {Promise<Object>} Counts of deactivated records
   */
  deactivateSessionData: async (sessionId) => {
    const response = await httpService.post(
      `${CATALOG_URL}/session-setup/deactivate-session-data/`,
      { exam_session_id: sessionId }
    );
    return response.data;
  },
};

export default sessionSetupService;
