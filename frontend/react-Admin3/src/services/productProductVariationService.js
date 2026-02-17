import httpService from "./httpService";
import config from "../config";

const API_URL = `${config.catalogUrl}/product-product-variations`;

const productProductVariationService = {
    getAll: async () => {
        try {
            const response = await httpService.get(`${API_URL}/`);
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data :
                response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching product-product variations:", error);
            return [];
        }
    },

    getByProduct: async (productId) => {
        const response = await httpService.get(`${API_URL}/`, {
            params: { product: productId }
        });
        if (!response.data) return [];
        return Array.isArray(response.data) ? response.data :
            response.data.results || [];
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

export default productProductVariationService;
