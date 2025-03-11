// src/services/productService.js
import httpServiceProvider from "./httpService";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8888/products";

const productService = {
    getAll: async () => {
        try {
            const response = await httpServiceProvider.get(`${API_URL}/`);
            // Ensure we're returning an array
            if (!response.data) return [];
            return Array.isArray(response.data) ? response.data : response.data.results || Object.values(response.data) || [];
        } catch (error) {
            console.error("Error fetching products:", error);
            return []; // Return empty array on error
        }
    },

    getById: async (id) => {
        const response = await httpServiceProvider.get(`${API_URL}/${id}/`);
        return response.data;
    },

    create: async (product) => {
        const response = await httpServiceProvider.post(`${API_URL}/`, product);
        return response.data;
    },

    update: async (id, product) => {
        const response = await httpServiceProvider.put(`${API_URL}/${id}/`, product);
        return response.data;
    },

    delete: async (id) => {
        await httpServiceProvider.delete(`${API_URL}/${id}/`);
    },

    // Bulk import function for products
    bulkImport: async (products) => {
        const response = await httpServiceProvider.post(`${API_URL}/bulk-import/`, { products });
        return response.data;
    },
};

export default productService;
