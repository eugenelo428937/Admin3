import httpService from "./httpService";
import config from "../config";

const API_URL = `${config.catalogUrl}/product-variations`;

const productVariationService = {
    getAll: async () => {
        try {
            const response = await httpService.get(`${API_URL}/`);
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data :
                response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching product variations:", error);
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

export default productVariationService;
