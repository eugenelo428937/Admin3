import config from "../config";
import httpService from "./httpService";

const TUTORIAL_API_URL = (config as any).tutorialUrl || `${(config as any).apiBaseUrl || (config as any).apiUrl}/tutorials`;

const tutorialService = {
    // ─── Get Events (list view) ──────────────────────────────
    getEvents: async () => {
        try {
            const response = await httpService.get(`${TUTORIAL_API_URL}/list/`);
            if (!response.data) return [];
            return Array.isArray(response.data)
                ? response.data
                : response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching tutorial events:", error);
            return [];
        }
    },

    // ─── Get All Events ──────────────────────────────────────
    getAllEvents: async () => {
        try {
            const response = await httpService.get(`${TUTORIAL_API_URL}/events/`);
            return response.data.results || response.data;
        } catch (error) {
            console.error("Error fetching all tutorial events:", error);
            return [];
        }
    },

    // ─── Get Event by ID ─────────────────────────────────────
    getEventById: async (id: number | string) => {
        try {
            const response = await httpService.get(`${TUTORIAL_API_URL}/events/${id}/`);
            return response.data;
        } catch (error) {
            console.error("Error fetching tutorial event by id:", error);
            throw error;
        }
    },

    // ─── Get Sessions ────────────────────────────────────────
    getSessions: async () => {
        try {
            const response = await httpService.get(`${TUTORIAL_API_URL}/sessions/`);
            return response.data.results || response.data;
        } catch (error) {
            console.error("Error fetching tutorial sessions:", error);
            return [];
        }
    },

    // ─── Get Sessions by Event ───────────────────────────────
    getSessionsByEvent: async (eventId: number | string) => {
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

    // ─── Get All Tutorial Products ───────────────────────────
    getAllTutorialProducts: async () => {
        try {
            if (!TUTORIAL_API_URL) {
                throw new Error('Tutorial API URL not configured');
            }
            const response = await httpService.get(`${TUTORIAL_API_URL}/products/all/`);
            return response.data;
        } catch (error) {
            console.error('Error fetching all tutorial products:', error);
            return [];
        }
    },

    // ─── Get Tutorial Products ───────────────────────────────
    getTutorialProducts: async (examSessionId: number | string, subjectCode: string) => {
        try {
            if (!examSessionId || !subjectCode) {
                throw new Error('exam_session and subject_code parameters are required');
            }

            const response = await httpService.get(`${TUTORIAL_API_URL}/products/`, {
                params: { exam_session: examSessionId, subject_code: subjectCode },
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching tutorial products:', error);
            throw error;
        }
    },

    // ─── Get Tutorial Variations ─────────────────────────────
    getTutorialVariations: async (productId: number | string, subjectCode: string) => {
        try {
            const response = await httpService.get(
                `${TUTORIAL_API_URL}/products/${productId}/variations/`,
                { params: { subject_code: subjectCode } }
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching tutorial variations:', error);
            throw error;
        }
    },

    // ─── Get Comprehensive Tutorial Data ─────────────────────
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
