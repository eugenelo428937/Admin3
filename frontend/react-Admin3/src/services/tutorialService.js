import config from "../config";
import httpService from "./httpService";

// Add validation for tutorial URL
const TUTORIAL_API_URL = config.tutorialUrl || `${config.apiBaseUrl || config.apiUrl}/tutorials`;

const tutorialService = {
  getEvents: async () => {
    try {
      const response = await httpService.get(`${TUTORIAL_API_URL}/list/`);
      // Ensure we're returning an array
      if (!response.data) return [];
      return Array.isArray(response.data)
        ? response.data
        : response.data.results || Object.values(response.data) || [];
    } catch (error) {
      console.error("Error fetching tutorial events:", error);
      return []; // Return empty array on error
    }
  },
  getAllEvents: async () => {
    try {
      const response = await httpService.get(`${TUTORIAL_API_URL}/events/`);
      return response.data.results || response.data;
    } catch (error) {
      console.error("Error fetching all tutorial events:", error);
      return [];
    }
  },

  getEventById: async (id) => {
    try {
      const response = await httpService.get(
			`${TUTORIAL_API_URL}/events/${id}/`
		);
      return response.data;
    } catch (error) {
      console.error("Error fetching tutorial event by id:", error);
      throw error;
    }
  },

  getSessions: async () => {
    try {
      const response = await httpService.get(`${TUTORIAL_API_URL}/sessions/`);
      return response.data.results || response.data;
    } catch (error) {
      console.error("Error fetching tutorial sessions:", error);
      return [];
    }
  },

  getSessionsByEvent: async (eventId) => {
    try {
      const response = await httpService.get(
			`${TUTORIAL_API_URL}/sessions/?event=${eventId}`
		);
      return response.data.results || response.data;
    } catch (error) {
      console.error("Error fetching sessions by event:", error);
      return [];
    }
  },

  getAllTutorialProducts: async () => {
    try {
      if (!TUTORIAL_API_URL) {
        throw new Error('Tutorial API URL not configured');
      }
      const response = await httpService.get(`${TUTORIAL_API_URL}/products/all/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching all tutorial products:', error);
      // Return empty array instead of throwing for better UX
      return [];
    }
  },

  getTutorialProducts: async (examSessionId, subjectCode) => {
    try {
      if (!examSessionId || !subjectCode) {
        throw new Error('exam_session and subject_code parameters are required');
      }
      
      const response = await httpService.get(`${TUTORIAL_API_URL}/products/`, {
        params: {
          exam_session: examSessionId,
          subject_code: subjectCode
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching tutorial products:', error);
      throw error;
    }
  },

  getTutorialVariations: async (productId, subjectCode) => {
    try {
      const response = await httpService.get(
			`${TUTORIAL_API_URL}/products/${productId}/variations/`,
			{
				params: {
					subject_code: subjectCode,
				},
			}
		);
      return response.data;
    } catch (error) {
      console.error('Error fetching tutorial variations:', error);
      throw error;
    }
  },

  // New method to fetch all tutorial data in one call
  getComprehensiveTutorialData: async () => {
    try {
      if (!TUTORIAL_API_URL) {
        throw new Error('Tutorial API URL not configured');
      }
      const response = await httpService.get(`${TUTORIAL_API_URL}/data/comprehensive/`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching comprehensive tutorial data:', error);
      return [];
    }
  },
};

export default tutorialService;
