import httpService from "./httpService";
import { parsePaginatedResponse } from "./paginationHelper";

// ─── Types ───────────────────────────────────────────────────────────

export interface CrudServiceOptions {
    /** Full API URL (e.g. `${config.catalogUrl}/products`) */
    apiUrl: string;
    /** Human-readable name for error logging */
    resourceName: string;
}

export interface AdminCrudServiceOptions extends CrudServiceOptions {
    /** Admin API URL for privileged operations (e.g. `/api/store/admin-products`) */
    adminApiUrl: string;
}

export interface CrudService<T> {
    list: (params?: Record<string, any>) => Promise<{ results: T[]; count: number }>;
    getAll: () => Promise<T[]>;
    getById: (id: number | string) => Promise<T>;
    create: (data: Partial<T>) => Promise<T>;
    update: (id: number | string, data: Partial<T>) => Promise<T>;
    delete: (id: number | string) => Promise<void>;
}

export interface AdminCrudService<T> extends CrudService<T> {
    adminList: (params?: Record<string, any>) => Promise<{ results: T[]; count: number }>;
}

// ─── Factory: Standard CRUD ──────────────────────────────────────────

/**
 * Creates a typed CRUD service object for a given API endpoint.
 * Replicates the exact pattern from staffService/examSessionService.
 */
export function createCrudService<T = any>(options: CrudServiceOptions): CrudService<T> {
    const { apiUrl, resourceName } = options;

    return {
        list: async (params: Record<string, any> = {}) => {
            const response = await httpService.get(`${apiUrl}/`, { params });
            return parsePaginatedResponse<T>(response.data);
        },

        getAll: async (): Promise<T[]> => {
            try {
                const response = await httpService.get(`${apiUrl}/`);
                if (!response.data) return [];
                return Array.isArray(response.data)
                    ? response.data
                    : response.data.results || Object.values(response.data) || [];
            } catch (error) {
                console.error(`Error fetching ${resourceName}:`, error);
                return [];
            }
        },

        getById: async (id: number | string): Promise<T> => {
            const response = await httpService.get(`${apiUrl}/${id}/`);
            return response.data;
        },

        create: async (data: Partial<T>): Promise<T> => {
            const response = await httpService.post(`${apiUrl}/`, data);
            return response.data;
        },

        update: async (id: number | string, data: Partial<T>): Promise<T> => {
            const response = await httpService.put(`${apiUrl}/${id}/`, data);
            return response.data;
        },

        delete: async (id: number | string): Promise<void> => {
            await httpService.delete(`${apiUrl}/${id}/`);
        },
    };
}

// ─── Factory: Admin CRUD (with admin endpoint) ──────────────────────

/**
 * Creates a CRUD service with an additional admin endpoint.
 * Used by store services that have both public and admin URLs.
 * Admin URL is used for adminList and delete operations.
 */
export function createAdminCrudService<T = any>(
    options: AdminCrudServiceOptions
): AdminCrudService<T> {
    const { adminApiUrl } = options;
    const base = createCrudService<T>(options);

    return {
        ...base,

        adminList: async (params: Record<string, any> = {}) => {
            const response = await httpService.get(`${adminApiUrl}/`, { params });
            return parsePaginatedResponse<T>(response.data);
        },

        // Admin delete uses the admin endpoint
        delete: async (id: number | string): Promise<void> => {
            await httpService.delete(`${adminApiUrl}/${id}/`);
        },
    };
}
