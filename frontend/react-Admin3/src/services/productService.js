// src/services/productService.js
import config from "../config";
import httpService from "./httpService";
const API_URL = config.productUrl;

const productService = {
    getAll: async () => {
        try {
            const response = await httpService.get(`${API_URL}/`);
            // Ensure we're returning an array
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data : response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching products:", error);
            return []; // Return empty array on error
        }
    },

    getById: async (id) => {
        const response = await httpService.get(`${API_URL}/${id}/`);
        return response.data;
    },

    create: async (product) => {
        const response = await httpService.post(`${API_URL}/`, product);
        return response.data;
    },

    update: async (id, product) => {
        const response = await httpService.put(`${API_URL}/${id}/`, product);
        return response.data;
    },

    delete: async (id) => {
        await httpService.delete(`${API_URL}${id}/`);
    },

    // Bulk import function for products
    bulkImport: async (products) => {
        const response = await httpService.post(`${API_URL}bulk-import/`, { products });
        return response.data;
    },

    getAvailableProducts: async () => {
        const response = await httpService.get(
				`${API_URL}/current/get-available-products`
			);
			return response.data;
    }
};

export default productService;
