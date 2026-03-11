import httpService from "./httpService.js";
import config from "../config.js";
import { parsePaginatedResponse } from "./paginationHelper.js";

const API_URL = `${config.userUrl}/staff`;

const staffService = {
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
            console.error("Error fetching staff:", error);
            return [];
        }
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
};

export default staffService;
