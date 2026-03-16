import httpService from "./httpService";
import config from "../config";

const CATALOG_URL = `${(config as any).catalogUrl}`;

const sessionSetupService = {
    // ─── Get Previous Session ────────────────────────────────
    getPreviousSession: async (currentSessionId: number) => {
        const response = await httpService.get(`${CATALOG_URL}/exam-sessions/`, {
            params: { ordering: '-id', page_size: 2 },
        });
        const results = response.data.results || response.data;
        const previous = results.find((s: any) => s.id !== currentSessionId);
        return previous || null;
    },

    // ─── Get Session Subjects ────────────────────────────────
    getSessionSubjects: async (sessionId: number) => {
        const response = await httpService.get(
            `${CATALOG_URL}/exam-session-subjects/`,
            { params: { exam_session: sessionId } }
        );
        return response.data.results || response.data;
    },

    // ─── Copy Products from Previous Session ─────────────────
    copyProducts: async (newSessionId: number, previousSessionId: number) => {
        const response = await httpService.post(
            `${CATALOG_URL}/session-setup/copy-products/`,
            {
                new_exam_session_id: newSessionId,
                previous_exam_session_id: previousSessionId,
            }
        );
        return response.data;
    },

    // ─── Get Session Data Counts ─────────────────────────────
    getSessionDataCounts: async (sessionId: number) => {
        const response = await httpService.get(
            `${CATALOG_URL}/session-setup/session-data-counts/${sessionId}/`
        );
        return response.data;
    },

    // ─── Deactivate Session Data ─────────────────────────────
    deactivateSessionData: async (sessionId: number) => {
        const response = await httpService.post(
            `${CATALOG_URL}/session-setup/deactivate-session-data/`,
            { exam_session_id: sessionId }
        );
        return response.data;
    },
};

export default sessionSetupService;
