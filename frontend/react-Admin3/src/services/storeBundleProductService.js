import httpService from "./httpService";
import config from "../config";

const API_URL = `${config.apiBaseUrl}/api/store/bundle-products`;

const storeBundleProductService = {
    getAll: async () => {
        try {
            const response = await httpService.get(`${API_URL}/`);
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data :
                response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching store bundle products:", error);
            return [];
        }
    },

    getByBundleId: async (bundleId) => {
        try {
            const response = await httpService.get(
                `${config.apiBaseUrl}/api/store/bundles/${bundleId}/products/`
            );
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data :
                response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching bundle products for bundle:", error);
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

export default storeBundleProductService;
