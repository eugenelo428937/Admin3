import httpService from "./httpService";
import config from "../config";
import { parsePaginatedResponse } from "./paginationHelper";

const API_URL = `${config.apiBaseUrl}/api/store/products`;
const ADMIN_API_URL = `${config.apiBaseUrl}/api/store/admin-products`;

const storeProductService = {
    list: async (params = {}) => {
        const response = await httpService.get(`${API_URL}/`, { params });
        return parsePaginatedResponse(response.data);
    },

    adminList: async (params = {}) => {
        const response = await httpService.get(`${ADMIN_API_URL}/`, { params });
        return parsePaginatedResponse(response.data);
    },

    getByCatalogProduct: async (catalogProductId) => {
        try {
            const response = await httpService.get(`${ADMIN_API_URL}/`, {
                params: { catalog_product_id: catalogProductId },
            });
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data :
                response.data.results || [];
        } catch (error) {
            console.error("Error fetching store products by catalog product:", error);
            return [];
        }
    },

    getAll: async () => {
        try {
            const response = await httpService.get(`${API_URL}/`);
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data :
                response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching store products:", error);
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
        await httpService.delete(`${ADMIN_API_URL}/${id}/`);
    },
};

export default storeProductService;
