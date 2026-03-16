import config from "../config";
import httpService from "./httpService";
import { parsePaginatedResponse } from "./paginationHelper";
import type { Subject, SubjectInput, BulkImportResponse } from "../types/subject";

// Use catalog API endpoint (legacy /api/subjects/ was removed during catalog consolidation)
const API_URL = `${(config as any).catalogUrl}/admin-subjects`;

const subjectService = {
    // ─── Get All (with built-in error handling) ──────────────
    getAll: async (): Promise<Subject[]> => {
        try {
            const response = await httpService.get(`${API_URL}/`);
            if (!response.data) return [];
            return Array.isArray(response.data)
                ? response.data
                : response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching subjects:", error);
            return [];
        }
    },

    // ─── List (paginated) ────────────────────────────────────
    list: async (params: Record<string, any> = {}) => {
        const response = await httpService.get(`${API_URL}/`, { params });
        return parsePaginatedResponse(response.data);
    },

    // ─── Get Subjects (results array only) ───────────────────
    getSubjects: async (): Promise<Subject[]> => {
        const response = await httpService.get(`${API_URL}/`);
        return response.data.results;
    },

    // ─── Get by ID ───────────────────────────────────────────
    getById: async (id: number | string): Promise<Subject> => {
        const response = await httpService.get(`${API_URL}/${id}/`);
        return response.data;
    },

    // ─── Create ──────────────────────────────────────────────
    create: async (data: SubjectInput): Promise<Subject> => {
        const response = await httpService.post(`${API_URL}/`, data);
        return response.data;
    },

    // ─── Update ──────────────────────────────────────────────
    update: async (id: number | string, data: Partial<Subject>): Promise<Subject> => {
        const response = await httpService.put(`${API_URL}/${id}/`, data);
        return response.data;
    },

    // ─── Delete ──────────────────────────────────────────────
    delete: async (id: number | string): Promise<void> => {
        await httpService.delete(`${API_URL}/${id}/`);
    },

    // ─── Bulk Import ─────────────────────────────────────────
    bulkImport: async (subjects: SubjectInput[]): Promise<BulkImportResponse> => {
        const response = await httpService.post(`${API_URL}/bulk-import/`, { subjects });
        return response.data;
    },
};

export default subjectService;
