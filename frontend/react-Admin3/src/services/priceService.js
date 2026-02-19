import httpService from "./httpService";
import config from "../config";
import { parsePaginatedResponse } from "./paginationHelper";

const API_URL = `${config.apiBaseUrl}/api/store/prices`;

const priceService = {
    list: async (params = {}) => {
        const response = await httpService.get(`${API_URL}/`, { params });
        return parsePaginatedResponse(response.data);
    },

    getAll: async () => {
        try {
            const response = await httpService.get(`${API_URL}/`);
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data :
                response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching prices:", error);
            return [];
        }
    },

    getById: async (id) => {
        const response = await httpService.get(`${API_URL}/${id}/`);
        return response.data;
    },

    getByProductId: async (productId) => {
        try {
            const response = await httpService.get(
                `${config.apiBaseUrl}/api/store/products/${productId}/prices/`
            );
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data :
                response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching prices for product:", error);
            return [];
        }
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
};

export default priceService;
