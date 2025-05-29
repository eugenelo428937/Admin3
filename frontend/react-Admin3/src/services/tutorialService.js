import config from "../config";
import httpService from "./httpService";

const TUTORIAL_API_URL = config.tutorialUrl;

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
      const response = await httpService.get(`/api/tutorials/sessions/?event=${eventId}`);
      return response.data.results || response.data;
    } catch (error) {
      console.error("Error fetching sessions by event:", error);
      return [];
    }
  },
};

export default tutorialService;
