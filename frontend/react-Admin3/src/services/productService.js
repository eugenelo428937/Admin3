// src/services/productService.js
import config from "../config";
import httpService from "./httpService";
const API_URL = config.productUrl;
const MARKING_API_URL = config.markingUrl;

// Fetch all product categories for navbar dropdown
const getAllProductCategories = async () => {
    const response = await httpService.get(`/api/product-categories/all/`);
    return response.data.results || response.data;
};

// Fetch product group filters from backend
const getProductGroupFilters = async () => {
    const response = await httpService.get(`/api/product-group-filters/`);
    return response.data.results || response.data;
};

const productService = {
	getAll: async () => {
		try {
			const response = await httpService.get(`${API_URL}/`);
			// Ensure we're returning an array
			if (!response.data) return [];
			return Array.isArray(response.data)
				? response.data
				: response.data.results || Object.values(response.data) || [];
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
		const response = await httpService.post(`${API_URL}/bulk-import/`, {
			products,
		});
		return response.data;
	},

	getAvailableProducts: async (params = new URLSearchParams()) => {
		const response = await httpService.get(
			`${API_URL}/current/list/?${params.toString()}`
		);
		return response.data;
	},

	getMarkingDeadlines: async (esspId) => {
		const response = await httpService.get(
			`${MARKING_API_URL}/papers/deadlines/?essp_id=${esspId}`
		);		
		return response.data;
	},

	// Add a new function for bulk deadlines
	getBulkMarkingDeadlines: async (esspIds) => {
		const response = await httpService.post(
			`${MARKING_API_URL}/papers/bulk-deadlines/`,
			{ essp_ids: esspIds }
		);
		return response.data;
	},

	getSubjects: async () => {
		const response = await httpService.get(`${API_URL}/api/subjects/`);
		return response.data.results;
	},

	getProductTypes: async () => {
		const response = await httpService.get(`/api/product-types/`);
		return response.data.results || response.data;
	},

	getProductSubtypes: async (typeId) => {
		const response = await httpService.get(`/api/product-types/${typeId}/subtypes/`);
		return response.data.results || response.data;
	},

	/**
	 * Get products filtered by category
	 * @param {string|number} categoryId - The category id to filter by
	 * @param {object} otherParams - Optional additional query params
	 */
	getByCategory: async (categoryId, otherParams = {}) => {
		const params = new URLSearchParams({ ...otherParams, category: categoryId });
		const response = await httpService.get(
			`${API_URL}/current/list/?${params.toString()}`
		);
		return response.data;
	},

	getAllProductCategories,
	getProductGroupFilters,
};

export default productService;
