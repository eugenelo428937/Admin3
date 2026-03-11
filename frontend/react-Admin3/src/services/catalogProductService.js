import httpService from "./httpService.js";
import config from "../config.js";
import { parsePaginatedResponse } from "./paginationHelper.js";

// Catalog product CRUD — uses /api/catalog/products/ (the consolidated catalog API)
const API_URL = `${config.catalogUrl}/products`;

const catalogProductService = {
    getAll: async () => {
        try {
            const response = await httpService.get(`${API_URL}/`);
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data :
                response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching catalog products:", error);
            return [];
        }
    },

    list: async (params = {}) => {
        const response = await httpService.get(`${API_URL}/`, { params });
        return parsePaginatedResponse(response.data);
    },

    getById: async (id) => {
        const response = await httpService.get(`${API_URL}/${id}/`);
        return response.data;
    },

    create: async (data) => {
        const response = await httpService.post(`${API_URL}/`, data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await httpService.put(`${API_URL}/${id}/`, data);
        return response.data;
    },

    delete: async (id) => {
        await httpService.delete(`${API_URL}/${id}/`);
    },

    bulkImport: async (products) => {
        const response = await httpService.post(`${API_URL}/bulk-import/`, { products });
        return response.data;
    },
};

export default catalogProductService;
