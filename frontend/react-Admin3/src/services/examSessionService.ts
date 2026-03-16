import httpService from "./httpService";
import config from "../config";
import { parsePaginatedResponse } from "./paginationHelper";
import type { ExamSession, ExamSessionInput } from "../types/examSession";

// Use catalog API endpoint (legacy /api/exam-sessions/ was removed during catalog consolidation)
const API_URL = `${(config as any).catalogUrl}/exam-sessions`;

const examSessionService = {
    // ─── Get All (with built-in error handling) ──────────────
    getAll: async (): Promise<ExamSession[]> => {
        try {
            const response = await httpService.get(`${API_URL}/`);
            if (!response.data) return [];
            return Array.isArray(response.data)
                ? response.data
                : response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching Exam Sessions:", error);
            return [];
        }
    },

    // ─── List (paginated) ────────────────────────────────────
    list: async (params: Record<string, any> = {}) => {
        const response = await httpService.get(`${API_URL}/`, { params });
        return parsePaginatedResponse(response.data);
    },

    // ─── Get by ID ───────────────────────────────────────────
    getById: async (id: number | string): Promise<ExamSession> => {
        const response = await httpService.get(`${API_URL}/${id}/`);
        return response.data;
    },

    // ─── Create ──────────────────────────────────────────────
    create: async (data: ExamSessionInput): Promise<ExamSession> => {
        const response = await httpService.post(`${API_URL}/`, data);
        return response.data;
    },

    // ─── Update ──────────────────────────────────────────────
    update: async (id: number | string, data: Partial<ExamSession>): Promise<ExamSession> => {
        const response = await httpService.put(`${API_URL}/${id}/`, data);
        return response.data;
    },

    // ─── Delete ──────────────────────────────────────────────
    delete: async (id: number | string): Promise<void> => {
        await httpService.delete(`${API_URL}/${id}/`);
    },
};

export default examSessionService;
