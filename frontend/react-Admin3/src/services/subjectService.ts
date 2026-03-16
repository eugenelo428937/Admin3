import config from "../config";
import httpService from "./httpService";
import { createCrudService } from "./createCrudService";
import type { Subject, SubjectInput, BulkImportResponse } from "../types/subject";

// Use catalog API endpoint (legacy /api/subjects/ was removed during catalog consolidation)
const API_URL = `${(config as any).catalogUrl}/admin-subjects`;

const subjectService = {
    ...createCrudService<Subject>({
        apiUrl: API_URL,
        resourceName: "subjects",
    }),

    // ─── Get Subjects (results array only) ───────────────────
    getSubjects: async (): Promise<Subject[]> => {
        const response = await httpService.get(`${API_URL}/`);
        return response.data.results;
    },

    // ─── Bulk Import ─────────────────────────────────────────
    bulkImport: async (subjects: SubjectInput[]): Promise<BulkImportResponse> => {
        const response = await httpService.post(`${API_URL}/bulk-import/`, { subjects });
        return response.data;
    },
};

export default subjectService;
